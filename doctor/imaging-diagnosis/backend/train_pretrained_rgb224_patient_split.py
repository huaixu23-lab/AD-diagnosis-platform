r"""
Train pretrained ResNet50 / EfficientNet-B0 for Alzheimer MRI 4-class classification.

Data layout:
  DATA_DIR/
    MildDemented/*.jpg|png|jpeg
    ModerateDemented/*.jpg|png|jpeg
    NonDemented/*.jpg|png|jpeg
    VeryMildDemented/*.jpg|png|jpeg

Example:
  python train_pretrained_rgb224.py ^
    --data_dir "D:\AD_MRI_ResNet50\raw_data" ^
    --out_dir "D:\AD_MRI_ResNet50\results\efficientnet_b0_rgb224" ^
    --model efficientnet_b0 ^
    --epochs 20 ^
    --batch_size 16 ^
    --weight_mode mild ^
    --weight_cap 5.0
"""

import argparse
import json
import random
import re
from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
from torchvision import models, transforms

from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, classification_report, confusion_matrix


IMG_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}


def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    # benchmark=True can speed up fixed-size CUDA training; harmless on CPU.
    torch.backends.cudnn.benchmark = True



def get_patient_id(path: Path, class_name: str) -> str:
    """
    Treat numeric filenames with optional parenthesized suffix as the same patient/slice group.

    Examples:
      27.jpg, 27 (1).jpg, 27 (2).jpg -> class_name::numeric::27

    Non-numeric filenames are treated as one image per patient.
    The class name is included to avoid accidental cross-class grouping.
    """
    stem = path.stem.strip()
    m = re.fullmatch(r"(\d+)(?:\s*\(\d+\))?", stem)
    if m:
        return f"{class_name}::numeric::{int(m.group(1))}"
    return f"{class_name}::single::{path.name}"


def scan_image_folder(data_dir: str):
    root = Path(data_dir)
    if not root.exists():
        raise FileNotFoundError(f"data_dir not found: {data_dir}")

    class_names = sorted([p.name for p in root.iterdir() if p.is_dir()])
    if len(class_names) < 2:
        raise ValueError("data_dir should contain one subfolder per class.")

    class_to_idx = {name: i for i, name in enumerate(class_names)}

    rows = []
    for cname in class_names:
        for p in sorted((root / cname).rglob("*")):
            if p.suffix.lower() in IMG_EXTS:
                rows.append({
                    "path": str(p),
                    "label": class_to_idx[cname],
                    "class_name": cname,
                    "filename": p.name,
                    "patient_id": get_patient_id(p, cname),
                })

    df = pd.DataFrame(rows)
    if df.empty:
        raise ValueError("No images found. Check file extensions and folder layout.")

    return df, class_names, class_to_idx


def split_df_image_level(df: pd.DataFrame, seed: int, val_ratio: float = 0.10, test_ratio: float = 0.10):
    """Image-level stratified random split."""
    train_ratio = 1.0 - val_ratio - test_ratio
    if train_ratio <= 0:
        raise ValueError("val_ratio + test_ratio must be < 1.")

    train_val, test = train_test_split(
        df,
        test_size=test_ratio,
        random_state=seed,
        stratify=df["label"],
    )
    val_fraction = val_ratio / (train_ratio + val_ratio)
    train, val = train_test_split(
        train_val,
        test_size=val_fraction,
        random_state=seed,
        stratify=train_val["label"],
    )
    return train.reset_index(drop=True), val.reset_index(drop=True), test.reset_index(drop=True)


def split_df_patient_level(df: pd.DataFrame, seed: int, val_ratio: float = 0.10, test_ratio: float = 0.10):
    """
    Patient/group-level split.
    Same patient_id will appear in exactly one of train/val/test.
    """
    train_ratio = 1.0 - val_ratio - test_ratio
    if train_ratio <= 0:
        raise ValueError("val_ratio + test_ratio must be < 1.")

    label_nunique = df.groupby("patient_id")["label"].nunique()
    mixed = label_nunique[label_nunique > 1]
    if len(mixed) > 0:
        raise ValueError(f"Found patient groups with mixed labels: {mixed.index.tolist()[:10]}")

    group_df = (
        df.groupby("patient_id")
        .agg(label=("label", "first"), class_name=("class_name", "first"), n_images=("path", "count"))
        .reset_index()
    )

    # Prefer sklearn stratified group-level split. If a class has too few groups,
    # fall back to a per-class group shuffle that still prevents patient leakage.
    try:
        train_val_groups, test_groups = train_test_split(
            group_df,
            test_size=test_ratio,
            random_state=seed,
            stratify=group_df["label"],
        )
        val_fraction = val_ratio / (train_ratio + val_ratio)
        train_groups, val_groups = train_test_split(
            train_val_groups,
            test_size=val_fraction,
            random_state=seed,
            stratify=train_val_groups["label"],
        )
    except ValueError as e:
        print(f"[Warning] Stratified group split failed: {e}")
        print("[Warning] Falling back to per-class shuffled patient-group split.")
        rng = np.random.default_rng(seed)
        train_ids, val_ids, test_ids = [], [], []

        for _, sub in group_df.groupby("label"):
            ids = sub["patient_id"].to_numpy()
            rng.shuffle(ids)
            n = len(ids)

            if n >= 10:
                n_test = max(1, int(round(n * test_ratio)))
                n_val = max(1, int(round(n * val_ratio)))
            elif n >= 3:
                n_test = 1
                n_val = 1
            else:
                n_test = 0
                n_val = 0

            n_train = max(0, n - n_val - n_test)
            train_ids.extend(ids[:n_train].tolist())
            val_ids.extend(ids[n_train:n_train + n_val].tolist())
            test_ids.extend(ids[n_train + n_val:].tolist())

        train_groups = group_df[group_df["patient_id"].isin(train_ids)]
        val_groups = group_df[group_df["patient_id"].isin(val_ids)]
        test_groups = group_df[group_df["patient_id"].isin(test_ids)]

    train_ids = set(train_groups["patient_id"])
    val_ids = set(val_groups["patient_id"])
    test_ids = set(test_groups["patient_id"])

    overlaps = {
        "train_val": train_ids & val_ids,
        "train_test": train_ids & test_ids,
        "val_test": val_ids & test_ids,
    }
    leaking = {name: sorted(ids)[:10] for name, ids in overlaps.items() if ids}
    if leaking:
        raise RuntimeError(f"Patient leakage found across splits: {leaking}")

    train = df[df["patient_id"].isin(train_ids)].copy()
    val = df[df["patient_id"].isin(val_ids)].copy()
    test = df[df["patient_id"].isin(test_ids)].copy()
    return train.reset_index(drop=True), val.reset_index(drop=True), test.reset_index(drop=True)


def save_split_manifest(out_dir: Path, train_df: pd.DataFrame, val_df: pd.DataFrame, test_df: pd.DataFrame):
    rows = []
    for split_name, split_df in [("train", train_df), ("val", val_df), ("test", test_df)]:
        tmp = split_df.copy()
        tmp.insert(0, "split", split_name)
        rows.append(tmp)
    manifest = pd.concat(rows, ignore_index=True)
    manifest.to_csv(out_dir / "split_manifest.csv", index=False, encoding="utf-8-sig")


def split_summary(train_df: pd.DataFrame, val_df: pd.DataFrame, test_df: pd.DataFrame, class_names):
    summary = {}
    for split_name, split_df in [("train", train_df), ("val", val_df), ("test", test_df)]:
        img_counts = split_df["class_name"].value_counts().reindex(class_names, fill_value=0)
        group_counts = (
            split_df.drop_duplicates("patient_id")["class_name"]
            .value_counts()
            .reindex(class_names, fill_value=0)
        )
        summary[split_name] = {
            "n_images": int(len(split_df)),
            "n_patient_groups": int(split_df["patient_id"].nunique()),
            "image_counts_by_class": {k: int(v) for k, v in img_counts.items()},
            "patient_group_counts_by_class": {k: int(v) for k, v in group_counts.items()},
        }
    return summary


class MRIImageDataset(Dataset):
    def __init__(self, df: pd.DataFrame, transform=None):
        self.df = df.reset_index(drop=True)
        self.transform = transform

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx: int):
        row = self.df.iloc[idx]
        # Important: pretrained ImageNet models expect 3-channel RGB input.
        image = Image.open(row["path"]).convert("RGB")
        if self.transform is not None:
            image = self.transform(image)
        label = torch.tensor(int(row["label"]), dtype=torch.long)
        return image, label


def build_transforms(img_size: int = 224):
    # For pretrained ImageNet models, use ImageNet normalization.
    train_tf = transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.RandomHorizontalFlip(p=0.2),
        transforms.RandomRotation(degrees=10),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ])

    eval_tf = transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ])

    return train_tf, eval_tf


def compute_class_weights(
    train_df: pd.DataFrame,
    n_classes: int,
    device: torch.device,
    weight_mode: str = "mild",
    weight_cap: float = 5.0,
):
    counts = (
        train_df["label"]
        .value_counts()
        .sort_index()
        .reindex(range(n_classes), fill_value=0)
        .values
    )

    raw_weights = counts.sum() / (n_classes * np.maximum(counts, 1))

    if weight_mode == "none":
        weights = None
    elif weight_mode == "balanced":
        weights = raw_weights
    elif weight_mode == "mild":
        # sqrt weakens extreme imbalance, then clipping prevents minority class over-amplification.
        weights = np.sqrt(raw_weights)
        weights = np.clip(weights, 0.6, weight_cap)
    else:
        raise ValueError(f"Unknown weight_mode: {weight_mode}")

    if weights is None:
        return None, counts, raw_weights

    return torch.tensor(weights, dtype=torch.float32, device=device), counts, raw_weights


def make_weighted_sampler(train_df: pd.DataFrame, n_classes: int, weight_cap: float = 5.0):
    counts = (
        train_df["label"]
        .value_counts()
        .sort_index()
        .reindex(range(n_classes), fill_value=0)
        .values
    )
    raw_weights = counts.sum() / (n_classes * np.maximum(counts, 1))
    mild_weights = np.sqrt(raw_weights)
    mild_weights = np.clip(mild_weights, 0.6, weight_cap)
    sample_weights = train_df["label"].map(lambda y: mild_weights[int(y)]).values
    return WeightedRandomSampler(
        weights=torch.DoubleTensor(sample_weights),
        num_samples=len(sample_weights),
        replacement=True,
    )


def build_model(model_name: str, n_classes: int, pretrained: bool = True, freeze_backbone: bool = False):
    model_name = model_name.lower()

    if model_name == "resnet50":
        weights = None
        if pretrained:
            try:
                weights = models.ResNet50_Weights.IMAGENET1K_V2
            except AttributeError:
                weights = "IMAGENET1K_V2"

        try:
            model = models.resnet50(weights=weights)
        except Exception as e:
            print(f"[Warning] Failed to load pretrained ResNet50 weights: {e}")
            print("[Warning] Continue with random initialized ResNet50.")
            model = models.resnet50(weights=None)

        in_features = model.fc.in_features
        model.fc = nn.Linear(in_features, n_classes)

        if freeze_backbone:
            for name, param in model.named_parameters():
                param.requires_grad = name.startswith("fc.")

    elif model_name == "efficientnet_b0":
        weights = None
        if pretrained:
            try:
                weights = models.EfficientNet_B0_Weights.IMAGENET1K_V1
            except AttributeError:
                weights = "IMAGENET1K_V1"

        try:
            model = models.efficientnet_b0(weights=weights)
        except Exception as e:
            print(f"[Warning] Failed to load pretrained EfficientNet-B0 weights: {e}")
            print("[Warning] Continue with random initialized EfficientNet-B0.")
            model = models.efficientnet_b0(weights=None)

        in_features = model.classifier[-1].in_features
        model.classifier[-1] = nn.Linear(in_features, n_classes)

        if freeze_backbone:
            for name, param in model.named_parameters():
                param.requires_grad = name.startswith("classifier.")

    else:
        raise ValueError("model must be one of: resnet50, efficientnet_b0")

    return model


def make_loader(df, transform, batch_size, shuffle=False, sampler=None, num_workers=0):
    ds = MRIImageDataset(df, transform=transform)
    return DataLoader(
        ds,
        batch_size=batch_size,
        shuffle=shuffle if sampler is None else False,
        sampler=sampler,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available(),
    )


def train_one_epoch(model, loader, criterion, optimizer, device):
    model.train()
    total_loss = 0.0

    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)

        optimizer.zero_grad(set_to_none=True)
        logits = model(images)
        loss = criterion(logits, labels)
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * labels.size(0)

    return total_loss / len(loader.dataset)


@torch.no_grad()
def evaluate(model, loader, criterion, device):
    model.eval()
    total_loss = 0.0
    all_true, all_pred = [], []

    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)
        logits = model(images)
        loss = criterion(logits, labels)

        preds = torch.argmax(logits, dim=1)
        total_loss += loss.item() * labels.size(0)
        all_true.extend(labels.cpu().numpy().tolist())
        all_pred.extend(preds.cpu().numpy().tolist())

    acc = accuracy_score(all_true, all_pred)
    macro_f1 = f1_score(all_true, all_pred, average="macro", zero_division=0)

    return total_loss / len(loader.dataset), acc, macro_f1, np.array(all_true), np.array(all_pred)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", required=True, help="Folder containing 4 class subfolders.")
    parser.add_argument("--out_dir", default="results/pretrained_rgb224")
    parser.add_argument("--model", default="efficientnet_b0", choices=["resnet50", "efficientnet_b0"])
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch_size", type=int, default=16)
    parser.add_argument("--img_size", type=int, default=224)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--weight_decay", type=float, default=1e-4)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--num_workers", type=int, default=0)

    parser.add_argument("--split_mode", default="patient", choices=["patient", "image"],
                        help="patient keeps same numeric filename group in the same split; image treats every image independently.")
    parser.add_argument("--val_ratio", type=float, default=0.10)
    parser.add_argument("--test_ratio", type=float, default=0.10)

    parser.add_argument("--no_pretrained", action="store_true", help="Do not use ImageNet pretrained weights.")
    parser.add_argument("--freeze_backbone", action="store_true", help="Train classifier head only.")
    parser.add_argument("--weight_mode", default="mild", choices=["none", "mild", "balanced"])
    parser.add_argument("--weight_cap", type=float, default=5.0)
    parser.add_argument("--use_sampler", action="store_true", help="Use mild WeightedRandomSampler and no loss weights.")

    args = parser.parse_args()

    set_seed(args.seed)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    print(f"Model: {args.model}")
    print(f"Pretrained: {not args.no_pretrained}")
    print(f"Input: RGB, {args.img_size}x{args.img_size}")
    print(f"Split mode: {args.split_mode}")

    df, class_names, class_to_idx = scan_image_folder(args.data_dir)
    if args.split_mode == "patient":
        train_df, val_df, test_df = split_df_patient_level(
            df, args.seed, val_ratio=args.val_ratio, test_ratio=args.test_ratio
        )
    else:
        train_df, val_df, test_df = split_df_image_level(
            df, args.seed, val_ratio=args.val_ratio, test_ratio=args.test_ratio
        )

    save_split_manifest(out_dir, train_df, val_df, test_df)
    split_info = split_summary(train_df, val_df, test_df, class_names)
    with open(out_dir / "split_summary.json", "w", encoding="utf-8") as f:
        json.dump(split_info, f, ensure_ascii=False, indent=2)


    print("class_to_idx:", class_to_idx)
    print("Total images:", len(df))
    print("Total patient groups:", df["patient_id"].nunique())
    print("Train patient groups:", train_df["patient_id"].nunique())
    print("Val patient groups:", val_df["patient_id"].nunique())
    print("Test patient groups:", test_df["patient_id"].nunique())
    if args.split_mode == "patient":
        print("Patient leakage check: passed; each patient_id appears in only one split.")
    else:
        print("Patient leakage check: not applicable in image split mode.")
    print("Train class counts:")
    print(train_df["class_name"].value_counts().reindex(class_names, fill_value=0))
    print("Val class counts:")
    print(val_df["class_name"].value_counts().reindex(class_names, fill_value=0))
    print("Test class counts:")
    print(test_df["class_name"].value_counts().reindex(class_names, fill_value=0))

    train_tf, eval_tf = build_transforms(args.img_size)
    n_classes = len(class_names)

    loss_weights, train_counts, raw_weights = compute_class_weights(
        train_df=train_df,
        n_classes=n_classes,
        device=device,
        weight_mode=args.weight_mode,
        weight_cap=args.weight_cap,
    )

    if args.use_sampler:
        sampler = make_weighted_sampler(train_df, n_classes, weight_cap=args.weight_cap)
        criterion = nn.CrossEntropyLoss()
        print("Using WeightedRandomSampler; loss weights disabled.")
    else:
        sampler = None
        criterion = nn.CrossEntropyLoss(weight=loss_weights)

    print("raw class weights:", dict(zip(class_names, raw_weights)))
    if loss_weights is not None and not args.use_sampler:
        print("loss class weights:", dict(zip(class_names, loss_weights.detach().cpu().numpy())))

    train_loader = make_loader(
        train_df, train_tf, args.batch_size,
        shuffle=True, sampler=sampler, num_workers=args.num_workers
    )
    val_loader = make_loader(
        val_df, eval_tf, args.batch_size,
        shuffle=False, sampler=None, num_workers=args.num_workers
    )
    test_loader = make_loader(
        test_df, eval_tf, args.batch_size,
        shuffle=False, sampler=None, num_workers=args.num_workers
    )

    model = build_model(
        model_name=args.model,
        n_classes=n_classes,
        pretrained=not args.no_pretrained,
        freeze_backbone=args.freeze_backbone,
    ).to(device)

    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total_params = sum(p.numel() for p in model.parameters())
    print(f"Trainable params: {trainable_params:,} / Total params: {total_params:,}")

    optimizer = torch.optim.AdamW(
        [p for p in model.parameters() if p.requires_grad],
        lr=args.lr,
        weight_decay=args.weight_decay,
    )

    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer,
        T_max=max(args.epochs, 1),
    )

    best_val_f1 = -1.0
    best_path = out_dir / f"best_{args.model}_rgb{args.img_size}.pt"
    history = []

    for epoch in range(1, args.epochs + 1):
        train_loss = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc, val_f1, _, _ = evaluate(model, val_loader, criterion, device)
        scheduler.step()

        row = {
            "epoch": epoch,
            "train_loss": train_loss,
            "val_loss": val_loss,
            "val_acc": val_acc,
            "val_macro_f1": val_f1,
            "lr": optimizer.param_groups[0]["lr"],
        }
        history.append(row)

        print(
            f"Epoch {epoch:03d}/{args.epochs} | "
            f"train_loss={train_loss:.4f} | "
            f"val_loss={val_loss:.4f} | "
            f"val_acc={val_acc:.4f} | "
            f"val_macro_f1={val_f1:.4f}"
        )

        if val_f1 > best_val_f1:
            best_val_f1 = val_f1
            torch.save({
                "model_name": args.model,
                "model_state_dict": model.state_dict(),
                "class_names": class_names,
                "class_to_idx": class_to_idx,
                "img_size": args.img_size,
                "split_mode": args.split_mode,
                "args": vars(args),
            }, best_path)

    pd.DataFrame(history).to_csv(out_dir / "training_history.csv", index=False)
    with open(out_dir / "class_to_idx.json", "w", encoding="utf-8") as f:
        json.dump(class_to_idx, f, ensure_ascii=False, indent=2)
    with open(out_dir / "config.json", "w", encoding="utf-8") as f:
        json.dump(vars(args), f, ensure_ascii=False, indent=2)

    ckpt = torch.load(best_path, map_location=device)
    model.load_state_dict(ckpt["model_state_dict"])

    test_loss, test_acc, test_f1, y_true, y_pred = evaluate(model, test_loader, criterion, device)
    report = classification_report(
        y_true,
        y_pred,
        target_names=class_names,
        digits=4,
        zero_division=0,
    )
    cm = confusion_matrix(y_true, y_pred)

    print("\n===== TEST RESULT =====")
    print(f"best_val_macro_f1={best_val_f1:.4f}")
    print(f"test_loss={test_loss:.4f} | test_acc={test_acc:.4f} | test_macro_f1={test_f1:.4f}")
    print(report)
    print(cm)

    with open(out_dir / "test_classification_report.txt", "w", encoding="utf-8") as f:
        f.write(f"best_val_macro_f1={best_val_f1:.4f}\n")
        f.write(f"test_loss={test_loss:.4f}\n")
        f.write(f"test_acc={test_acc:.4f}\n")
        f.write(f"test_macro_f1={test_f1:.4f}\n\n")
        f.write(report)

    pd.DataFrame(cm, index=class_names, columns=class_names).to_csv(
        out_dir / "test_confusion_matrix.csv"
    )

    pred_df = test_df.copy()
    pred_df["true_label"] = y_true
    pred_df["pred_label"] = y_pred
    pred_df["true_class"] = [class_names[i] for i in y_true]
    pred_df["pred_class"] = [class_names[i] for i in y_pred]
    pred_df.to_csv(out_dir / "test_predictions.csv", index=False, encoding="utf-8-sig")


if __name__ == "__main__":
    main()
