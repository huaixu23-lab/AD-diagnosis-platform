from pathlib import Path
from typing import Any, Dict, List
import os

# 避免部分 Windows / Python 环境下 HistGradientBoosting 预测时出现线程阻塞。
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")

import joblib
import numpy as np
import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "model_bundle.joblib"


# 前端表单字段 -> 训练模型字段。部分临床指标会同时填入 NACC 中的等价/相近字段，
# 这样可以避免前端字段名和模型训练字段名不一致导致模型输入全部缺失。
FRONTEND_TO_MODEL_FIELDS: Dict[str, List[str]] = {
    "age": ["NACCAGE"],
    "sex": ["SEX"],
    "educ": ["EDUC"],
    "mmse": ["NACCMMSE"],
    "moca": ["NACCMOCA", "MOCATOTS"],
    "animals": ["ANIMALS"],
    "trailb": ["TRAILB"],
    "memory_score": ["CRAFTDVR", "CRAFTDRE", "LOGIMEM"],
    "faq_sum": ["FAQ_SUM"],
    "npi_symptom_sum": ["NPI_SYMPTOM_SUM"],
    "npi_severity_sum": ["NPI_SEVERITY_SUM"],
    "depression": ["DEP"],
    "apoe4": ["NACCNE4S"],
    "abeta42": ["NACCACSF", "AMYLCSF"],
    "total_tau": ["NACCTCSF", "CSFTAU"],
    "p_tau": ["NACCPCSF", "NPTAU", "NPTAUHAP"],
    "thyroid": ["THYROID", "THYDIS"],
    "b12_def": ["B12DEF", "VB12DEF"],
    "diabetes": ["DIABETES"],
    "hypertension": ["HYPERTEN"],
    "hypercholesterol": ["HYPERCHO"],
    "stroke_tia": ["STROKE", "CBSTROKE"],
    "bmi": ["NACCBMI"],
    "bpsys": ["BPSYS"],
    "bpdias": ["BPDIAS"],
    "family_history": ["NACCFAM"],
}


def _is_missing(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str) and value.strip() == "":
        return True
    try:
        return bool(pd.isna(value))
    except Exception:
        return False


def _normalize_value(value: Any) -> Any:
    """把前端传来的空字符串、数字字符串等转换成模型可处理的值。"""
    if _is_missing(value):
        return np.nan
    if isinstance(value, str):
        text = value.strip()
        try:
            number = float(text)
            if number.is_integer():
                return int(number)
            return number
        except ValueError:
            return text
    return value


class ADModelService:
    def __init__(self):
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"没有找到模型文件：{MODEL_PATH}\n"
                f"请先运行 Notebook，生成 backend/models/model_bundle.joblib"
            )

        bundle = joblib.load(MODEL_PATH)

        self.binary_model = bundle["binary_model"]
        self.tri_model = bundle["tri_model"]
        self.severity_model = bundle["severity_model"]

        self.feature_info = bundle["feature_info"]
        self.label_maps = bundle["label_maps"]
        self.config = bundle.get("config", {})
        self.training_info = bundle.get("training_info", {})

        self.selected_features = list(self.feature_info["selected_features"])
        self.model_input_columns = list(self.feature_info["model_input_columns"])
        self.risk_threshold = float(self.config.get("risk_threshold_for_stage2", 0.5))

    def schema(self) -> Dict[str, Any]:
        return {
            "model_loaded": True,
            "model_path": str(MODEL_PATH),
            "selected_feature_count": len(self.selected_features),
            "model_input_column_count": len(self.model_input_columns),
            "risk_threshold_for_stage2": self.risk_threshold,
            "training_info": self.training_info,
            "frontend_to_model_fields": FRONTEND_TO_MODEL_FIELDS,
        }

    def _risk_level(self, p: float) -> str:
        if p is None or np.isnan(p):
            return "未知"
        if p < 0.30:
            return "低风险"
        if p < 0.70:
            return "中风险"
        return "高风险"

    def _apply_frontend_mapping(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """同时支持前端简写字段和 NACC 原始字段。"""
        mapped: Dict[str, Any] = {}

        # 1. 先保留已经是 NACC/模型字段名的输入，CSV 直接上传 NACC 表头时会走这里。
        for key, value in payload.items():
            if key is None:
                continue
            clean_key = str(key).strip()
            if not clean_key:
                continue
            mapped[clean_key] = _normalize_value(value)

        # 2. 再把前端字段补充到模型字段。若用户直接上传了 NACC 字段，优先保留原字段值。
        for front_key, model_keys in FRONTEND_TO_MODEL_FIELDS.items():
            if front_key not in payload:
                continue
            value = _normalize_value(payload.get(front_key))
            if _is_missing(value):
                continue
            for model_key in model_keys:
                if model_key not in mapped or _is_missing(mapped.get(model_key)):
                    mapped[model_key] = value

        return mapped

    def _build_model_input(self, payload: Dict[str, Any]) -> pd.DataFrame:
        payload = self._apply_frontend_mapping(payload or {})

        row: Dict[str, Any] = {}
        for col in self.selected_features:
            row[col] = payload.get(col, np.nan)

        x = pd.DataFrame([row])

        # Notebook 训练时额外构造了 __MISSING 缺失指示变量，后端必须按相同逻辑补齐。
        for col in self.model_input_columns:
            if col.endswith("__MISSING"):
                raw_col = col.replace("__MISSING", "")
                if raw_col in x.columns:
                    x[col] = x[raw_col].isna().astype(int)
                else:
                    x[col] = 1

        for col in self.model_input_columns:
            if col not in x.columns:
                x[col] = np.nan

        return x[self.model_input_columns]

    def _label_binary(self, pred: int) -> str:
        binary_map = self.label_maps.get("demented", {"0": "非痴呆", "1": "痴呆"})
        return binary_map.get(str(pred), str(pred))

    def _label_tri(self, pred: int) -> str:
        tri_names = self.label_maps.get("tri_class_names", [])
        if 0 <= pred < len(tri_names):
            return tri_names[pred]
        return str(pred)

    def _label_severity(self, pred: int) -> str:
        cdr_labels = self.label_maps.get("cdr_labels", [])
        if 0 <= pred < len(cdr_labels):
            return cdr_labels[pred]
        return str(pred)

    def _key_factors(self, payload: Dict[str, Any]) -> List[str]:
        mapped = self._apply_frontend_mapping(payload or {})
        factors: List[str] = []

        mmse = mapped.get("NACCMMSE")
        moca = mapped.get("NACCMOCA", mapped.get("MOCATOTS"))
        faq = mapped.get("FAQ_SUM")
        trailb = mapped.get("TRAILB")
        apoe4 = mapped.get("NACCNE4S")

        if not _is_missing(mmse) and float(mmse) < 24:
            factors.append("MMSE 总分偏低，提示总体认知功能下降")
        if not _is_missing(moca) and float(moca) < 24:
            factors.append("MoCA 总分偏低，提示早期认知受损风险增加")
        if not _is_missing(faq) and float(faq) >= 6:
            factors.append("ADL / FAQ 功能受损较明显")
        if not _is_missing(trailb) and float(trailb) > 120:
            factors.append("TrailB 用时较长，提示执行功能受损")
        if not _is_missing(apoe4) and float(apoe4) > 0:
            factors.append("APOE ε4 携带状态提示遗传风险背景")

        if not factors:
            factors.append("当前输入指标未显示明显单项异常，建议结合完整临床资料综合判断")
        return factors

    def predict(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        x = self._build_model_input(payload)

        if hasattr(self.binary_model, "predict_proba"):
            risk_prob = float(self.binary_model.predict_proba(x)[0][1])
        else:
            risk_prob = float(self.binary_model.predict(x)[0])

        binary_pred = int(self.binary_model.predict(x)[0])
        risk_level = self._risk_level(risk_prob)
        binary_label = self._label_binary(binary_pred)

        tri_pred = int(self.tri_model.predict(x)[0])
        cognitive_state = self._label_tri(tri_pred)

        trigger_stage2 = (risk_prob >= self.risk_threshold) or (binary_pred == 1)
        if trigger_stage2:
            sev_pred = int(self.severity_model.predict(x)[0])
            severity_stage = self._label_severity(sev_pred)
        else:
            severity_stage = "未启动"

        summary = (
            f"系统已基于当前录入的临床检查指标完成辅助评估。"
            f"第一阶段结果为“{binary_label}”，认知状态参考为“{cognitive_state}”，"
            f"当前风险等级为“{risk_level}”。"
        )
        if trigger_stage2:
            summary += f"系统已进一步启动严重程度分期判断，分期参考为“{severity_stage}”。"
        else:
            summary += "当前未达到严重程度分期的启动条件。"

        factors = self._key_factors(payload)

        return {
            "risk_probability": risk_prob,
            "risk_level": risk_level,
            "binary_prediction": binary_label,
            "cognitive_state": cognitive_state,
            "severity_stage": severity_stage,
            "diagnosis_summary": summary,
            "factors": factors,
            "key_factors": factors,
            "model_source": "backend/models/model_bundle.joblib",
            "model_status": "loaded",
        }


model_service = ADModelService()
