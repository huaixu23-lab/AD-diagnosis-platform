# backend/gradcam.py
import torch
import numpy as np
import cv2

class GradCAM:
    """
    针对 PyTorch 模型的 Grad-CAM（梯度加权类激活映射）实现。
    用于解析 EfficientNet-B0 预测逻辑，并可视化模型在图像上关注的重点区域。
    """
    def __init__(self, model, target_layer):
        """
        Args:
            model: 训练好的 PyTorch 分类模型
            target_layer: 目标特征层（通常是骨干网络最后一个卷积层，如 model.features[-1]）
        """
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        self.handlers = []

    def _save_gradient(self, module, grad_input, grad_output):
        # 兼容最新版 PyTorch 2.x 使用 Full Backward Hook 来捕获梯度
        self.gradients = grad_output[0].detach()

    def _save_activation(self, module, input, output):
        # 前向传播时捕获该层的特征图
        self.activations = output.detach()

    def register_hooks(self):
        """为目标层注册 Hook 钩子"""
        self.handlers.append(
            self.target_layer.register_forward_hook(self._save_activation)
        )
        self.handlers.append(
            self.target_layer.register_full_backward_hook(self._save_gradient)
        )

    def remove_hooks(self):
        """移除 Hook 钩子，防止在下次推理或验证时产生内存泄漏"""
        for handle in self.handlers:
            handle.remove()
        self.handlers = []

    def generate_heatmap(self, input_tensor, class_idx):
        """
        生成对应类别的 2D 灰度热力图矩阵，范围在 [0, 1]
        
        Args:
            input_tensor: 预处理后的图像张量，形状为 (1, 3, 224, 224)
            class_idx: 目标预测类别的对应 idx（0 到 3）
        """
        self.model.eval()
        self.register_hooks()

        # 临时显式开启梯度计算 (Flask 线程下可能会默认关闭梯度)
        with torch.enable_grad():
            x = input_tensor.clone().detach().requires_grad_(True)
            logits = self.model(x)
            score = logits[0, class_idx]
            
            # 清空模型现有梯度，进行反向传播
            self.model.zero_grad()
            score.backward()

        if self.gradients is None or self.activations is None:
            self.remove_hooks()
            raise RuntimeError(
                "特征图或梯度抓取失败。请确认传入的 target_layer 属于该模型。"
            )

        # 1. 抓取特征图：形状为 (1, 1280, 7, 7)
        activations = self.activations
        # 2. 抓取梯度：形状为 (1, 1280, 7, 7)
        gradients = self.gradients

        # 3. 计算通道权重：在空间维度 (H, W) 上对梯度求全局平均 (GAP) 
        # 结果形状为 (1, 1280, 1, 1)
        weights = torch.mean(gradients, dim=(2, 3), keepdim=True)

        # 4. 加权求和各个通道的特征图：得到形状为 (1, 1, 7, 7) 的注意力特征
        cam = torch.sum(weights * activations, dim=1, keepdim=True)

        # 5. ReLU 激活操作：只保留对目标类别判断起“正向促进作用”的区域特征
        cam = torch.clamp(cam, min=0)

        # 6. 对热力图数值进行最大最小归一化 [0, 1]
        cam_min = torch.min(cam)
        cam_max = torch.max(cam)
        if cam_max > cam_min:
            cam = (cam - cam_min) / (cam_max - cam_min)
        else:
            cam = torch.zeros_like(cam)

        # 转换成 2D numpy 数组 (7, 7)
        heatmap = cam.squeeze().cpu().numpy()
        
        # 7. 手动拉闸清除 hook 句柄，保持环境整洁
        self.remove_hooks()
        
        return heatmap

def overlay_heatmap(image_path, heatmap, alpha=0.45):
    """
    使用 OpenCV 混合原始 MRI 灰度图与彩色热力图。
    
    Args:
        image_path: 原始图片的本地存放路径
        heatmap: 刚才生成的 (7, 7) 的 0-1 浮点数灰度图
        alpha: 热力图的半透明度 (0.0 为全灰度原图，1.0 为全伪彩色热力图)
        
    Returns:
        merged: 叠加后的彩色图像 (224x224, BGR格式)
        orig_img_resized: 缩放到 224x224 的原图 BGR 格式
    """
    # 以 OpenCV 默认的 BGR 格式读取原图
    orig_img = cv2.imread(str(image_path))
    if orig_img is None:
        raise FileNotFoundError(f"无法读取图片，请检查路径: {image_path}")
        
    orig_img_resized = cv2.resize(orig_img, (224, 224))
    
    # 1. 使用双线性插值把 (7, 7) 的低分辨率热力图插值放大到 (224, 224)
    heatmap_resized = cv2.resize(heatmap, (224, 224))
    
    # 2. 将 [0.0, 1.0] 的浮点数强制转换为 [0, 255] 的无符号 8 位整型
    heatmap_color = np.uint8(255 * heatmap_resized)
    
    # 3. 将单通道灰度图映射为彩虹色 (COLORMAP_JET: 越热的地方越红，冷的地方深蓝)
    heatmap_color = cv2.applyColorMap(heatmap_color, cv2.COLORMAP_JET)
    
    # 4. 根据权重公式混合图像：Overlay = alpha * 彩色热图 + (1 - alpha) * 原图
    merged = cv2.addWeighted(heatmap_color, alpha, orig_img_resized, 1.0 - alpha, 0)
    
    return merged, orig_img_resized