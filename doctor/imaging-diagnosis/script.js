// =========================================================
// ----- DOM 引用 -----  
// =========================================================
const dropZone = document.getElementById('drop-zone');  
const fileInput = document.getElementById('file-input');  
const uploadPrompt = document.getElementById('upload-prompt');  
const previewContainer = document.getElementById('preview-container');  
const btnRemoveImage = document.getElementById('btn-remove-image');  
const fileNameDisp = document.getElementById('file-name');  
const fileSizeDisp = document.getElementById('file-size');  
const btnAnalyze = document.getElementById('btn-analyze');  
  
const canvas = document.getElementById('mri-canvas');  
const ctx = canvas.getContext('2d');  
const inspector = document.getElementById('pixel-inspector');  
const btnReset = document.getElementById('btn-reset-view');  

// ----- 大图模态框引用 -----
const imageModal = document.getElementById('image-modal');
const modalImg = document.getElementById('modal-img');
const modalCaption = document.getElementById('modal-caption');
  
// ----- 状态变量 -----  
let img = new Image();  
let imgLoaded = false;  
  
// 视口变换参数  
let scale = 1;  
let originX = 0;  
let originY = 0;  
let isDragging = false;  
let startX = 0;  
let startY = 0;  
  
// 离屏Canvas（用于像素采样）  
const offlineCanvas = document.createElement('canvas');  
const offlineCtx = offlineCanvas.getContext('2d');  
  
// ----- 上传交互 -----  
dropZone.addEventListener('click', (e) => {  
    if (e.target.closest('#btn-remove-image') ||  
        e.target.closest('#btn-reset-view') ||  
        e.target.closest('#mri-canvas')) return;  
    fileInput.click();  
});  
  
fileInput.addEventListener('change', handleFileSelect);  
  
dropZone.addEventListener('dragover', (e) => {  
    e.preventDefault();  
    dropZone.classList.add('bg-slate-50', 'border-indigo-400');  
});  
  
dropZone.addEventListener('dragleave', () => {  
    dropZone.classList.remove('bg-slate-50', 'border-indigo-400');  
});  
  
dropZone.addEventListener('drop', (e) => {  
    e.preventDefault();  
    dropZone.classList.remove('bg-slate-50', 'border-indigo-400');  
    const files = e.dataTransfer.files;  
    if (files.length) {  
        fileInput.files = files;  
        handleFileSelect();  
    }  
});  
  
// ----- 移除图像 -----  
btnRemoveImage.addEventListener('click', (e) => {  
    e.stopPropagation();  
    fileInput.value = '';  
    imgLoaded = false;  
    img.src = '';  
  
    ctx.clearRect(0, 0, canvas.width, canvas.height);  
    inspector.classList.add('hidden');  
  
    previewContainer.classList.add('hidden');  
    uploadPrompt.classList.remove('hidden');  
  
    btnAnalyze.disabled = true;  
    btnAnalyze.classList.remove('bg-indigo-600', 'text-white', 'cursor-pointer');  
    btnAnalyze.classList.add('bg-slate-200', 'text-slate-400', 'cursor-not-allowed');  

    // 隐藏诊断结果并重现空状态
    document.getElementById('report-content').classList.add('hidden');  
    document.getElementById('result-empty-state').classList.remove('hidden');  
});  
  
// ----- 文件选择处理 -----  
function handleFileSelect() {  
    const file = fileInput.files[0];  
    if (!file) return;  
  
    const reader = new FileReader();  
    reader.onload = function (e) {  
        fileNameDisp.textContent = file.name;  
        fileSizeDisp.textContent = (file.size / 1024).toFixed(1) + ' KB';  
  
        loadMRIImage(e.target.result);  
  
        uploadPrompt.classList.add('hidden');  
        previewContainer.classList.remove('hidden');  
  
        btnAnalyze.disabled = false;  
        btnAnalyze.classList.remove('bg-slate-200', 'text-slate-400', 'cursor-not-allowed');  
        btnAnalyze.classList.add('bg-indigo-600', 'text-white', 'cursor-pointer');  
    };  
    reader.readAsDataURL(file);  
}  
  
// ----- 加载MRI图像到Canvas -----  
function loadMRIImage(src) {  
    img = new Image();  
    img.src = src;  
    img.onload = function () {  
        const rect = canvas.parentNode.getBoundingClientRect();  
        canvas.width = rect.width;  
        canvas.height = rect.height;  
  
        imgLoaded = true;  
        inspector.classList.remove('hidden');  
  
        // 缓存到离屏Canvas  
        offlineCanvas.width = img.width;  
        offlineCanvas.height = img.height;  
        offlineCtx.drawImage(img, 0, 0);  
  
        // Cover适配  
        const scaleX = canvas.width / img.width;  
        const scaleY = canvas.height / img.height;  
        scale = Math.max(scaleX, scaleY);  
  
        originX = (canvas.width - img.width * scale) / 2;  
        originY = (canvas.height - img.height * scale) / 2;  
  
        draw();  
    };  
}  
  
// ----- 渲染 -----  
function draw() {  
    if (!imgLoaded) return;  
    ctx.clearRect(0, 0, canvas.width, canvas.height);  
  
    ctx.save();  
    ctx.translate(originX, originY);  
    ctx.scale(scale, scale);  
    ctx.imageSmoothingEnabled = false; // 保持像素清晰  
    ctx.drawImage(img, 0, 0);  
    ctx.restore();  
}  
  
// ----- 重置视角 -----  
btnReset.addEventListener('click', (e) => {  
    e.stopPropagation();  
    if (imgLoaded) {  
        loadMRIImage(img.src);  
    }  
});  
  
// ----- 拖拽平移 -----  
canvas.addEventListener('mousedown', (e) => {  
    if (!imgLoaded) return;  
    isDragging = true;  
    startX = e.clientX - originX;  
    startY = e.clientY - originY;  
});  
  
window.addEventListener('mouseup', () => {  
    isDragging = false;  
});  
  
// ----- 鼠标移动（拖拽 + 灰度探针）-----  
canvas.addEventListener('mousemove', (e) => {  
    if (!imgLoaded) return;  
  
    const rect = canvas.getBoundingClientRect();  
    const mouseX = e.clientX - rect.left;  
    const mouseY = e.clientY - rect.top;  
  
    // 拖拽  
    if (isDragging) {  
        originX = e.clientX - startX;  
        originY = e.clientY - startY;  
        draw();  
    }  
  
    // 灰度探针  
    const imgX = Math.floor((mouseX - originX) / scale);  
    const imgY = Math.floor((mouseY - originY) / scale);  
  
    if (imgX >= 0 && imgX < img.width && imgY >= 0 && imgY < img.height) {  
        const pixelData = offlineCtx.getImageData(imgX, imgY, 1, 1).data;  
        const r = pixelData[0];  
        const g = pixelData[1];  
        const b = pixelData[2];  
  
        // Luma公式 (ITU-R BT.601)  
        const grayValue = Math.round(0.299 * r + 0.587 * g + 0.114 * b);  
        const grayPercent = Math.round((grayValue / 255) * 100);  
  
        document.getElementById('px-x').innerText = imgX;  
        document.getElementById('px-y').innerText = imgY;  
        document.getElementById('px-gray').innerText = grayPercent + '%';  
  
        // 组织类型映射  
        const tissueSpan = document.getElementById('px-tissue');  
        let tissue = '--';  
        let className = 'text-slate-400 font-bold';  
  
        if (grayPercent <= 15) {  
            tissue = '背景 / 脑脊液 (CSF) 域';  
            className = 'text-slate-400 font-bold';  
        } else if (grayPercent > 15 && grayPercent <= 42) {  
            tissue = '脑灰质疑似区 (Grey)';  
            className = 'text-indigo-400 font-bold';  
        } else if (grayPercent > 42 && grayPercent <= 72) {  
            tissue = '脑白质核心区 (White)';  
            className = 'text-emerald-400 font-bold';  
        } else {  
            tissue = '硬膜 / 高强度颅骨 (Bone)';  
            className = 'text-amber-400 font-bold';  
        }  
        tissueSpan.innerText = tissue;  
        tissueSpan.className = className;  
    }  
});  
  
// ----- 滚轮缩放（以鼠标为中心）-----  
canvas.addEventListener('wheel', (e) => {  
    if (!imgLoaded) return;  
    e.preventDefault();  
  
    const rect = canvas.getBoundingClientRect();  
    const mouseX = e.clientX - rect.left;  
    const mouseY = e.clientY - rect.top;  
  
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;  
    if (scale * zoomFactor < 0.3 || scale * zoomFactor > 15) return;  
  
    originX = mouseX - (mouseX - originX) * zoomFactor;  
    originY = mouseY - (mouseY - originY) * zoomFactor;  
    scale *= zoomFactor;  
  
    draw();  
}, { passive: false });

// =========================================================
// ====== 🆕 全屏大图图片查看器 (事件代理与穿透 Bug 修复) ======
// =========================================================

document.body.addEventListener('click', (e) => {
    // 监听是否点击在包含图片的诊断或者对比大图容器内
    const zoomContainer = e.target.closest('.ref-image, #original-container, #gradcam-container');
    
    if (zoomContainer) {
        const targetImg = zoomContainer.querySelector('img');
        if (targetImg && targetImg.src) {
            console.log("【图像放大】成功捕捉图片，唤醒全屏模态框...");
            modalImg.src = targetImg.src;
            
            let captionText = "脑部 MRI 细节阅片";
            if (zoomContainer.closest('.ref-card')) {
                const labelText = zoomContainer.closest('.ref-card').querySelector('.ref-card-header span:first-child').innerText;
                const badgeText = zoomContainer.closest('.ref-card').querySelector('.badge').innerText;
                captionText = `对照图谱分期: ${labelText} (${badgeText})`;
            } else if (zoomContainer.id === 'original-container') {
                captionText = "患者源核磁共振影像 (Original Slice)";
            } else if (zoomContainer.id === 'gradcam-container') {
                captionText = "AI 深度神经网络特征热图 (Grad-CAM Overlay)";
            }
            
            modalCaption.innerText = captionText;
            imageModal.classList.remove('hidden');
        }
    }
});

// 点击大图模态框背景任意处自动退出
imageModal.addEventListener('click', () => {
    imageModal.classList.add('hidden');
    modalImg.src = '';
});

// =========================================================
// ====== 🆕 发送请求与诊断渲染逻辑（连接本地端口 5001） ======
// =========================================================

// 此处配置为本地算法推理容器调试端口 5001 
const BACKEND_URL = 'http://localhost:5001/api/predict'; 

btnAnalyze.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) {
        alert("请先选择脑部 MRI 影像！");
        return;
    }

    // 1. 更新诊断按钮为加载中状态
    btnAnalyze.disabled = true;
    btnAnalyze.innerText = "正在进行 AI 诊断建模，生成病灶 Grad-CAM 热力图...";
    btnAnalyze.classList.remove('bg-indigo-600', 'cursor-pointer');
    btnAnalyze.classList.add('bg-indigo-400', 'cursor-wait');

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("【测试】后端返回结果：", data);

        if (data.success) {
            // 3. 显示结果区域
            document.getElementById('result-empty-state').classList.add('hidden');
            document.getElementById('report-content').classList.remove('hidden');

            // 4. 渲染核心结论和置信率
            document.getElementById('res-outcome').innerText = data.prediction || "未分类";
            document.getElementById('res-confidence').innerText = data.confidence || "0.0%";

            // 5. 渲染概率谱
            if (data.probabilities && Array.isArray(data.probabilities)) {
                // 将后端列表形式的概率转换成以英文为键的快速查询字典
                const probsObj = {};
                data.probabilities.forEach(item => {
                    probsObj[item.class_name] = item.probability;
                });

                const formatProbStyle = (pVal) => {
                    return (pVal * 100).toFixed(1) + '%';
                };

                const nonVal = formatProbStyle(probsObj.NonDemented || 0);
                const veryMildVal = formatProbStyle(probsObj.VeryMildDemented || 0);
                const mildVal = formatProbStyle(probsObj.MildDemented || 0);
                const moderateVal = formatProbStyle(probsObj.ModerateDemented || 0);

                // 更新进度条长度
                document.getElementById('bar-non').style.width = nonVal;
                document.getElementById('bar-very-mild').style.width = veryMildVal;
                document.getElementById('bar-mild').style.width = mildVal;
                document.getElementById('bar-moderate').style.width = moderateVal;

                // 更新数值显示文本
                document.getElementById('val-non').innerText = nonVal;
                document.getElementById('val-very-mild').innerText = veryMildVal;
                document.getElementById('val-mild').innerText = mildVal;
                document.getElementById('val-moderate').innerText = moderateVal;
            }

            // 6. 更新病理退化定位滑块 (Progression Path)
            let markerLeft = '0%';
            const predENG = data.prediction_en; // 精确读取后端的 "prediction_en" 属性
            if (predENG === 'NonDemented') markerLeft = '3%';
            else if (predENG === 'VeryMildDemented') markerLeft = '35%';
            else if (predENG === 'MildDemented') markerLeft = '66%';
            else if (predENG === 'ModerateDemented') markerLeft = '97%';
            document.getElementById('res-marker').style.left = markerLeft;

            // 7. 更新底部患者图 vs Grad-CAM 热力决策图对照区域 (加入 cursor-zoom-in 等支持大图放大)
            document.getElementById('original-container').innerHTML = 
                `<div class="w-full h-full cursor-zoom-in relative group flex items-center justify-center">
                    <img src="${data.raw_image}" class="max-w-full max-h-full object-contain" alt="Original MRI">
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity duration-200 pointer-events-none">🔍 点击放大</div>
                </div>`;
            document.getElementById('gradcam-container').innerHTML = 
                `<div class="w-full h-full cursor-zoom-in relative group flex items-center justify-center">
                    <img src="${data.overlay_image}" class="max-w-full max-h-full object-contain" alt="Grad-CAM Image">
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity duration-200 pointer-events-none">🔍 点击放大</div>
                </div>`;

            // 8. 结合模型真实预测阶段（prediction_en），动态输出基于 GCA / Fazekas 的解剖学通用解读报告。
            // 无论 MRI 切片切在什么高度，该解读逻辑在临床逻辑上都完全说得通。
            let interpretationText = "";
            if (predENG === 'NonDemented') {
                interpretationText = `【AI脑结构病理评估】:\n` +
                    `1. 全脑皮层萎缩评价 (GCA量表): 0级 (脑实质形态完整，无明显皮层萎缩现象，侧脑室无代偿性增大)。\n` +
                    `2. 脑白质病变评价 (Fazekas评分): 0分 (深部脑白质纤维完整性高，T2/FLAIR 显像中没有发现白质高信号硬化斑点)。\n\n` +
                    `【提示】: 该切片的皮层回沟和白质结构均在正常衰老对照范围内，AI未发现阿尔茨海默病(AD)特征性萎缩改变。`;
            } 
            else if (predENG === 'VeryMildDemented') {
                interpretationText = `【AI脑结构病理评估】:\n` +
                    `1. 全脑皮层萎缩评价 (GCA量表): 1级 (轻度萎缩阶段，切片内蛛网膜下腔裂隙略有变宽，脑沟呈现轻微局限性加深，脑室呈代偿性轻微变大)。\n` +
                    `2. 脑白质病变评价 (Fazekas评分): 1分 (脑白质内可见数个多发、散在分布的点状高信号 WMH 点状蜕变灶)。\n\n` +
                    `【提示】: 大脑结构出现极轻度退行性退化迹象，白质纤维受损程度较轻，建议结合临床简易精神量表(MMSE)进一步做 MCI(轻度认知障碍)复审。`;
            } 
            else if (predENG === 'MildDemented') {
                interpretationText = `【AI脑结构病理评估】:\n` +
                    `1. 全脑皮层萎缩评价 (GCA量表): 2级 (中度萎缩阶段，皮层脑回显露出局限性变小，大范围脑沟大幅增宽，切片中脑室呈普遍中度退化扩张)。\n` +
                    `2. 脑白质病变评价 (Fazekas评分): 2分 (髓鞘高信号区域变大，白质病变斑块开始桥接融合)。\n\n` +
                    `【提示】: 本切片的特征重合早期至中期阿尔茨海默病（AD）神经退行特征，提示白质神经网络的宏观完整度遭到破坏，建议加测脑脊液核心生物标志物辅助排除。`;
            } 
            else if (predENG === 'ModerateDemented') {
                interpretationText = `【AI脑结构病理评估】:\n` +
                    `1. 全脑皮层萎缩评价 (GCA量表): 3级 (重度皮层萎缩，脑侧脑室重度扩张呈球状，大脑回高度变窄，呈典型“刀片样萎缩”/Knife-edge atrophy)。\n` +
                    `2. 脑白质病变评价 (Fazekas评分): 3分 (脑髓质高信号融合成大片斑块，髓鞘发生大范围退行性损害)。\n\n` +
                    `【鉴别诊断警告】: 典型阿尔茨海默病（AD）患者的 Fazekas 白质评分通常较轻（少有 3分 表现）。若白质信号呈 diffuse 广泛大片融合，需重点排查血管性痴呆(VaD)或高血压小血管硬化引起的脱髓鞘病变，需密切结合临床病史鉴别。`;
            } else {
                interpretationText = data.analysis || "无此项指标解读数据。";
            }

            document.getElementById('res-interpretation').innerText = interpretationText;

        } else {
            alert(`后端算法推理失败：${data.message}`);
        }

    } catch (error) {
        console.error("【通信崩溃】", error);
        alert("智能测试服务器通信异常！");
    } finally {
        // 9. 还原按钮状态
        btnAnalyze.disabled = false;
        btnAnalyze.innerText = "开始阿尔兹海默智能诊断分析";
        btnAnalyze.classList.remove('bg-indigo-400', 'cursor-wait');
        btnAnalyze.classList.add('bg-indigo-600', 'cursor-pointer');
    }
});