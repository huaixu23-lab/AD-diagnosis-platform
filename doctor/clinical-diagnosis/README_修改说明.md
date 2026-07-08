# AD辅助诊疗网站：临床检查真实模型版

本版本已将医生端“临床检查辅助诊断”模块整理为真实模型调用结构：

1. 前端页面位于 `doctor/clinical-diagnosis/`，负责手动录入、CSV 上传和预测结果展示。
2. 后端接口位于 `backend/`，通过 FastAPI 加载 `backend/models/model_bundle.joblib` 进行真实机器学习预测。
3. 前端 `script.js` 已关闭前端演示逻辑，点击“开始预测”时会请求 `/api/ad/predict`。
4. 已在前端和后端同时处理字段映射，页面字段如 `age`、`mmse`、`moca` 会被映射到模型训练字段如 `NACCAGE`、`NACCMMSE`、`NACCMOCA`。
5. 支持上传 CSV。CSV 可以使用页面模板字段，也可以直接使用 NACC 原始字段。

运行方式见：`README_真实模型运行说明.md`。
