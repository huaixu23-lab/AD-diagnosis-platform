const EXCEL_FILE_NAME = "AD治疗建议数据表_简化版.xlsx";

let appData = {
  stage_plan: [],
  drug_reference: [],
  recommendation_rules: [],
  risk_warning_rules: [],
  sources: []
};

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  await loadBuiltInExcel();
});

function bindEvents() {
  document.getElementById("generateBtn").addEventListener("click", generateAdvice);
  document.getElementById("knowledgeBtn").addEventListener("click", generateKnowledgeSearch);
  document.getElementById("resetBtn").addEventListener("click", resetForm);
}

async function loadBuiltInExcel() {
  const status = document.getElementById("dataStatus");
  const stageSelect = document.getElementById("stageSelect");

  try {
    status.textContent = `正在读取内置数据表：${EXCEL_FILE_NAME}`;

    const response = await fetch(encodeURI(`./${EXCEL_FILE_NAME}`));

    if (!response.ok) {
      throw new Error("没有找到数据表文件");
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

    status.className = "file-status success";
    status.textContent = `已成功读取内置数据表：${EXCEL_FILE_NAME}`;
  } catch (error) {
    console.error(error);

    status.className = "file-status error";
    status.innerHTML = `
      读取数据表失败。请确认以下几点：<br>
      1. ${EXCEL_FILE_NAME} 和 index.html 在同一个文件夹下；<br>
      2. 用 VSCode 的 Live Server 打开网页，不要直接双击 index.html；<br>
      3. xlsx 里包含 stage_plan、drug_reference、recommendation_rules、risk_warning_rules、sources 这几张 sheet。
    `;

    stageSelect.innerHTML = `<option value="">数据表读取失败</option>`;
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

  const stages = new Set();

  appData.stage_plan.forEach(item => {
    if (item.stage_name) {
      stages.add(String(item.stage_name).trim());
    }
  });

  appData.recommendation_rules.forEach(item => {
    if (item.stage_name) {
      stages.add(String(item.stage_name).trim());
    }
  });

  if (stages.size === 0) {
    stageSelect.innerHTML = `<option value="">数据表中暂无 AD 分期</option>`;
    return;
  }

  stages.forEach(stage => {
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
    alert("请先选择 AD 分期。");
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

    const stageMatch = ruleStage === stage;

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
        ${renderField("药物思路", stageInfo.drug_strategy)}
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

  html += `
    <div class="result-block">
      <h3>输入信息汇总</h3>
      ${renderField("AD分期", stage)}
      ${renderField("Aβ状态", amyloid)}
      ${renderField("风险因素", risks.length ? risks.join("；") : "未选择明显风险因素")}
      ${renderField("疾病情况描述", conditionText)}
      ${renderField("补充信息", extra)}
    </div>
  `;

  if (!stageInfo && matchedRules.length === 0) {
    html = `
      <div class="empty-result">
        当前数据表中没有匹配到该分期的治疗建议。请检查 stage_plan 或 recommendation_rules 表中是否录入了对应分期。
      </div>
    `;
  }

  container.innerHTML = html;
}

function renderDrugAdvice(stage, amyloid) {
  const container = document.getElementById("drugResult");

  const drugs = appData.drug_reference.filter(drug => {
    const applicable = String(drug.applicable_stage || "");
    const stageMatch = applicable.includes(stage);

    const amyloidRequired = String(drug.amyloid_required || "").trim();

    const amyloidMatch =
      amyloidRequired !== "是" ||
      amyloid === "阳性";

    return stageMatch && amyloidMatch;
  });

  if (drugs.length === 0) {
    container.innerHTML = `
      <div class="empty-result">
        当前分期下暂无匹配药物。请检查 drug_reference 表中的 applicable_stage 和 amyloid_required 字段。
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
        已选择风险因素，但数据表中暂无对应风险提醒。可以在 risk_warning_rules 表中补充规则。
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
    alert("请至少选择 AD 分期，或者填写疾病情况描述。");
    return;
  }

  const keywords = buildSearchKeywords(stage, amyloid, risks, conditionText, extra);
  const pubmedQuery = buildPubMedQuery(keywords);
  const llmPrompt = buildLLMPrompt(stage, amyloid, risks, conditionText, extra, keywords);

  const pubmedUrl = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(pubmedQuery)}`;
  const scholarUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(pubmedQuery)}`;

  container.innerHTML = `
    <div class="result-block">
      <h3>自动生成的检索关键词</h3>
      <div class="keyword-list">
        ${keywords.map(keyword => `<span class="keyword-item">${safeText(keyword)}</span>`).join("")}
      </div>
      <p class="small-text">
        这些关键词是根据 AD 分期、Aβ 状态、风险因素和补充描述自动组合出来的，可用于检索相关医学文献。
      </p>
    </div>

    <div class="result-block">
      <h3>文献检索入口</h3>
      <a class="link-btn" href="${safeAttr(pubmedUrl)}" target="_blank">打开 PubMed 检索</a>
      <a class="link-btn" href="${safeAttr(scholarUrl)}" target="_blank">打开 Google Scholar 检索</a>
      <p class="small-text">
        PubMed 更适合检索医学文献，Google Scholar 覆盖范围更广。正式汇报时建议优先使用 PubMed、指南、药品说明书和权威数据库。
      </p>
    </div>

    <div class="result-block">
      <h3>可复制给 LLM 的知识获取提示词</h3>
      <div id="promptBox" class="prompt-box">${safeText(llmPrompt)}</div>
      <button class="copy-btn" onclick="copyPrompt()">复制提示词</button>
      <p class="small-text">
        这个提示词可以复制到 ChatGPT、DeepSeek、通义千问等大模型中，让它根据输入情况辅助整理文献、治疗依据和风险提醒。
      </p>
    </div>

    <div class="result-block">
      <h3>建议关注的问题</h3>
      <p>1. 当前分期是否适合对症药物治疗，例如胆碱酯酶抑制剂或美金刚。</p>
      <p>2. 如果 Aβ 阳性，是否存在抗 Aβ 单抗相关适应证和禁忌风险。</p>
      <p>3. 是否存在 MRI 高风险、脑出血史、抗凝用药等需要重点排查的问题。</p>
      <p>4. 是否需要补充非药物干预、照护支持和长期随访管理。</p>
    </div>
  `;
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

function buildLLMPrompt(stage, amyloid, risks, conditionText, extra, keywords) {
  return `你是一名医学信息检索与循证医学助手。请根据下面的阿尔茨海默病患者情况，帮助我检索和整理相关文献依据。注意：请优先参考近五年的指南、共识、系统综述、临床试验和权威药品说明书；请区分“诊断依据”“治疗建议”“用药风险”“非药物干预”和“随访监测”。

【患者/疾病情况】
AD分期：${stage || "未填写"}
Aβ病理状态：${amyloid || "未知"}
风险因素/合并情况：${risks.length ? risks.join("；") : "未选择"}
疾病情况描述：${conditionText || "未填写"}
其他补充信息：${extra || "未填写"}

【建议检索关键词】
${keywords.join("；")}

【请你输出以下内容】
1. 这个分期的 AD 通常有哪些治疗目标？
2. 可参考哪些药物治疗方向？分别适合哪些阶段？
3. 如果 Aβ 阳性，是否需要考虑抗 Aβ 单抗？需要满足哪些前提？
4. 当前风险因素会影响哪些治疗选择？
5. 需要关注哪些 MRI 风险、出血风险、心率风险、胃肠道不良反应或肝肾功能问题？
6. 有哪些非药物干预和照护建议？
7. 请给出可用于课程报告的文献依据摘要，并列出文献题名、年份、研究类型和主要结论。
8. 请明确说明哪些内容属于临床指南建议，哪些只是文献研究发现，哪些不能直接作为处方依据。`;
}

async function copyPrompt() {
  const promptBox = document.getElementById("promptBox");

  if (!promptBox) {
    return;
  }

  const text = promptBox.innerText;

  try {
    await navigator.clipboard.writeText(text);
    alert("提示词已复制。");
  } catch (error) {
    console.error(error);
    alert("复制失败，可以手动选中文字复制。");
  }
}

function getSelectedRisks() {
  const checked = document.querySelectorAll(".checkbox-group input:checked");
  return Array.from(checked).map(item => item.value);
}

function resetForm() {
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
  document.getElementById("knowledgeResult").innerHTML = "点击“生成 LLM 知识检索”后，系统会根据输入情况生成检索关键词、文献检索入口和可复制给大模型的提示词。";
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