# 阿尔茨海默病临床症状初步评估模块

## 模块名称

阿尔茨海默病临床症状初步评估模块

英文名称：Clinical Symptom Assessment

## 模块功能

医生输入患者基本信息、认知相关症状、功能影响等级及红旗提示后，模块基于 AD 临床症状本体和医学规则，生成医生端临床症状辅助评估报告。

报告内容包括临床摘要卡片、当前临床表现总结、认知领域分析、AD 相关临床模式分析、疾病阶段辅助评估、初步临床印象、鉴别方向、进一步检查建议、专科评估建议、后续问诊建议、判断依据及医生补充备注。

## 目录说明

```text
AD_basic_diagnosis_module/
├── frontend/doctor/basic-diagnosis/
│   ├── index.html
│   ├── basic-diagnosis.css
│   ├── basic-diagnosis.js
│   ├── config.js
│   └── assets/
├── backend/
│   ├── input/
│   ├── feature/
│   ├── reasoning/
│   ├── assessment/
│   └── output/
└── demo/
```

## 部署方法

步骤 1：复制 `frontend/doctor/basic-diagnosis/` 到主项目 `doctor/basic-diagnosis/`。

步骤 2：复制 `backend/` 到主项目对应数据目录。若主项目使用根目录 `backend/`，可直接复制为 `backend/`。

步骤 3：检查 `doctor/basic-diagnosis/config.js` 中的 `DATA_PATH`。默认值为 `../../backend/`，适用于页面部署在 `doctor/basic-diagnosis/`、数据目录部署在项目根目录 `backend/` 的结构。

步骤 4：启动主项目并访问 `doctor/basic-diagnosis/`。

## 路径约定

前端页面引用均使用相对路径：

- `../../css/common.css`
- `./basic-diagnosis.css`
- `./config.js`
- `./basic-diagnosis.js`

数据目录入口统一配置在 `config.js`：

```js
window.AD_BASIC_DIAGNOSIS_CONFIG = {
  DATA_PATH: "../../backend/"
};
```

## 系统边界

本模块提供临床症状辅助分析，用于帮助医生整理患者临床表现、明确评估方向并生成进一步评估建议。

本模块不提供自动诊断，不进行风险预测，不输出概率计算结果，不提供治疗推荐。最终临床判断需由医生结合完整病史、查体、神经心理评估及辅助检查综合完成。

## 合并注意事项

- 不需要修改首页。
- 不需要修改医生工作台首页布局。
- 不需要修改其他医生模块页面。
- 不需要修改公共 CSS 文件。
- 若主项目后端数据目录位置不同，只需调整 `config.js` 中的相对路径。
