(function () {
  const analyzeBtn = document.getElementById("analyzeBtn");
  const resetBtn = document.getElementById("resetBtn");
  const resultPanel = document.getElementById("resultPanel");
  const dataConfig = window.AD_BASIC_DIAGNOSIS_CONFIG || { DATA_PATH: "../../backend/", DATA_FILES: {} };

  const domainLabels = {
    memory_impairment: "记忆功能异常",
    executive_dysfunction: "执行功能相关表现",
    language_impairment: "语言功能相关表现",
    visuospatial_impairment: "视觉空间能力相关表现",
    behavioral_symptoms: "行为精神表现改变"
  };

  const domainFocus = {
    memory_impairment: "情景记忆功能",
    executive_dysfunction: "计划、组织及复杂任务处理能力",
    language_impairment: "语言表达与理解能力",
    visuospatial_impairment: "定向、路线识别及空间判断能力",
    behavioral_symptoms: "情绪、行为及兴趣水平"
  };

  function getCheckedValues(selector) {
    return Array.from(document.querySelectorAll(selector))
      .filter((input) => input.checked)
      .map((input) => input.value);
  }

  function getSelectedDomains() {
    return Array.from(document.querySelectorAll(".symptom-card[data-domain]"))
      .filter((card) => card.dataset.domain !== "functional_decline")
      .map((card) => {
        const symptoms = Array.from(card.querySelectorAll("input[type='checkbox']:checked"))
          .map((input) => input.value);

        return {
          key: card.dataset.domain,
          label: domainLabels[card.dataset.domain],
          focus: domainFocus[card.dataset.domain],
          symptoms
        };
      })
      .filter((domain) => domain.symptoms.length > 0);
  }

  function getFunctionalDecline() {
    const selected = document.querySelector("input[name='functionalDecline']:checked");
    return {
      level: selected ? Number(selected.value) : 0,
      text: selected ? selected.dataset.text : "无明显功能影响"
    };
  }

  function joinChinese(items, fallback) {
    if (!items.length) {
      return fallback;
    }

    if (items.length === 1) {
      return items[0];
    }

    return items.slice(0, -1).join("、") + "及" + items[items.length - 1];
  }

  function buildSummary(domains, functionalDecline) {
    if (!domains.length) {
      return "当前尚未勾选明确认知症状，建议结合病史访谈、家属补充信息及标准化量表继续完善临床资料。";
    }

    const leadingDomain = domains[0];
    const leadingSymptoms = leadingDomain.symptoms.slice(0, 3);
    const functionalText = functionalDecline.level > 0
      ? "，并伴有" + functionalDecline.text
      : "，目前未见明显日常功能影响";

    return "患者目前主要表现为" + joinChinese(leadingSymptoms, "认知变化") + "，提示以" + leadingDomain.focus + "相关表现为主要临床特点" + functionalText + "。";
  }

  function buildDomainAnalysis(domains) {
    if (!domains.length) {
      return "当前录入信息不足以归纳主要受累认知领域，可优先补充记忆、执行、语言及视觉空间相关表现。";
    }

    const primary = domains[0].label;
    const possible = domains.slice(1).map((domain) => domain.label);
    const possibleText = possible.length
      ? "可能涉及领域：" + joinChinese(possible, "伴随领域") + "。"
      : "可能涉及领域：暂未见明确伴随认知领域线索。";

    return "主要受累领域：" + primary + "。\n" + possibleText + "\n尚需进一步评估：建议结合MoCA、MMSE或神经心理测评明确各认知领域受影响程度。";
  }

  function buildPattern(domains, onset, redFlags) {
    const hasMemory = domains.some((domain) => domain.key === "memory_impairment");
    const hasMultipleDomains = domains.length >= 2;
    const hasSuddenOnset = onset === "突然出现";

    if (hasSuddenOnset || redFlags.includes("卒中相关病史")) {
      return "AD相关临床模式分析：当前存在突然出现或卒中相关线索，需重点关注血管性认知障碍等鉴别方向，并结合影像学和病史进一步判断。";
    }

    if (hasMemory && hasMultipleDomains) {
      return "AD相关临床模式分析：当前表现与记忆主导并累及多个认知领域的AD相关认知改变方向存在一定一致性，需要结合客观认知评估及辅助检查综合判断。";
    }

    if (hasMemory) {
      return "AD相关临床模式分析：当前表现以记忆功能异常为主，提示记忆主导型AD相关认知改变方向，建议进一步评估。";
    }

    return "AD相关临床模式分析：当前表现并非典型记忆主导模式，建议结合完整病史、量表结果和影像学信息进行综合辅助评估。";
  }

  function buildStage(functionalDecline, course) {
    if (functionalDecline.level === 0) {
      return "疾病阶段辅助评估：目前日常功能影响不明显，如客观认知评估提示下降，可考虑AD相关早期认知改变评估范围。";
    }

    if (functionalDecline.level === 1 || functionalDecline.level === 2) {
      return "疾病阶段辅助评估：根据当前认知表现和功能影响程度，患者情况可能接近AD相关轻度认知障碍评估范围；病程" + (course || "尚未填写") + "可作为纵向变化参考。";
    }

    return "疾病阶段辅助评估：当前基本生活活动已受影响，建议进一步评估认知改变程度、照护需求及共病因素。";
  }

  function buildDifferential(redFlags, onset, domains) {
    const directions = [];

    if (redFlags.includes("卒中相关病史") || onset === "突然出现") {
      directions.push("血管性认知障碍");
    }

    if (redFlags.includes("明显行为改变") || domains.some((domain) => domain.key === "behavioral_symptoms")) {
      directions.push("额颞叶痴呆");
    }

    if (redFlags.includes("视觉幻觉")) {
      directions.push("路易体相关认知障碍");
    }

    if (redFlags.includes("快速认知下降")) {
      directions.push("快速进展性认知障碍相关病因");
    }

    if (redFlags.includes("意识波动")) {
      directions.push("谵妄或路易体相关认知障碍");
    }

    if (!directions.length) {
      directions.push("血管性认知障碍", "额颞叶痴呆等情况");
    }

    return "需要关注的鉴别方向：" + joinChinese(directions, "其他认知障碍情况") + "。建议结合起病方式、进展速度、临床提示和辅助检查进一步评估。";
  }

  function buildExamAdvice() {
    return "第一步：认知功能评估\n内容：MoCA、MMSE、神经心理评估。\n目的：明确认知下降程度及主要受累领域。\n第二步：结构及病因评估\n内容：MRI、基础实验室检查。\n目的：评估脑结构变化，并辅助排除其他原因。\n第三步：AD病理证据评估\n内容：血液标志物、脑脊液检测、PET。\n目的：在需要进一步明确AD相关病理改变时考虑。";
  }

  function buildClinicalSummaryCard(domains, functionalDecline) {
    const presentation = domains.length
      ? "患者目前主要表现为" + joinChinese(domains[0].symptoms.slice(0, 3), "认知变化") + "。"
      : "当前录入信息尚不足以形成稳定临床表现摘要。";
    const domain = domains.length
      ? "当前主要关注" + domains[0].focus + "。"
      : "当前主要受累领域仍需补充信息后判断。";
    const direction = domains.some((item) => item.key === "memory_impairment")
      ? "临床表现与记忆主导型AD相关认知改变方向存在一定一致性，需要结合病史、认知评估和辅助检查综合判断。"
      : "当前表现提示需要先明确主要认知领域和鉴别方向，再进行AD相关模式综合判断。";
    const next = functionalDecline.level > 0
      ? "建议完善认知功能评估、功能评估及结构影像学检查。"
      : "建议进一步完善认知功能评估，并结合家属观察核对病程变化。";

    return { presentation, domain, direction, next };
  }

  function buildOverallImpression(domains, functionalDecline) {
    if (!domains.length) {
      return "初步临床印象：当前临床信息尚不足以形成稳定模式判断，建议完善病史采集、功能评估及基础认知检查后综合判断。";
    }

    const memoryText = domains.some((domain) => domain.key === "memory_impairment")
      ? "临床表现与AD相关认知改变方向存在一定一致性"
      : "当前表现需要先明确主要受累认知领域及鉴别方向";
    const functionText = functionalDecline.level > 0
      ? "，并已提示日常功能影响"
      : "，目前功能影响程度仍需进一步明确";

    return "初步临床印象：当前患者主要表现为" + joinChinese(domains[0].symptoms.slice(0, 3), "认知变化") + functionText + "，" + memoryText + "，建议结合认知评估、功能评估及辅助检查进一步判断。";
  }

  function buildSpecialistSuggestion(domains, functionalDecline, redFlags) {
    if (!domains.length) {
      return "当前临床信息不足，建议进一步完善病史采集、功能评估及基础认知检查后综合判断。";
    }

    if (redFlags.includes("快速认知下降") || redFlags.includes("明显行为改变") || redFlags.includes("意识波动")) {
      return "若存在快速进展、明显行为改变或其他神经系统异常表现，建议进一步进行专科评估。";
    }

    if (functionalDecline.level >= 2) {
      return "建议神经内科进一步完善认知功能评估、日常生活能力评估及病因学相关检查。";
    }

    return "建议神经内科进一步完善认知功能评估及病因学相关检查。";
  }

  function buildInterviewGuidance(domains, redFlags) {
    const base = ["症状出现时间", "是否逐渐加重", "是否影响日常生活", "家属观察情况", "是否存在其他神经精神症状"];
    if (domains.some((domain) => domain.key === "memory_impairment")) {
      base.push("是否存在重复询问", "是否影响财务管理、出行等复杂活动");
    }
    if (domains.some((domain) => domain.key === "behavioral_symptoms") || redFlags.includes("明显行为改变")) {
      base.push("行为变化出现时间", "是否早于认知下降", "是否伴随人格改变");
    }

    return "建议进一步询问：\n- " + base.slice(0, 8).join("；\n- ") + "。";
  }

  function buildEvidence(domains, functionalDecline) {
    const items = [];
    if (domains.some((domain) => domain.key === "memory_impairment")) {
      items.push("进行性近期记忆下降");
      items.push("新信息保持困难");
    }
    if (domains.length > 1) {
      items.push("多个认知领域相关线索");
    }
    items.push("功能变化情况：" + functionalDecline.text);

    return "本次辅助分析主要依据：\n" + items.map((item, index) => (index + 1) + ". " + item + "；").join("\n") + "\n医学依据来源：临床症状本体、诊断标准及相关医学规则。";
  }

  function buildPatientInfo(patientId, age, gender, course, onset) {
    const items = [];
    if (patientId) items.push("患者编号：" + patientId);
    if (age) items.push("年龄：" + age + "岁");
    if (gender) items.push("性别：" + gender);
    if (course) items.push("病程：" + course);
    if (onset) items.push("起病方式：" + onset);
    return items.length ? items.join(" / ") : "患者基本信息尚未完整录入。";
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) {
      node.textContent = value;
    }
  }

  function updateReport() {
    const domains = getSelectedDomains();
    const functionalDecline = getFunctionalDecline();
    const redFlags = getCheckedValues(".red-flag-list input[type='checkbox']");
    const course = document.getElementById("course").value;
    const onset = document.getElementById("onset").value;
    const patientId = document.getElementById("patientId").value.trim();
    const age = document.getElementById("patientAge").value.trim();
    const gender = document.getElementById("patientGender").value;
    const summaryCard = buildClinicalSummaryCard(domains, functionalDecline);

    // TODO connect backend rule engine
    setText("summaryCardPresentation", summaryCard.presentation);
    setText("summaryCardDomain", summaryCard.domain);
    setText("summaryCardDirection", summaryCard.direction);
    setText("summaryCardNext", summaryCard.next);
    setText("patientInfoText", buildPatientInfo(patientId, age, gender, course, onset));
    setText("summaryText", buildSummary(domains, functionalDecline));
    setText("domainText", buildDomainAnalysis(domains));
    setText("patternText", buildPattern(domains, onset, redFlags));
    setText("stageText", buildStage(functionalDecline, course));
    setText("overallImpressionText", buildOverallImpression(domains, functionalDecline));
    setText("differentialText", buildDifferential(redFlags, onset, domains));
    setText("examText", buildExamAdvice());
    setText("specialistText", buildSpecialistSuggestion(domains, functionalDecline, redFlags));
    setText("interviewText", buildInterviewGuidance(domains, redFlags));
    setText("evidenceText", buildEvidence(domains, functionalDecline));
    setText("systemDescriptionText", "本系统基于患者当前录入的临床表现、标准化医学概念以及医学知识规则进行辅助分析，用于帮助医生整理症状特点、明确评估方向并提供进一步检查建议。系统输出不能替代医生诊断，最终判断需结合患者完整病史、体格检查、神经心理评估及辅助检查结果综合确定。");

    const metaParts = [];
    if (patientId) metaParts.push("患者编号：" + patientId);
    if (age) metaParts.push("年龄：" + age + "岁");
    if (gender) metaParts.push("性别：" + gender);
    if (course) metaParts.push("病程：" + course);

    document.getElementById("reportMeta").textContent = metaParts.length
      ? metaParts.join(" / ")
      : "未录入完整基本信息，可继续补充患者资料。";

    resultPanel.hidden = false;
    resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetForm() {
    document.querySelectorAll(".basic-diagnosis-page input[type='text'], .basic-diagnosis-page input[type='number']")
      .forEach((input) => {
        input.value = "";
      });

    document.querySelectorAll(".basic-diagnosis-page select")
      .forEach((select) => {
        select.selectedIndex = 0;
      });

    document.querySelectorAll(".symptom-card input[type='checkbox'], .red-flag-list input[type='checkbox']")
      .forEach((input) => {
        input.checked = false;
      });

    const functionalZero = document.querySelector("input[name='functionalDecline'][value='0']");
    if (functionalZero) {
      functionalZero.checked = true;
    }

    const doctorNote = document.getElementById("doctorNote");
    if (doctorNote) {
      doctorNote.value = "";
    }

    resultPanel.hidden = true;
  }

  function loadDemoCase() {
    const patientId = document.getElementById("patientId");
    const age = document.getElementById("patientAge");
    const gender = document.getElementById("patientGender");
    const education = document.getElementById("education");
    const course = document.getElementById("course");
    const onset = document.getElementById("onset");

    if (patientId) patientId.value = "DEMO-AD-001";
    if (age) age.value = "72";
    if (gender) gender.value = "女";
    if (education) education.value = "中学";
    if (course) course.value = ">1年";
    if (onset) onset.value = "缓慢进展";

    ["近期记忆下降", "重复询问", "新信息学习困难"].forEach((value) => {
      const input = Array.from(document.querySelectorAll(".symptom-card input[type='checkbox']"))
        .find((item) => item.value === value);
      if (input) input.checked = true;
    });

    const functionalIadl = document.querySelector("input[name='functionalDecline'][value='2']");
    if (functionalIadl) {
      functionalIadl.checked = true;
    }
  }

  analyzeBtn.addEventListener("click", updateReport);
  resetBtn.addEventListener("click", resetForm);
  loadDemoCase();
})();
