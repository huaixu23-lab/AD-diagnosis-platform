# AD辅助诊疗网站：真实模型运行说明

本版本已经整理为“前端页面 + FastAPI 后端 + joblib 真实模型”的结构。医生端临床检查模块不会使用前端演示逻辑，而是调用后端接口 `/api/ad/predict`，由后端加载 `backend/models/model_bundle.joblib` 完成预测。

## 1. 项目结构

```text
AD辅助诊疗网站/
├── index.html
├── css/
├── assets/
├── doctor/
│   └── clinical-diagnosis/
│       ├── index.html
│       ├── style.css
│       ├── script.js
│       └── assets/
└── backend/
    ├── __init__.py
    ├── app.py
    ├── model_service.py
    ├── requirements.txt
    ├── models/
    │   ├── model_bundle.joblib
    │   └── model_features.json
    └── data/
        └── investigator_nacc70.csv
```

## 2. 安装依赖

在项目根目录打开命令行：

```bat
python -m pip install -r backend\requirements.txt
```

如果你已经安装过依赖，可以跳过这一步。

## 3. 启动完整系统

必须从项目根目录启动 FastAPI 服务，不要直接双击 HTML。

```bat
python -m uvicorn backend.app:app --reload --port 8000
```

启动后浏览器访问：

```text
http://127.0.0.1:8000/doctor/clinical-diagnosis/
```

## 4. 检查模型是否加载成功

浏览器打开：

```text
http://127.0.0.1:8000/api/ad/health
```

如果返回 `status: ok` 且 `model: loaded`，说明后端已经成功加载 `model_bundle.joblib`。

## 5. 字段映射说明

前端表单使用便于展示的字段名，例如 `age`、`mmse`、`moca`、`faq_sum`。后端会自动映射为模型训练使用的 NACC 字段，例如：

```text
age → NACCAGE
mmse → NACCMMSE
moca → NACCMOCA / MOCATOTS
faq_sum → FAQ_SUM
apoe4 → NACCNE4S
```

如果上传 CSV，既支持前端简写表头，也支持 NACC 原始字段表头。

## 6. 常见问题

### 直接双击网页为什么不能预测？

真实模型需要 Python 后端加载。直接双击 HTML 只能打开静态页面，不能启动模型接口。请使用：

```bat
python -m uvicorn backend.app:app --reload --port 8000
```

### 模型接口调用失败怎么办？

先检查：

```text
backend/models/model_bundle.joblib
```

是否存在；再访问：

```text
http://127.0.0.1:8000/api/ad/health
```

确认后端是否正常运行。
