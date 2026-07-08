const EXCEL_FILE_NAME = "AD治疗建议数据表_补充修订版.xlsx";

let appData = {
  stage_plan: [],
  drug_reference: [],
  recommendation_rules: [],
  risk_warning_rules: [],
  sources: []
};

const FIXED_STAGE_OPTIONS = ["极轻度AD", "轻度AD", "中度AD", "重度AD"];
const DEFAULT_LITERATURE_EMPTY_TEXT = "点击“推荐相关文献”后，系统会根据当前患者情况筛选文献，并提供可直接跳转的阅读入口。";

const LITERATURE_LIBRARY = [
  {
    id: "nice-ng97",
    title: "Dementia: assessment, management and support for people living with dementia and their carers",
    year: "2018",
    source: "NICE Guideline NG97",
    evidenceType: "临床指南",
    stageGroups: ["all"],
    amyloidStatuses: ["any"],
    riskTags: ["跌倒", "睡眠", "照护", "行为症状"],
    textTriggers: ["跌倒", "睡眠", "照护", "照护压力", "行为", "激越", "走失", "吞咽", "营养"],
    summary: "覆盖痴呆评估、治疗管理、照护者支持、安全风险和中重度阶段照护，适合作为治疗方案的总纲参考。",
    clinicalUse: "用于补充非药物干预、照护支持、随访管理和安全风险处理思路。",
    priority: 3,
    links: [
      { label: "阅读指南", url: "https://www.nice.org.uk/guidance/ng97/chapter/recommendations" }
    ]
  },
  {
    id: "nice-ta217",
    title: "Donepezil, galantamine, rivastigmine and memantine for Alzheimer's disease",
    year: "2018",
    source: "NICE Technology Appraisal TA217",
    evidenceType: "用药指南",
    stageGroups: ["mild", "moderate", "severe"],
    amyloidStatuses: ["any"],
    riskTags: ["心动过缓", "胃肠道不耐受", "肝肾功能异常"],
    textTriggers: ["药物", "多奈哌齐", "卡巴拉汀", "加兰他敏", "美金刚", "认知下降"],
    summary: "集中说明胆碱酯酶抑制剂和美金刚在不同 AD 阶段的推荐位置。",
    clinicalUse: "适合用于回答轻中重度阶段可参考哪些传统认知药物，以及何时考虑美金刚。",
    priority: 4,
    links: [
      { label: "阅读建议", url: "https://www.nice.org.uk/guidance/ta217/chapter/1-Recommendations" }
    ]
  },
  {
    id: "lecanemab-trial",
    title: "Lecanemab in Early Alzheimer's Disease",
    year: "2023",
    source: "New England Journal of Medicine",
    evidenceType: "随机临床试验",
    stageGroups: ["early", "mild"],
    amyloidStatuses: ["阳性"],
    riskTags: ["MRI高风险", "脑出血史", "抗凝用药"],
    textTriggers: ["仑卡奈", "lecanemab", "抗Aβ", "单抗", "ARIA", "早期", "轻度"],
    summary: "CLARITY AD 研究，关注仑卡奈单抗在早期 AD 中延缓疾病进展的疗效与安全性。",
    clinicalUse: "当患者为极轻度/轻度 AD 且 Aβ 阳性时，可作为抗 Aβ 单抗疗效依据的核心阅读材料。",
    priority: 5,
    links: [
      { label: "PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/36449413/" },
      { label: "期刊页", url: "https://doi.org/10.1056/NEJMoa2212948" }
    ]
  },
  {
    id: "donanemab-trial",
    title: "Donanemab in Early Symptomatic Alzheimer Disease: The TRAILBLAZER-ALZ 2 Randomized Clinical Trial",
    year: "2023",
    source: "JAMA",
    evidenceType: "随机临床试验",
    stageGroups: ["early", "mild"],
    amyloidStatuses: ["阳性"],
    riskTags: ["MRI高风险", "脑出血史", "抗凝用药"],
    textTriggers: ["多奈单抗", "donanemab", "抗Aβ", "单抗", "ARIA", "早期", "轻度"],
    summary: "TRAILBLAZER-ALZ 2 研究，关注多奈单抗在早期症状性 AD 中的临床获益和不良事件。",
    clinicalUse: "适合与仑卡奈单抗研究并列阅读，用于比较早期 AD 疾病修饰治疗证据。",
    priority: 5,
    links: [
      { label: "PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/37459141/" },
      { label: "期刊页", url: "https://doi.org/10.1001/jama.2023.13239" }
    ]
  },
  {
    id: "lecanemab-aur",
    title: "Lecanemab: Appropriate Use Recommendations",
    year: "2023",
    source: "Journal of Prevention of Alzheimer's Disease",
    evidenceType: "专家建议",
    stageGroups: ["early", "mild"],
    amyloidStatuses: ["阳性", "未知", "未检测"],
    riskTags: ["MRI高风险", "脑出血史", "抗凝用药", "癫痫史"],
    textTriggers: ["仑卡奈", "lecanemab", "抗Aβ", "单抗", "ARIA", "MRI", "出血", "抗凝", "筛选"],
    summary: "围绕仑卡奈单抗适用人群、基线评估、MRI 监测、ARIA 风险和排除条件提出实践建议。",
    clinicalUse: "当患者存在 MRI 高风险、脑出血史或抗凝用药时，应优先阅读其安全筛选部分。",
    priority: 5,
    links: [
      { label: "PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/37357276/" },
      { label: "期刊页", url: "https://doi.org/10.14283/jpad.2023.30" }
    ]
  },
  {
    id: "leqembi-label",
    title: "LEQEMBI (lecanemab-irmb) Prescribing Information",
    year: "2025",
    source: "U.S. FDA",
    evidenceType: "药品说明书",
    stageGroups: ["early", "mild"],
    amyloidStatuses: ["阳性", "未知", "未检测"],
    riskTags: ["MRI高风险", "脑出血史", "抗凝用药", "癫痫史"],
    textTriggers: ["仑卡奈", "lecanemab", "Leqembi", "ARIA", "MRI", "抗凝", "出血"],
    summary: "说明仑卡奈单抗适应证、警示、ARIA 监测、输注反应和重要安全注意事项。",
    clinicalUse: "适合核对抗 Aβ 治疗前的硬性安全信息，尤其是 MRI 和出血风险。",
    priority: 5,
    links: [
      { label: "药品资料", url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2025/761269s013lbl.pdf", hidden: true }
    ]
  },
  {
    id: "kisunla-label",
    title: "KISUNLA (donanemab-azbt) Prescribing Information",
    year: "2024",
    source: "U.S. FDA",
    evidenceType: "药品说明书",
    stageGroups: ["early", "mild"],
    amyloidStatuses: ["阳性", "未知", "未检测"],
    riskTags: ["MRI高风险", "脑出血史", "抗凝用药", "癫痫史"],
    textTriggers: ["多奈单抗", "donanemab", "Kisunla", "ARIA", "MRI", "抗凝", "出血"],
    summary: "说明多奈单抗适应证、用药前检查、ARIA 监测、警示和安全注意事项。",
    clinicalUse: "当需要判断多奈单抗是否可进入进一步评估时，可用于快速核对标签要求。",
    priority: 5,
    links: [
      { label: "药品资料", url: "https://www.fda.gov/media/180803/download", hidden: true }
    ]
  },
  {
    id: "memantine-cochrane",
    title: "Memantine for dementia",
    year: "2019",
    source: "Cochrane Database of Systematic Reviews",
    evidenceType: "系统综述",
    stageGroups: ["moderate", "severe"],
    amyloidStatuses: ["any"],
    riskTags: ["肝肾功能异常", "跌倒"],
    textTriggers: ["美金刚", "memantine", "中度", "重度", "肾功能", "头晕", "意识混乱"],
    summary: "系统评价美金刚在痴呆治疗中的疗效与安全性，适合关注中重度阶段证据。",
    clinicalUse: "用于讨论中重度 AD、胆碱酯酶抑制剂不耐受或需要联合/替代治疗时的证据基础。",
    priority: 4,
    links: [
      { label: "Cochrane", url: "https://doi.org/10.1002/14651858.CD003154.pub6" }
    ]
  },
  {
    id: "lancet-commission-2024",
    title: "Dementia prevention, intervention, and care: 2024 report of the Lancet standing Commission",
    year: "2024",
    source: "The Lancet",
    evidenceType: "综述/委员会报告",
    stageGroups: ["all"],
    amyloidStatuses: ["any"],
    riskTags: ["跌倒", "睡眠", "照护", "行为症状"],
    textTriggers: ["预防", "干预", "照护", "生活方式", "运动", "睡眠", "跌倒", "照护压力"],
    summary: "从预防、干预、照护和公共卫生角度总结痴呆管理证据，适合作为非药物干预和照护章节的拓展阅读。",
    clinicalUse: "用于补充生活方式、照护者支持和长期管理相关内容，不直接替代具体处方依据。",
    priority: 3,
    links: [
      { label: "PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/39096926/" },
      { label: "期刊页", url: "https://doi.org/10.1016/S0140-6736(24)01296-0" }
    ]
  },
  {
    id: "alz-care-recommendations",
    title: "Alzheimer's Association Dementia Care Practice Recommendations",
    year: "2018",
    source: "Alzheimer's Association",
    evidenceType: "照护实践建议",
    stageGroups: ["all"],
    amyloidStatuses: ["any"],
    riskTags: ["照护", "行为症状", "睡眠", "跌倒"],
    textTriggers: ["照护", "行为", "激越", "走失", "睡眠", "安全", "家属"],
    summary: "聚焦以人为中心照护、行为症状处理、活动安排、照护者教育和长期支持。",
    clinicalUse: "当患者有行为心理症状、睡眠问题或家属照护压力时，可作为实践性补充材料。",
    priority: 3,
    links: [
      { label: "阅读建议", url: "https://www.alz.org/professionals/professional-providers/dementia_care_practice_recommendations" }
    ]
  }
];

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  await loadBuiltInExcel();
});

function bindEvents() {
  document.getElementById("generateBtn").addEventListener("click", generateAdvice);
  document.getElementById("knowledgeBtn").addEventListener("click", generateKnowledgeSearch);
  document.getElementById("resetBtn").addEventListener("click", resetForm);

  ["stageSelect", "amyloidSelect", "conditionInput", "extraInput"].forEach(id => {
    const field = document.getElementById(id);

    if (field) {
      field.addEventListener("input", clearFormWarning);
      field.addEventListener("change", clearFormWarning);
    }
  });
}

function showFormWarning(message, fieldId) {
  let warning = document.getElementById("formWarning");
  const inputCard = document.querySelector(".input-card");

  if (!warning && inputCard) {
    warning = document.createElement("div");
    warning.id = "formWarning";
    warning.className = "form-warning";
    warning.setAttribute("role", "alert");
    inputCard.insertBefore(warning, inputCard.querySelector(".form-label"));
  }

  if (warning) {
    warning.textContent = message;
    warning.classList.add("is-visible");
  }

  if (fieldId) {
    const field = document.getElementById(fieldId);

    if (field) {
      field.classList.add("field-error");
      field.focus();
    }
  }
}

function clearFormWarning() {
  const warning = document.getElementById("formWarning");

  if (warning) {
    warning.classList.remove("is-visible");
  }

  document.querySelectorAll(".field-error").forEach(field => {
    field.classList.remove("field-error");
  });
}

async function loadBuiltInExcel() {
  const status = document.getElementById("dataStatus");
  const stageSelect = document.getElementById("stageSelect");

  try {
    if (status) {
      status.textContent = "正在加载治疗建议资料...";
    }

    const response = await fetch(encodeURI(`./${EXCEL_FILE_NAME}`));

    if (!response.ok) {
      throw new Error("治疗建议资料加载失败");
    }

    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    appData = {
      stage_plan: readSheet(workbook, "stage_plan"),
      drug_reference: readSheet(workbook, "drug_reference"),
      recommendation_rules: readSheet(workbook, "recommendation_rules"),
      risk_warning_rules: readSheet(workbook, "risk_warning_rules"),
      sources: readSheet(workbook, "sources")
    };

    initStageOptions();

    if (status) {
      status.className = "file-status success";
      status.textContent = "治疗建议资料已加载完成。";
    }
  } catch (error) {
    console.error(error);

    if (status) {
      status.className = "file-status error";
      status.textContent = "治疗建议资料加载失败，请刷新页面或联系管理员。";
    }

    stageSelect.innerHTML = `<option value="">资料加载失败</option>`;
  }
}

function readSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    console.warn(`没有找到 sheet：${sheetName}`);
    return [];
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  return rows
    .map(row => normalizeRow(row))
    .filter(row => {
      return Object.values(row).some(value => String(value).trim() !== "");
    });
}

function normalizeRow(row) {
  const newRow = {};

  Object.keys(row).forEach(key => {
    const cleanKey = cleanHeader(key);
    newRow[cleanKey] = row[key];
  });

  return newRow;
}

// 可以把 “stage_name（AD阶段名称）” 自动识别成 “stage_name”
function cleanHeader(header) {
  return String(header)
    .replace(/（.*?）/g, "")
    .replace(/\(.*?\)/g, "")
    .trim();
}

function initStageOptions() {
  const stageSelect = document.getElementById("stageSelect");
  stageSelect.innerHTML = `<option value="">请选择</option>`;

  FIXED_STAGE_OPTIONS.forEach(stage => {
    const option = document.createElement("option");
    option.value = stage;
    option.textContent = stage;
    stageSelect.appendChild(option);
  });
}

function generateAdvice() {
  const stage = getValue("stageSelect");
  const amyloid = getValue("amyloidSelect");
  const risks = getSelectedRisks();
  const conditionText = getValue("conditionInput");
  const extra = getValue("extraInput");

  if (!stage) {
    showFormWarning("请先选择 AD 分期。", "stageSelect");
    return;
  }

  renderMainAdvice(stage, amyloid, risks, conditionText, extra);
  renderDrugAdvice(stage, amyloid);
  renderRiskWarnings(risks);
}

function renderMainAdvice(stage, amyloid, risks, conditionText, extra) {
  const container = document.getElementById("mainResult");

  const stageInfo = appData.stage_plan.find(item => {
    return String(item.stage_name || "").trim() === stage;
  });

  const matchedRules = appData.recommendation_rules.filter(rule => {
    const ruleStage = String(rule.stage_name || "").trim();
    const ruleAmyloid = String(rule.amyloid_status || "").trim();

    const stageMatch = matchesStageText(ruleStage, stage);

    const amyloidMatch =
      ruleAmyloid === "" ||
      ruleAmyloid === "任意" ||
      ruleAmyloid === "不限" ||
      ruleAmyloid === amyloid ||
      amyloid === "未知";

    return stageMatch && amyloidMatch;
  });

  let html = "";

  if (stageInfo) {
    html += `
      <div class="result-block">
        <h3>${safeText(stageInfo.stage_name || "AD 分期")}</h3>
        ${renderField("阶段特征", stageInfo.stage_description)}
        ${renderField("治疗目标", stageInfo.treatment_goal)}
        ${renderField("推荐用药", stageInfo.drug_strategy)}
        ${renderField("非药物干预", stageInfo.non_drug_care)}
        ${renderField("随访重点", stageInfo.key_safety_followup)}
      </div>
    `;
  }

  if (matchedRules.length > 0) {
    matchedRules.forEach(rule => {
      html += `
        <div class="result-block">
          <h3>${safeText(rule.recommended_treatment || "推荐治疗方向")}</h3>
          ${rule.output_text ? `<p>${safeText(rule.output_text)}</p>` : ""}
          ${renderField("提示", rule.warning_text)}
        </div>
      `;
    });
  }

  if (!stageInfo && matchedRules.length === 0) {
    html = `
      <div class="empty-result">
        暂未找到与当前分期完全匹配的治疗建议，请结合患者具体情况进行临床判断。
      </div>
    `;
  }

  container.innerHTML = html;
}

function renderDrugAdvice(stage, amyloid) {
  const container = document.getElementById("drugResult");

  const drugs = appData.drug_reference.filter(drug => {
    const applicable = String(drug.applicable_stage || "");
    const stageMatch = matchesStageText(applicable, stage);

    const amyloidRequired = String(drug.amyloid_required || "").trim();

    const amyloidMatch =
      amyloidRequired !== "是" ||
      amyloid === "阳性";

    return stageMatch && amyloidMatch;
  });

  if (drugs.length === 0) {
    container.innerHTML = `
      <div class="empty-result">
        当前分期和 Aβ 状态下暂无明确匹配的药物参考，请结合患者情况进一步评估。
      </div>
    `;
    return;
  }

  container.innerHTML = drugs.map(drug => `
    <div class="result-block">
      <h3>${safeText(drug.drug_cn || "药物名称")} ${drug.drug_en ? `（${safeText(drug.drug_en)}）` : ""}</h3>
      ${renderField("药物类别", drug.drug_class)}
      ${renderField("适用阶段", drug.applicable_stage)}
      ${renderField("是否需要Aβ阳性", drug.amyloid_required)}
      ${renderField("主要用途", drug.main_use)}
      ${renderField("主要风险", drug.key_risks)}
      ${renderField("监测项目", drug.monitoring)}
    </div>
  `).join("");
}

function renderRiskWarnings(risks) {
  const container = document.getElementById("warningResult");

  if (risks.length === 0) {
    container.innerHTML = `
      <div class="empty-result">
        未选择特殊风险因素。
      </div>
    `;
    return;
  }

  const warnings = appData.risk_warning_rules.filter(rule => {
    const trigger = String(rule.trigger_value || "");
    return risks.some(risk => trigger.includes(risk) || risk.includes(trigger));
  });

  if (warnings.length === 0) {
    container.innerHTML = `
      <div class="empty-result">
        已记录所选风险因素，当前暂无更具体的风险提醒。请结合病史、检查结果和用药情况综合评估。
      </div>
    `;
    return;
  }

  container.innerHTML = warnings.map(warning => {
    const level = String(warning.risk_level || "");
    let levelClass = "warning-low";

    if (level.includes("高")) {
      levelClass = "warning-high";
    } else if (level.includes("中")) {
      levelClass = "warning-middle";
    }

    return `
      <div class="result-block ${levelClass}">
        <h3>${safeText(warning.related_treatment || "风险提醒")}</h3>
        ${renderField("触发因素", warning.trigger_value)}
        ${renderField("风险等级", warning.risk_level)}
        ${warning.warning_text ? `<p>${safeText(warning.warning_text)}</p>` : ""}
        ${renderField("建议处理", warning.recommended_action)}
        ${renderField("随访项目", warning.follow_up_item)}
      </div>
    `;
  }).join("");
}

function generateKnowledgeSearch() {
  const stage = getValue("stageSelect");
  const amyloid = getValue("amyloidSelect");
  const risks = getSelectedRisks();
  const conditionText = getValue("conditionInput");
  const extra = getValue("extraInput");

  const container = document.getElementById("knowledgeResult");

  if (!stage && !conditionText) {
    showFormWarning("请至少选择 AD 分期，或填写疾病情况描述。", "stageSelect");
    return;
  }

  const context = buildPatientLiteratureContext(stage, amyloid, risks, conditionText, extra);
  const recommendations = getLiteratureRecommendations(context);
  const keywords = buildSearchKeywords(stage, amyloid, risks, conditionText, extra);
  const pubmedQuery = buildPubMedQuery(keywords);
  const pubmedUrl = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(pubmedQuery)}`;
  const scholarUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(pubmedQuery)}`;
  const profileItems = buildPatientProfileItems(context);

  container.innerHTML = `
    <div class="result-block literature-summary">
      <h3>基于当前输入的文献推荐</h3>
      <p>
        已根据患者分期、Aβ状态、风险因素和补充描述，匹配到 ${recommendations.length} 条优先阅读材料。
        点击文献题名或“阅读”按钮即可跳转到对应页面。
      </p>
      <div class="keyword-list">
        ${profileItems.map(item => `<span class="keyword-item">${safeText(item)}</span>`).join("")}
      </div>
    </div>

    <div class="literature-list">
      ${recommendations.map(article => renderLiteratureCard(article)).join("")}
    </div>

    <div class="result-block">
      <h3>继续扩展检索</h3>
      <div class="keyword-list">
        ${keywords.slice(0, 12).map(keyword => `<span class="keyword-item">${safeText(keyword)}</span>`).join("")}
      </div>
      <a class="link-btn" href="${safeAttr(pubmedUrl)}" target="_blank" rel="noopener noreferrer">PubMed 扩展检索</a>
      <a class="link-btn" href="${safeAttr(scholarUrl)}" target="_blank" rel="noopener noreferrer">Google Scholar 扩展检索</a>
    </div>
  `;
}

function buildPatientLiteratureContext(stage, amyloid, risks, conditionText, extra) {
  const normalizedText = `${stage} ${amyloid} ${risks.join(" ")} ${conditionText} ${extra}`.toLowerCase();

  return {
    stage,
    stageGroup: getStageGroup(stage),
    amyloid,
    risks,
    conditionText,
    extra,
    normalizedText,
    topicTags: inferTopicTags(normalizedText)
  };
}

function getStageGroup(stage) {
  if (!stage) {
    return "unspecified";
  }

  if (stage.includes("极轻度") || stage.includes("早期")) {
    return "early";
  }

  if (stage.includes("轻度") && !stage.includes("极轻度")) {
    return "mild";
  }

  if (stage.includes("中度")) {
    return "moderate";
  }

  if (stage.includes("重度")) {
    return "severe";
  }

  return "unspecified";
}

function matchesStageText(sourceStage, selectedStage) {
  const source = String(sourceStage || "").trim();
  const selected = String(selectedStage || "").trim();

  if (!source || !selected) {
    return false;
  }

  if (source === selected) {
    return true;
  }

  if (source.includes("任何") || source.includes("任意") || source.includes("全部") || source.includes("全程")) {
    return true;
  }

  const selectedGroup = getStageGroup(selected);
  const tokens = source
    .split(/[；;、,，/]+/)
    .map(token => token.trim())
    .filter(Boolean);

  return tokens.some(token => {
    return token === selected || (selectedGroup !== "unspecified" && getStageGroup(token) === selectedGroup);
  });
}

function inferTopicTags(text) {
  const tags = [];

  if (text.includes("跌倒")) tags.push("跌倒");
  if (text.includes("睡眠")) tags.push("睡眠");
  if (text.includes("照护") || text.includes("家属")) tags.push("照护");
  if (text.includes("行为") || text.includes("激越") || text.includes("走失")) tags.push("行为症状");
  if (text.includes("吞咽") || text.includes("营养") || text.includes("压疮")) tags.push("照护");

  return tags;
}

function buildPatientProfileItems(context) {
  const items = [];

  if (context.stage) {
    items.push(`分期：${context.stage}`);
  }

  if (context.amyloid) {
    items.push(`Aβ：${context.amyloid}`);
  }

  context.risks.forEach(risk => items.push(`风险：${risk}`));
  context.topicTags.forEach(tag => items.push(`主题：${tag}`));

  if (items.length === 0) {
    items.push("按疾病描述推荐");
  }

  return items;
}

function getLiteratureRecommendations(context) {
  const scored = LITERATURE_LIBRARY.map(article => {
    const match = scoreLiterature(article, context);

    return {
      ...article,
      score: match.score,
      matchReasons: match.reasons
    };
  })
    .filter(article => article.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }

      return Number.parseInt(b.year, 10) - Number.parseInt(a.year, 10);
    });

  if (scored.length > 0) {
    return scored.slice(0, 8);
  }

  return LITERATURE_LIBRARY
    .filter(article => article.stageGroups.includes("all") || article.id === "nice-ta217")
    .map(article => ({
      ...article,
      score: article.priority,
      matchReasons: ["作为治疗决策的基础参考资料"]
    }))
    .slice(0, 5);
}

function scoreLiterature(article, context) {
  let score = 0;
  const reasons = [];
  const stageExact = article.stageGroups.includes(context.stageGroup);
  const stageAll = article.stageGroups.includes("all");
  const stageSpecified = context.stageGroup !== "unspecified";
  const amyloidSpecific = !article.amyloidStatuses.includes("any");

  if (context.amyloid === "阴性" && amyloidSpecific && !article.amyloidStatuses.includes("阴性")) {
    return {
      score: -1,
      reasons: []
    };
  }

  if (stageSpecified && stageExact) {
    score += 5;
    pushUnique(reasons, `匹配${context.stage}阶段`);
  } else if (stageSpecified && stageAll) {
    score += 2;
    pushUnique(reasons, "适用于AD全病程管理");
  } else if (!stageSpecified && stageAll) {
    score += 1;
  }

  const amyloidCanMatch = !stageSpecified || stageExact || stageAll;

  if (context.amyloid === "阳性" && amyloidCanMatch && article.amyloidStatuses.includes("阳性")) {
    score += 4;
    pushUnique(reasons, "匹配Aβ阳性和抗Aβ治疗判断");
  } else if ((context.amyloid === "未知" || context.amyloid === "未检测") && amyloidCanMatch && article.amyloidStatuses.includes(context.amyloid)) {
    score += 1;
    pushUnique(reasons, "可用于完善Aβ治疗前筛选");
  } else if (amyloidCanMatch && article.amyloidStatuses.includes("any")) {
    score += 1;
  }

  context.risks.forEach(risk => {
    if (article.riskTags.includes(risk)) {
      score += 4;
      pushUnique(reasons, `匹配风险因素：${risk}`);
    }
  });

  context.topicTags.forEach(tag => {
    if (article.riskTags.includes(tag)) {
      score += 3;
      pushUnique(reasons, `匹配关注主题：${tag}`);
    }
  });

  const triggerMatches = article.textTriggers.filter(trigger => {
    return context.normalizedText.includes(trigger.toLowerCase());
  });

  triggerMatches.slice(0, 3).forEach(trigger => {
    score += 2;
    pushUnique(reasons, `描述中提到：${trigger}`);
  });

  if (stageSpecified && !stageExact && !stageAll) {
    score -= 2;
  }

  if (score > 0 && reasons.length === 0) {
    pushUnique(reasons, "作为当前主题的基础参考资料");
  }

  return {
    score,
    reasons
  };
}

function renderLiteratureCard(article) {
  const primaryLink = getPrimaryLiteratureLink(article);
  const visibleLinks = article.links.filter(link => !link.hidden);
  const actionsHtml = visibleLinks.length
    ? `
      <div class="literature-actions">
        ${visibleLinks.map(link => `
          <a class="link-btn literature-link" href="${safeAttr(link.url)}" target="_blank" rel="noopener noreferrer">
            ${safeText(link.label)}
          </a>
        `).join("")}
      </div>
    `
    : "";

  return `
    <article class="literature-card">
      <div class="literature-card-top">
        <span class="literature-type">${safeText(article.evidenceType)}</span>
        <span class="literature-source">${safeText(article.source)} · ${safeText(article.year)}</span>
      </div>
      <h3>
        <a href="${safeAttr(primaryLink.url)}" target="_blank" rel="noopener noreferrer">
          ${safeText(article.title)}
        </a>
      </h3>
      <p>${safeText(article.summary)}</p>
      <div class="match-reasons">
        ${article.matchReasons.map(reason => `<span>${safeText(reason)}</span>`).join("")}
      </div>
      <div class="literature-use">
        <strong>推荐阅读重点</strong>
        <p>${safeText(article.clinicalUse)}</p>
      </div>
      ${actionsHtml}
    </article>
  `;
}

function getPrimaryLiteratureLink(article) {
  return article.links[0] || {
    label: "阅读",
    url: "#"
  };
}

function pushUnique(items, value) {
  if (!items.includes(value)) {
    items.push(value);
  }
}

function buildSearchKeywords(stage, amyloid, risks, conditionText, extra) {
  const keywords = new Set();

  keywords.add("Alzheimer disease");
  keywords.add("treatment guideline");
  keywords.add("clinical practice guideline");

  if (stage) {
    keywords.add(stage);

    const stageEnglish = mapStageToEnglish(stage);
    stageEnglish.forEach(item => keywords.add(item));
  }

  if (amyloid === "阳性") {
    keywords.add("amyloid beta positive");
    keywords.add("anti-amyloid monoclonal antibody");
    keywords.add("lecanemab");
    keywords.add("donanemab");
    keywords.add("ARIA");
  }

  if (amyloid === "阴性") {
    keywords.add("amyloid negative");
    keywords.add("differential diagnosis");
  }

  risks.forEach(risk => {
    keywords.add(risk);

    const riskEnglish = mapRiskToEnglish(risk);
    riskEnglish.forEach(item => keywords.add(item));
  });

  const freeText = `${conditionText} ${extra}`;

  if (freeText.includes("睡眠")) keywords.add("sleep disturbance");
  if (freeText.includes("跌倒")) keywords.add("fall risk");
  if (freeText.includes("照护")) keywords.add("caregiver support");
  if (freeText.includes("激越") || freeText.includes("行为")) keywords.add("behavioral and psychological symptoms of dementia");
  if (freeText.includes("记忆")) keywords.add("cognitive decline");

  return Array.from(keywords);
}

function mapStageToEnglish(stage) {
  const result = [];

  if (stage.includes("极轻度")) {
    result.push("very mild Alzheimer disease");
    result.push("early Alzheimer disease");
    result.push("mild cognitive impairment due to Alzheimer disease");
  }

  if (stage.includes("轻度") && !stage.includes("极轻度")) {
    result.push("mild Alzheimer disease");
    result.push("mild dementia due to Alzheimer disease");
  }

  if (stage.includes("中度")) {
    result.push("moderate Alzheimer disease");
    result.push("moderate dementia due to Alzheimer disease");
    result.push("memantine");
  }

  if (stage.includes("重度")) {
    result.push("severe Alzheimer disease");
    result.push("severe dementia due to Alzheimer disease");
    result.push("palliative care");
    result.push("long-term care");
  }

  return result;
}

function mapRiskToEnglish(risk) {
  const result = [];

  if (risk.includes("MRI")) {
    result.push("MRI risk");
    result.push("amyloid related imaging abnormalities");
    result.push("ARIA-E");
    result.push("ARIA-H");
  }

  if (risk.includes("抗凝")) {
    result.push("anticoagulant");
    result.push("intracerebral hemorrhage risk");
  }

  if (risk.includes("脑出血")) {
    result.push("cerebral hemorrhage");
    result.push("microhemorrhage");
  }

  if (risk.includes("癫痫")) {
    result.push("seizure");
  }

  if (risk.includes("心动过缓")) {
    result.push("bradycardia");
    result.push("cholinesterase inhibitor adverse effects");
  }

  if (risk.includes("胃肠道")) {
    result.push("gastrointestinal adverse events");
    result.push("donepezil adverse effects");
  }

  if (risk.includes("肝肾")) {
    result.push("renal impairment");
    result.push("hepatic impairment");
    result.push("dose adjustment");
  }

  return result;
}

function buildPubMedQuery(keywords) {
  const mainTerms = [];

  const preferred = [
    "Alzheimer disease",
    "treatment guideline",
    "clinical practice guideline",
    "anti-amyloid monoclonal antibody",
    "lecanemab",
    "donanemab",
    "ARIA",
    "cholinesterase inhibitor",
    "memantine",
    "mild Alzheimer disease",
    "moderate Alzheimer disease",
    "severe Alzheimer disease"
  ];

  preferred.forEach(term => {
    if (keywords.includes(term)) {
      mainTerms.push(term);
    }
  });

  keywords.forEach(term => {
    if (mainTerms.length < 12 && !mainTerms.includes(term) && /^[a-zA-Z0-9 -]+$/.test(term)) {
      mainTerms.push(term);
    }
  });

  return mainTerms.join(" AND ");
}

function getSelectedRisks() {
  const checked = document.querySelectorAll(".checkbox-group input:checked");
  return Array.from(checked).map(item => item.value);
}

function resetForm() {
  clearFormWarning();

  document.getElementById("stageSelect").value = "";
  document.getElementById("amyloidSelect").value = "未知";
  document.getElementById("conditionInput").value = "";
  document.getElementById("extraInput").value = "";

  document.querySelectorAll(".checkbox-group input").forEach(input => {
    input.checked = false;
  });

  document.getElementById("mainResult").innerHTML = "请先选择患者 AD 分期，然后点击“生成治疗建议”。";
  document.getElementById("drugResult").innerHTML = "暂无药物信息。";
  document.getElementById("warningResult").innerHTML = "暂无风险提醒。";
  document.getElementById("knowledgeResult").innerHTML = DEFAULT_LITERATURE_EMPTY_TEXT;
}

function renderField(label, value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return "";
  }

  return `<p><span class="badge">${safeText(label)}</span>${safeText(value)}</p>`;
}

function getValue(id) {
  return document.getElementById(id).value.trim();
}

function safeText(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeAttr(value) {
  return safeText(value);
}
