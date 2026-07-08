const API_URL = "/api/ad/predict";

const fieldAliases = {
  age: ["age", "年龄", "NACCAGE"],
  sex: ["sex", "性别", "SEX"],
  educ: ["educ", "教育年限", "EDUC"],
  mmse: ["mmse", "MMSE", "MMSE总分", "NACCMMSE"],
  moca: ["moca", "MoCA", "MOCA", "MoCA总分", "NACCMOCA", "MOCATOTS"],
  animals: ["animals", "动物命名", "ANIMALS"],
  trailb: ["trailb", "TrailB", "TRAILB"],
  memory_score: ["memory_score", "记忆测验", "记忆测验得分", "CRAFTDVR", "CRAFTDRE", "LOGIMEM"],
  faq_sum: ["faq_sum", "ADL", "FAQ", "FAQ_SUM", "ADL/FAQ总分"],
  npi_symptom_sum: ["npi_symptom_sum", "NPI症状总数", "NPI_SYMPTOM_SUM"],
  npi_severity_sum: ["npi_severity_sum", "NPI严重程度总分", "NPI_SEVERITY_SUM"],
  depression: ["depression", "抑郁", "DEP"],
  apoe4: ["apoe4", "APOE", "APOEε4", "NACCNE4S"],
  abeta42: ["abeta42", "Aβ42", "ABETA42", "NACCACSF", "AMYLCSF"],
  total_tau: ["total_tau", "tau", "total tau", "NACCTCSF", "CSFTAU"],
  p_tau: ["p_tau", "p-tau", "ptau", "NACCPCSF", "NPTAU", "NPTAUHAP"],
  thyroid: ["thyroid", "甲状腺异常", "THYROID", "THYDIS"],
  b12_def: ["b12_def", "维生素B12缺乏", "B12DEF", "VB12DEF"],
  diabetes: ["diabetes", "糖尿病", "DIABETES"],
  hypertension: ["hypertension", "高血压", "HYPERTEN"],
  hypercholesterol: ["hypercholesterol", "高胆固醇", "HYPERCHO"],
  stroke_tia: ["stroke_tia", "卒中/TIA", "STROKE", "CBSTROKE", "TIA"],
  bmi: ["bmi", "BMI", "NACCBMI"],
  bpsys: ["bpsys", "收缩压", "BPSYS"],
  bpdias: ["bpdias", "舒张压", "BPDIAS"],
  family_history: ["family_history", "痴呆家族史", "NACCFAM"]
};

const frontendToModelFields = {
  age: ["NACCAGE"],
  sex: ["SEX"],
  educ: ["EDUC"],
  mmse: ["NACCMMSE"],
  moca: ["NACCMOCA", "MOCATOTS"],
  animals: ["ANIMALS"],
  trailb: ["TRAILB"],
  memory_score: ["CRAFTDVR", "CRAFTDRE", "LOGIMEM"],
  faq_sum: ["FAQ_SUM"],
  npi_symptom_sum: ["NPI_SYMPTOM_SUM"],
  npi_severity_sum: ["NPI_SEVERITY_SUM"],
  depression: ["DEP"],
  apoe4: ["NACCNE4S"],
  abeta42: ["NACCACSF", "AMYLCSF"],
  total_tau: ["NACCTCSF", "CSFTAU"],
  p_tau: ["NACCPCSF", "NPTAU", "NPTAUHAP"],
  thyroid: ["THYROID", "THYDIS"],
  b12_def: ["B12DEF", "VB12DEF"],
  diabetes: ["DIABETES"],
  hypertension: ["HYPERTEN"],
  hypercholesterol: ["HYPERCHO"],
  stroke_tia: ["STROKE", "CBSTROKE"],
  bmi: ["NACCBMI"],
  bpsys: ["BPSYS"],
  bpdias: ["BPDIAS"],
  family_history: ["NACCFAM"]
};

const example = {
  age: 74,
  sex: "2",
  educ: 12,
  mmse: 22,
  moca: 18,
  animals: 11,
  trailb: 165,
  memory_score: 5.5,
  faq_sum: 10,
  npi_symptom_sum: 3,
  npi_severity_sum: 6,
  depression: "1",
  apoe4: "1",
  abeta42: "",
  total_tau: "",
  p_tau: "",
  thyroid: "0",
  b12_def: "0",
  diabetes: "1",
  hypertension: "1",
  hypercholesterol: "1",
  stroke_tia: "0",
  bmi: 25.8,
  bpsys: 142,
  bpdias: 84,
  family_history: "1"
};

document.addEventListener("DOMContentLoaded", () => {
  bindTabs();
  bindForm();
  bindUpload();

  const startBtn = document.getElementById("startBtn");
  const exampleBtn = document.getElementById("exampleBtn");

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      document.getElementById("formArea")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  if (exampleBtn) {
    exampleBtn.addEventListener("click", () => {
      fillForm(example);
      document.getElementById("formArea")?.scrollIntoView({ behavior: "smooth" });
    });
  }
});

function bindTabs() {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab)?.classList.add("active");
    });
  });
}

function bindForm() {
  const form = document.getElementById("patientForm");
  const resetBtn = document.getElementById("resetBtn");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await predict(readForm(), "manual");
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      form.reset();
      resetResult();
    });
  }
}

function readForm() {
  const data = {};
  new FormData(document.getElementById("patientForm")).forEach((value, key) => {
    data[key] = normalizeValue(value);
  });
  return data;
}

function normalizeValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? String(value).trim() : numeric;
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== "";
}

function fillForm(values) {
  const form = document.getElementById("patientForm");
  if (!form) return;
  Object.entries(values).forEach(([key, value]) => {
    if (form.elements[key]) {
      form.elements[key].value = value;
    }
  });
}

function bindUpload() {
  const input = document.getElementById("csvInput");
  const chooseBtn = document.getElementById("chooseCsvBtn");
  const dropZone = document.getElementById("dropZone");
  if (!input || !chooseBtn || !dropZone) return;

  chooseBtn.addEventListener("click", () => input.click());
  input.addEventListener("change", (event) => {
    if (event.target.files[0]) handleCsv(event.target.files[0]);
  });

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
    if (event.dataTransfer.files[0]) handleCsv(event.dataTransfer.files[0]);
  });
}

function handleCsv(file) {
  const reader = new FileReader();

  reader.onload = async (event) => {
    const rows = parseCsv(event.target.result);
    if (rows.length < 2) {
      alert("CSV 至少需要表头和一行患者数据");
      return;
    }

    const headers = rows[0].map((item) => item.trim());
    const values = rows[1];
    const raw = {};
    headers.forEach((header, index) => {
      raw[header] = values[index];
    });

    const features = mapRow(raw);
    previewCsv(headers, rows.slice(1, Math.min(rows.length, 6)));
    await predict(features, "csv");
  };

  reader.readAsText(file, "UTF-8");
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index];
    const next = text[index + 1];

    if (ch === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === "," && !quoted) {
      row.push(current.trim());
      current = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (current !== "" || row.length) {
        row.push(current.trim());
        rows.push(row);
        row = [];
        current = "";
      }
      if (ch === "\r" && next === "\n") index += 1;
    } else {
      current += ch;
    }
  }

  if (current !== "" || row.length) {
    row.push(current.trim());
    rows.push(row);
  }

  return rows.filter((items) => items.some((item) => item !== ""));
}

function mapRow(raw) {
  const out = {};

  // 保留 CSV 原始字段名；如果 CSV 直接使用 NACC 字段，后端可以直接识别。
  Object.entries(raw).forEach(([key, value]) => {
    const cleanKey = String(key).trim();
    if (cleanKey) out[cleanKey] = normalizeValue(value);
  });

  // 同时生成页面表单字段，便于兼容中文表头和简写表头。
  Object.entries(fieldAliases).forEach(([key, names]) => {
    let value = null;
    for (const name of names) {
      if (Object.prototype.hasOwnProperty.call(raw, name)) {
        value = raw[name];
        break;
      }
    }
    if (hasValue(value)) out[key] = normalizeValue(value);
  });

  return out;
}

function toModelFeatures(features) {
  const out = {};

  // 先保留原始字段，使 NACC 原始表头不会丢失。
  Object.entries(features).forEach(([key, value]) => {
    if (hasValue(value)) out[key] = normalizeValue(value);
  });

  // 再把前端字段映射为模型训练字段。
  Object.entries(frontendToModelFields).forEach(([frontKey, modelKeys]) => {
    const value = features[frontKey];
    if (!hasValue(value)) return;
    modelKeys.forEach((modelKey) => {
      if (!hasValue(out[modelKey])) out[modelKey] = normalizeValue(value);
    });
  });

  return out;
}

function previewCsv(headers, rows) {
  const preview = document.getElementById("uploadPreview");
  if (!preview) return;
  const headHtml = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const bodyHtml = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");

  preview.innerHTML = `
    <strong>已读取 CSV，当前使用第一位患者进行预测：</strong>
    <table>
      <thead><tr>${headHtml}</tr></thead>
      <tbody>${bodyHtml}</tbody>
    </table>`;
  preview.classList.remove("hidden");
}

async function predict(features, source) {
  setLoading(true);
  const modelFeatures = toModelFeatures(features);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features: modelFeatures, source })
    });

    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const err = await response.json();
        message = err.detail || message;
      } catch (_) {
        message = await response.text();
      }
      throw new Error(message);
    }

    const result = await response.json();
    result._mode = "api";
    renderResult(result);
  } catch (error) {
    resetResult();
    alert(`真实模型接口调用失败：${error.message || error}\n\n请确认已经在项目根目录运行：python -m uvicorn backend.app:app --reload --port 8000`);
  } finally {
    setLoading(false);
  }
}

function renderResult(result) {
  const risk = normalizeRisk(result.risk_probability);
  const percentage = Math.round(risk * 100);
  const card = document.getElementById("riskCard");

  document.getElementById("emptyState")?.classList.add("hidden");
  document.getElementById("result")?.classList.remove("hidden");

  if (card) card.className = `risk ${percentage < 30 ? "low" : percentage < 70 ? "medium" : "high"}`;
  setText("riskProbability", `${percentage}%`);
  setText("riskLevel", result.risk_level || "--");
  const riskBar = document.getElementById("riskBar");
  if (riskBar) riskBar.style.width = `${percentage}%`;
  setText("binaryPrediction", result.binary_prediction || "--");
  setText("cognitiveState", result.cognitive_state || "--");
  setText("severityStage", result.severity_stage || "--");
  setText("diagnosisSummary", result.diagnosis_summary || "--");

  const list = document.getElementById("factorList");
  if (list) {
    list.innerHTML = "";
    const factors = result.factors || result.key_factors || [];
    factors.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
  }

  const modelStatus = document.getElementById("modelStatus");
  if (modelStatus) {
    modelStatus.textContent = "真实模型已连接";
    modelStatus.className = "clinical-tag";
  }
  setText("noticeText", "该结果由后端 FastAPI 接口加载 model_bundle.joblib 后返回，当前页面未使用前端演示逻辑。结果用于医生端辅助分析。按照实际临床场景，仍需结合病史、查体、影像和实验室检查综合判断。");
}

function normalizeRisk(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return 0;
  if (number > 1) return Math.min(number / 100, 1);
  return Math.min(Math.max(number, 0), 1);
}

function resetResult() {
  document.getElementById("emptyState")?.classList.remove("hidden");
  document.getElementById("result")?.classList.add("hidden");
  const modelStatus = document.getElementById("modelStatus");
  if (modelStatus) {
    modelStatus.textContent = "等待输入";
    modelStatus.className = "clinical-tag muted";
  }
}

function setLoading(isLoading) {
  document.querySelectorAll("button").forEach((button) => {
    button.disabled = isLoading;
    button.style.opacity = isLoading ? "0.72" : "1";
  });

  const modelStatus = document.getElementById("modelStatus");
  if (isLoading && modelStatus) {
    modelStatus.textContent = "正在调用真实模型";
    modelStatus.className = "clinical-tag";
  }
}

function setText(id, text) {
  const element = document.getElementById(id);
  if (element) element.textContent = text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
