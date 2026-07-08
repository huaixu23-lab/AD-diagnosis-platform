from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.model_service import model_service


PROJECT_ROOT = Path(__file__).resolve().parent.parent

app = FastAPI(title="AD Clinical Diagnosis Model API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PatientPayload(BaseModel):
    features: Dict[str, Any]
    source: Optional[str] = None


@app.post("/api/ad/predict")
def predict_ad(payload: PatientPayload):
    try:
        return model_service.predict(payload.features)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"模型预测失败：{exc}") from exc


@app.get("/api/ad/health")
def health():
    return {
        "status": "ok",
        "model": "loaded",
        "message": "AD clinical diagnosis model backend is running.",
        "schema": model_service.schema(),
    }


@app.get("/api/ad/schema")
def schema():
    return model_service.schema()


# 通过同一个 FastAPI 服务托管前端页面，避免 file:// 打开时无法请求后端接口。
app.mount("/", StaticFiles(directory=PROJECT_ROOT, html=True), name="frontend")
