# backend/app.py
import os
import time
import base64
import tempfile
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import torch
import cv2
import numpy as np
# 从已有的依赖文件中，直接引入模型加载、转换以及 Grad-CAM 算法组件
from predict import load_model, build_transform
from gradcam import GradCAM, overlay_heatmap

app = Flask(__name__)
# 允许跨域请求，消除前后端联调时的跨域安全限制
CORS(app)

# ----------------- 1. 全局配置与模型静态挂载 -----------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHECKPOINT_PATH = os.path.join(BASE_DIR, "weights", "best_efficientnet_b0_rgb224_patient.pt")

MODEL = None
CLASS_NAMES = None
IMG_SIZE = 224
DEVICE = None
TARGET_LAYER = None

# 各病种分类的中文名称映射
CLASS_CN = {
    "NonDemented": "非痴呆 / 正常",
    "VeryMildDemented": "极轻度老年痴呆",
    "MildDemented": "轻度老年痴呆",
    "ModerateDemented": "中度老年痴呆"
}

# 结构性临床诊断分析报告模板（根据预测类别动态输出给网页展示）
ANALYSIS_TEMPLATES = {
    "NonDemented": "【AI诊断反馈】：影像学评估表明，受检者脑部核磁共振（MRI）切片未见明显病变信号。海马体形态规则完整，无空洞化，脑室占位空间正常，未见阿尔茨海默病引起的退行性萎缩体征。建议按期做脑力随访体检即可。",
    "VeryMildDemented": "【AI诊断反馈】：模型特征热力图于海马旁回或侧脑室周缘有极微弱聚集点，提示受检者该脑区可能存在早期灰质密度缩减。当前属于临床前早期阶段。建议临床结合 MMSE 或 MoCA 量表进行认知评估。",
    "MildDemented": "【AI诊断反馈】：影像切片热力图显示，热力聚焦区域位于海马体及颞叶边缘。形态学上，受检者海马区呈现轻微形态萎缩与脑室局限性空腔代偿扩大。符合轻度认知障碍（MCI）退化特质，建议及时防范演变。",
    "ModerateDemented": "【AI诊断反馈】：模型在全脑皮层及侧脑室产生了高强度的热图分布。图像显示受检者海马区体积重度缩小，两侧脑室呈现明显的对称性扩大，脑深沟槽显著增宽。高度符合中度阿尔茨海默病特征，建议临床立即进行干预。"
}

# 应用启动时直接挂载模型进内存，避免请求接口时重复加载
try:
    print(f"[*] 正在载入 EfficientNet-B0 模型权重... \n路径: {CHECKPOINT_PATH}")
    MODEL, CLASS_NAMES, IMG_SIZE, DEVICE = load_model(CHECKPOINT_PATH, device_name="auto")
    # 获取特征图的最尾端：EfficientNet-B0 最后一层卷积块
    TARGET_LAYER = MODEL.features[-1]
    print(f"[+] 模型载入完成！设备: {DEVICE} | 类别列表: {CLASS_NAMES}")
except Exception as e:
    print(f"[-] 模型载入失败，请确认权重文件是否正确存放在 weights 文件夹下。报错: {e}")

# ----------------- 2. 主推理 API 接口 -----------------
@app.route("/api/predict", methods=["POST"])
def predict():
    if MODEL is None:
        return jsonify({"success": False, "message": "模型未载入，请检查服务端配置。"}), 500

    if "file" not in request.files:
        return jsonify({"success": False, "message": "参数错误：表单未携带 file 文件。"}), 400
        
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"success": False, "message": "未选择任何有效的图片文件。"}), 400
        
    # 保存上传的原始图片（创建为一个临时文件，完成交叉处理工作）
    suffix = Path(file.filename).suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_path = temp_file.name
        file.save(temp_path)
        
    try:
        # A. 图像标准归一化与 Tensor 组装
        transform = build_transform(IMG_SIZE)
        image = Image.open(temp_path).convert("RGB")
        x = transform(image).unsqueeze(0).to(DEVICE)
        
        # B. 模型向前传播计算分类概率
        start_time = time.time()
        logits = MODEL(x)
        probs = torch.softmax(logits, dim=1).squeeze(0).cpu().detach().numpy()
        latency_ms = int((time.time() - start_time) * 1000)
        
        pred_idx = int(np.argmax(probs))
        pred_class = CLASS_NAMES[pred_idx]
        confidence = float(probs[pred_idx])
        
        # C. 计算 Grad-CAM 特征热力图
        gcam = GradCAM(MODEL, TARGET_LAYER)
        heatmap = gcam.generate_heatmap(x, class_idx=pred_idx)
        
        # D. 合并原图与彩色热力图
        overlay_img, orig_img_resized = overlay_heatmap(temp_path, heatmap, alpha=0.45)
        
        # E. 保存为 Base64 编码，绕过磁盘文件路径，直接输送给前端网页
        _, overlay_buf = cv2.imencode('.jpg', overlay_img)
        overlay_b64 = "data:image/jpeg;base64," + base64.b64encode(overlay_buf).decode('utf-8')
        
        _, orig_buf = cv2.imencode('.jpg', orig_img_resized)
        orig_b64 = "data:image/jpeg;base64," + base64.b64encode(orig_buf).decode('utf-8')

        # F. 构建各个类别的置信度列表，供前端生成排版合理的图表
        probabilities_list = []
        for i, cname in enumerate(CLASS_NAMES):
            probabilities_list.append({
                "class_name": cname,
                "class_name_cn": CLASS_CN.get(cname, cname),
                "probability": float(probs[i])
            })
            
        # G. 拼装结构体 JSON 响应
        return jsonify({
            "success": True,
            "prediction": CLASS_CN.get(pred_class, pred_class),
            "prediction_en": pred_class,
            "confidence": f"{confidence * 100:.2f}%",
            "latency": f"{latency_ms}ms",
            "analysis": ANALYSIS_TEMPLATES.get(pred_class, "未识别到对应的临床判定文本模板。"),
            "raw_image": orig_b64,
            "overlay_image": overlay_b64,
            "probabilities": probabilities_list
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"处理过程中发生异常: {str(e)}"}), 500

    finally:
        # 清理刚才的临时图片文件
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
from flask import send_from_directory

# 获取 frontend 文件夹的绝对路径
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../frontend")

@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(FRONTEND_DIR, filename)

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=True)