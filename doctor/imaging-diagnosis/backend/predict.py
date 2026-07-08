r"""
predict.py

EfficientNet-B0 Alzheimer MRI four-class inference script.

Purpose:
  Load the trained EfficientNet-B0 checkpoint and predict one image or a folder of images.

Expected checkpoint:
  best_efficientnet_b0_rgb224_patient.pt

Example:
  python predict.py ^
    --checkpoint "D:\AD_MRI_ResNet50\results\efficientnet_b0_rgb224_patient_30ep_cap5\best_efficientnet_b0_rgb224_patient.pt" ^
    --input "D:\AD_MRI_ResNet50\raw_data\NonDemented\1.jpg" ^
    --output_csv "prediction_result.csv"

Folder prediction:
  python predict.py ^
    --checkpoint "D:\AD_MRI_ResNet50\results\efficientnet_b0_rgb224_patient_30ep_cap5\best_efficientnet_b0_rgb224_patient.pt" ^
    --input "D:\AD_MRI_ResNet50\test_images" ^
    --output_csv "prediction_result.csv"

For web backend integration, import:
  load_model()
  predict_image()
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Dict, List, Tuple

import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}

# Fallback class order used during training if checkpoint does not contain class_names.
DEFAULT_CLASS_NAMES = [
    "MildDemented",
    "ModerateDemented",
    "NonDemented",
    "VeryMildDemented",
]

CLASS_CN = {
    "NonDemented": "非痴呆/正常",
    "VeryMildDemented": "极轻度痴呆",
    "MildDemented": "轻度痴呆",
    "ModerateDemented": "中度痴呆",
}


def get_device(device_name: str = "auto") -> torch.device:
    if device_name == "auto":
        return torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if device_name == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA was requested, but torch.cuda.is_available() is False.")
    return torch.device(device_name)


def build_efficientnet_b0(num_classes: int) -> nn.Module:
    """
    Build the same model structure as training:
      torchvision EfficientNet-B0
      classifier[-1] replaced by Linear(in_features, num_classes)

    For inference, weights=None because trained parameters are loaded from checkpoint.
    """
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[-1].in_features
    model.classifier[-1] = nn.Linear(in_features, num_classes)
    return model


def build_transform(img_size: int = 224):
    """
    Must match training preprocessing:
      RGB image
      Resize to 224x224
      ToTensor
      ImageNet normalization
    """
    return transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ])


def load_model(
    checkpoint_path: str | Path,
    device_name: str = "auto",
) -> Tuple[nn.Module, List[str], int, torch.device]:
    """
    Load trained EfficientNet-B0 checkpoint.

    Returns:
      model, class_names, img_size, device
    """
    device = get_device(device_name)
    checkpoint_path = Path(checkpoint_path)

    if not checkpoint_path.exists():
        raise FileNotFoundError(f"Checkpoint not found: {checkpoint_path}")

    checkpoint = torch.load(checkpoint_path, map_location=device)

    class_names = checkpoint.get("class_names", DEFAULT_CLASS_NAMES)
    img_size = int(checkpoint.get("img_size", 224))

    model = build_efficientnet_b0(num_classes=len(class_names))

    if "model_state_dict" in checkpoint:
        state_dict = checkpoint["model_state_dict"]
    else:
        # Support plain state_dict checkpoints.
        state_dict = checkpoint

    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()

    return model, class_names, img_size, device


@torch.no_grad()
def predict_image(
    image_path: str | Path,
    model: nn.Module,
    class_names: List[str],
    img_size: int = 224,
    device: torch.device | str = "cpu",
) -> Dict[str, object]:
    """
    Predict a single image.

    Returns a dictionary:
      {
        "path": ...,
        "pred_index": ...,
        "pred_class": ...,
        "pred_class_cn": ...,
        "confidence": ...,
        "probabilities": {"MildDemented": ..., ...}
      }
    """
    if isinstance(device, str):
        device = torch.device(device)

    image_path = Path(image_path)
    if not image_path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    transform = build_transform(img_size)
    image = Image.open(image_path).convert("RGB")
    x = transform(image).unsqueeze(0).to(device)

    logits = model(x)
    probs = torch.softmax(logits, dim=1).squeeze(0).cpu()

    pred_index = int(torch.argmax(probs).item())
    pred_class = class_names[pred_index]
    confidence = float(probs[pred_index].item())

    return {
        "path": str(image_path),
        "pred_index": pred_index,
        "pred_class": pred_class,
        "pred_class_cn": CLASS_CN.get(pred_class, pred_class),
        "confidence": confidence,
        "probabilities": {
            class_name: float(probs[i].item())
            for i, class_name in enumerate(class_names)
        },
    }


def collect_image_paths(input_path: str | Path) -> List[Path]:
    input_path = Path(input_path)

    if input_path.is_file():
        if input_path.suffix.lower() not in IMAGE_EXTENSIONS:
            raise ValueError(f"Unsupported image file extension: {input_path.suffix}")
        return [input_path]

    if input_path.is_dir():
        paths = [
            p for p in sorted(input_path.rglob("*"))
            if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
        ]
        if not paths:
            raise RuntimeError(f"No supported image files found under: {input_path}")
        return paths

    raise FileNotFoundError(f"Input path does not exist: {input_path}")


def save_predictions_csv(results: List[Dict[str, object]], class_names: List[str], output_csv: str | Path):
    output_csv = Path(output_csv)
    output_csv.parent.mkdir(parents=True, exist_ok=True)

    fieldnames = ["path", "pred_index", "pred_class", "pred_class_cn", "confidence"]
    fieldnames += [f"prob_{class_name}" for class_name in class_names]

    with output_csv.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for result in results:
            row = {
                "path": result["path"],
                "pred_index": result["pred_index"],
                "pred_class": result["pred_class"],
                "pred_class_cn": result["pred_class_cn"],
                "confidence": result["confidence"],
            }
            probabilities = result["probabilities"]
            for class_name in class_names:
                row[f"prob_{class_name}"] = probabilities[class_name]
            writer.writerow(row)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="EfficientNet-B0 Alzheimer MRI inference")
    parser.add_argument("--checkpoint", required=True, help="Path to best EfficientNet-B0 checkpoint .pt")
    parser.add_argument("--input", required=True, help="Image file or folder")
    parser.add_argument("--output_csv", default="prediction_result.csv", help="Output CSV path")
    parser.add_argument("--device", default="auto", choices=["auto", "cpu", "cuda"])
    return parser.parse_args()


def main():
    args = parse_args()

    model, class_names, img_size, device = load_model(args.checkpoint, args.device)
    image_paths = collect_image_paths(args.input)

    results = [
        predict_image(
            image_path=p,
            model=model,
            class_names=class_names,
            img_size=img_size,
            device=device,
        )
        for p in image_paths
    ]

    save_predictions_csv(results, class_names, args.output_csv)

    for result in results:
        print(
            f"{result['path']} -> "
            f"{result['pred_class']} ({result['pred_class_cn']}), "
            f"confidence={result['confidence']:.4f}"
        )

    print(f"\nPredictions saved to: {Path(args.output_csv).resolve()}")


if __name__ == "__main__":
    main()
