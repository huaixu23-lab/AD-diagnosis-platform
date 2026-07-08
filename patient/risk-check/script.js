// ==================== 全局状态管理 ====================
const state = {
    currentStep: 0,
    testStep: 0,
    answers: {},
    basicInfo: {},
    cognitiveTest: {},
    lifestyle: {},
    totalScore: 0,
    riskLevel: '',
    dimensionScores: {},
    memoryWords: ['皮球', '国旗', '树木'],
    memoryShowed: false
};

// ==================== 页面初始化 ====================
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    initWelcomePage();
    initBasicInfoPage();
    initSymptomPage();
    initCognitivePage();
    initResultTabs();
    updateSidebar();
}

// ==================== 通用：步骤切换与侧边栏 ====================
function goToStep(stepIndex) {
    state.currentStep = stepIndex;
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    document.getElementById(`step-${stepIndex}`).classList.add('active');
    updateSidebar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateSidebar() {
    const stepNames = ["首页", "基本信息", "症状自评", "认知测试", "生活方式", "评估结果"];
    const items = document.querySelectorAll('#sidebar-steps .step-item');
    items.forEach((item, index) => {
        item.classList.remove('active', 'completed');
        if (index < state.currentStep) {
            item.classList.add('completed');
            item.textContent = '完成 - ' + stepNames[index];
        } else if (index === state.currentStep) {
            item.classList.add('active');
            item.textContent = '进行中 - ' + stepNames[index];
        } else {
            item.textContent = stepNames[index];
        }
    });
    document.getElementById('progress-num').textContent = Math.min(state.currentStep, 5);
}

// ==================== 步骤0：首页逻辑 ====================
function initWelcomePage() {
    const agreeCheck = document.getElementById('agree-check');
    const startBtn = document.getElementById('start-btn');
    agreeCheck.addEventListener('change', () => {
        startBtn.disabled = !agreeCheck.checked;
    });
    startBtn.addEventListener('click', () => {
        goToStep(1);
    });
}

// ==================== 步骤1：基本信息逻辑 ====================
function initBasicInfoPage() {
    const ageSlider = document.getElementById('age');
    const ageValue = document.getElementById('age-value');
    ageSlider.addEventListener('input', () => {
        ageValue.textContent = ageSlider.value;
    });

    const familyRadios = document.querySelectorAll('input[name="family_history"]');
    familyRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            const val = radio.value;
            const apoeGroup = document.getElementById('apoe-group');
            apoeGroup.style.display = (val !== '请选择' && val !== '没有') ? 'block' : 'none';
        });
    });
}

function nextStepFromBasic() {
    const errorBox = document.getElementById('basic-error');
    const unanswered = [];

    const age = parseInt(document.getElementById('age').value);
    const gender = document.querySelector('input[name="gender"]:checked')?.value;
    const education = document.getElementById('education').value;
    const occupation = document.getElementById('occupation').value;
    const marital = document.getElementById('marital').value;
    const living = document.getElementById('living').value;
    const familyHistory = document.querySelector('input[name="family_history"]:checked')?.value;
    const apoe = document.getElementById('apoe').value || '没做过/不清楚';
    const hypertension = document.getElementById('hypertension').value;
    const diabetes = document.getElementById('diabetes').value;
    const stroke = document.getElementById('stroke').value;
    const hyperlipidemia = document.getElementById('hyperlipidemia').value;
    const depression = document.getElementById('depression').value;
    const headInjury = document.getElementById('head_injury').value;
    const thyroid = document.getElementById('thyroid').value;
    const medications = Array.from(document.querySelectorAll('input[name="medications"]:checked'))
        .map(el => el.value);

    if (!gender) unanswered.push('性别');
    if (!education) unanswered.push('最高文化程度');
    if (!occupation) unanswered.push('职业类型');
    if (!marital) unanswered.push('婚姻状况');
    if (!living) unanswered.push('居住方式');
    if (!familyHistory || familyHistory === '请选择') unanswered.push('家族史');
    if (!hypertension) unanswered.push('高血压病史');
    if (!diabetes) unanswered.push('糖尿病病史');
    if (!stroke) unanswered.push('脑卒中病史');
    if (!hyperlipidemia) unanswered.push('高血脂病史');
    if (!depression) unanswered.push('抑郁症病史');
    if (!headInjury) unanswered.push('头部外伤史');
    if (!thyroid) unanswered.push('甲状腺疾病');

    if (unanswered.length > 0) {
        errorBox.textContent = '请完成以下题目后再继续：' + unanswered.join('、');
        errorBox.style.display = 'block';
        return;
    }
    errorBox.style.display = 'none';

    state.basicInfo = {
        age, gender, education, occupation, marital, living,
        family_history: familyHistory, apoe,
        hypertension, diabetes, stroke, hyperlipidemia,
        depression, head_injury: headInjury, thyroid,
        medications
    };

    goToStep(2);
}

// ==================== 步骤2：症状自评逻辑 ====================
function initSymptomPage() {
    const normalOptions = ["请选择", "完全没有", "偶尔有", "经常有", "几乎总是"];
    const normalScores = [-1, 0, 1, 2, 3];
    const adlOptions = ["请选择", "完全可以自己做", "有点困难但基本能做", "需要部分帮助", "完全需要别人帮助"];
    const adlScores = [-1, 0, 1, 2, 3];

    renderQuestionList('memory-questions', [
        ["2.1.1", "您是否经常忘记最近发生的事情（如刚说过的话、刚做过的事）？"],
        ["2.1.2", "您是否经常忘记重要的约会、纪念日或安排？"],
        ["2.1.3", "您是否经常把东西放错地方，事后找不到？"],
        ["2.1.4", "您是否经常想不起熟人的名字，或者叫错名字？"],
        ["2.1.5", "您是否觉得学习新东西越来越困难？"],
        ["2.1.6", "您是否经常重复说同样的话、问同样的问题？"],
        ["2.1.7", "您是否在熟悉的地方也会迷路或分不清方向？"],
        ["2.1.8", "您是否记不清自己的年龄、生日或重要往事？"]
    ], normalOptions, normalScores, 'mem');

    renderQuestionList('language-questions', [
        ["2.2.1", "您说话时是否经常'找词困难'，想说某个词但半天想不出来？"],
        ["2.2.2", "您是否难以理解别人说的复杂句子？"],
        ["2.2.3", "您是否经常叫错常见物品的名字？"],
        ["2.2.4", "您是否觉得阅读书报变得困难？"],
        ["2.2.5", "您写字时是否经常写错字、漏字？"]
    ], normalOptions, normalScores, 'lang');

    renderQuestionList('exec-questions', [
        ["2.3.1", "您是否觉得规划或完成复杂的事情越来越困难？"],
        ["2.3.2", "您的判断力是否下降（如容易被骗、做出不明智决定）？"],
        ["2.3.3", "您是否难以同时处理多件事情？"],
        ["2.3.4", "您解决问题的能力是否明显下降？"],
        ["2.3.5", "您是否变得越来越被动、懒散？"]
    ], normalOptions, normalScores, 'exec');

    renderQuestionList('spatial-questions', [
        ["2.4.1", "您上下楼梯或台阶时是否容易踩空？"],
        ["2.4.2", "您是否经常打翻杯子、碗？"],
        ["2.4.3", "您穿衣服时是否经常分不清正反、前后？"],
        ["2.4.4", "您看地图或识别路线是否变得困难？"]
    ], normalOptions, normalScores, 'spatial');

    renderQuestionList('adl-questions', [
        ["2.5.1.1", "穿衣服（扣扣子、拉拉链、系鞋带）"],
        ["2.5.1.2", "吃饭（夹菜、盛饭）"],
        ["2.5.1.3", "洗澡（进出浴室、调节水温）"],
        ["2.5.1.4", "上厕所（穿脱裤子、清洁）"],
        ["2.5.1.5", "走路或上下楼梯"]
    ], adlOptions, adlScores, 'adl');

    renderQuestionList('iadl-questions', [
        ["2.5.2.1", "去超市或市场购物"],
        ["2.5.2.2", "准备饭菜"],
        ["2.5.2.3", "管理钱财（付账单、存取款）"],
        ["2.5.2.4", "乘坐公共交通或开车去陌生地方"],
        ["2.5.2.5", "按时按量服药"]
    ], adlOptions, adlScores, 'iadl');

    renderQuestionList('bpsd-questions', [
        ["2.6.1", "您是否看到或听到实际上不存在的东西？"],
        ["2.6.2", "您是否总是怀疑别人偷了您的东西或有人要害您？"],
        ["2.6.3", "您是否经常情绪低落、闷闷不乐？"],
        ["2.6.4", "您是否经常感到紧张、焦虑、担心？"],
        ["2.6.5", "您是否变得容易生气、发脾气，甚至有攻击行为？"],
        ["2.6.6", "您是否睡眠不好，晚上不睡、白天打瞌睡？"]
    ], normalOptions, normalScores, 'bpsd');

    document.querySelectorAll('#step-2 .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            document.querySelectorAll('#step-2 .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('#step-2 .tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${tabName}`).classList.add('active');
        });
    });

    updateSymptomProgress();
}

function renderQuestionList(containerId, questionList, options, scores, prefix) {
    const container = document.getElementById(containerId);
    questionList.forEach(([qId, qText]) => {
        const item = document.createElement('div');
        item.className = 'question-item';
        item.innerHTML = `<div class="question-text">${qText}</div>`;

        const radioGroup = document.createElement('div');
        radioGroup.className = 'radio-group horizontal';

        options.forEach((optText, idx) => {
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = `${prefix}_${qId}`;
            input.value = scores[idx];
            if (idx === 0) input.checked = true;

            input.addEventListener('change', () => {
                state.answers[qId] = parseInt(input.value);
                updateSymptomProgress();
            });

            label.appendChild(input);
            label.appendChild(document.createTextNode(' ' + optText));
            radioGroup.appendChild(label);
        });

        item.appendChild(radioGroup);
        container.appendChild(item);
        state.answers[qId] = -1;
    });
}

function updateSymptomProgress() {
    const answeredCount = Object.values(state.answers).filter(v => v >= 0).length;
    document.getElementById('symptom-answered').textContent = answeredCount;
}

function nextStepFromSymptom() {
    const errorBox = document.getElementById('symptom-error');
    const unansweredCount = Object.values(state.answers).filter(v => v < 0).length;

    if (unansweredCount > 0) {
        errorBox.textContent = `还有 ${unansweredCount} 道题未完成，请全部答完后再继续。`;
        errorBox.style.display = 'block';
        return;
    }
    errorBox.style.display = 'none';
    goToStep(3);
}

// ==================== 步骤3：认知测试逻辑 ====================
function initCognitivePage() {
    state.testStep = 0;
    updateTestStepUI();
}

function updateTestStepUI() {
    const testNames = ["瞬时记忆", "注意力计算", "语言流畅性", "视空间测试", "定向力"];
    document.getElementById('current-test-name').textContent = testNames[Math.min(state.testStep, 4)];
    document.getElementById('cognitive-progress-fill').style.width = `${(state.testStep / 5) * 100}%`;

    document.querySelectorAll('.test-step').forEach(el => el.classList.remove('active'));
    document.getElementById(`test-${state.testStep}`).classList.add('active');
}

function nextTestStep() {
    state.testStep++;
    updateTestStepUI();
}

function confirmMemory() {
    state.memoryShowed = true;
    document.getElementById('memory-confirm-btn').style.display = 'none';
    document.getElementById('memory-success').style.display = 'block';
    document.getElementById('memory-next-btn').style.display = 'inline-block';
}

function submitAttentionTest() {
    const correctAnswers = [93, 86, 79, 72, 65];
    const userAnswers = [
        parseInt(document.getElementById('sub7_1').value) || 0,
        parseInt(document.getElementById('sub7_2').value) || 0,
        parseInt(document.getElementById('sub7_3').value) || 0,
        parseInt(document.getElementById('sub7_4').value) || 0,
        parseInt(document.getElementById('sub7_5').value) || 0
    ];
    let sub7Score = 0;
    userAnswers.forEach((val, i) => {
        if (val === correctAnswers[i]) sub7Score += 0.6;
    });

    let reverseScore = 0;
    if (document.getElementById('reverse_1').value === '247') reverseScore += 0.5;
    if (document.getElementById('reverse_2').value === '1583') reverseScore += 0.7;
    if (document.getElementById('reverse_3').value === '84296') reverseScore += 0.8;

    state.cognitiveTest.attention_score = sub7Score + reverseScore;
    nextTestStep();
}

function submitFluencyTest() {
    const input = document.getElementById('animals_input').value.trim();
    if (!input) {
        alert('请输入至少一个动物名称');
        return;
    }

    const animals = input.split(/[,，\s]+/).filter(a => a.trim());
    const uniqueAnimals = [...new Set(animals)];
    const count = uniqueAnimals.length;

    let score;
    if (count >= 15) score = 3;
    else if (count >= 10) score = 2;
    else if (count >= 5) score = 1;
    else score = 0;

    state.cognitiveTest.fluency_score = score;
    state.cognitiveTest.fluency_count = count;
    state.cognitiveTest.fluency_animals = uniqueAnimals;

    nextTestStep();
}

function submitSpatialTest() {
    const errorBox = document.getElementById('spatial-error');
    const q1 = document.querySelector('input[name="spatial_q1"]:checked');
    const q2 = document.querySelector('input[name="clock_q1"]:checked');

    if (!q1 || !q2) {
        errorBox.textContent = '请完成两道题后再继续';
        errorBox.style.display = 'block';
        return;
    }
    errorBox.style.display = 'none';

    let score = 0;
    if (q1.value === 'B') score += 2;
    if (q2.value === 'B') score += 2;

    state.cognitiveTest.spatial_score = score;
    nextTestStep();
}

function submitOrientationTest() {
    const errorBox = document.getElementById('orientation-error');
    const weekday = document.getElementById('weekday').value;
    const season = document.getElementById('season').value;
    const capital = document.getElementById('capital').value.trim();

    if (!weekday || !season || !capital) {
        errorBox.textContent = '请完成所有题目后再提交';
        errorBox.style.display = 'block';
        return;
    }
    errorBox.style.display = 'none';

    const userWords = [
        document.getElementById('recall_1').value.trim(),
        document.getElementById('recall_2').value.trim(),
        document.getElementById('recall_3').value.trim()
    ];
    let recallScore = 0;
    userWords.forEach(w => {
        if (state.memoryWords.includes(w)) recallScore++;
    });
    state.cognitiveTest.recall_score = recallScore;

    let orientationScore = 0;
    const today = new Date();
    const year = parseInt(document.getElementById('year').value);
    const month = parseInt(document.getElementById('month').value);
    const day = parseInt(document.getElementById('day').value);

    if (year === today.getFullYear()) orientationScore += 1;
    if (month === today.getMonth() + 1 && day === today.getDate()) {
        orientationScore += 2;
    } else if (month === today.getMonth() + 1 || day === today.getDate()) {
        orientationScore += 1;
    }

    const weekdayMap = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    if (weekday === weekdayMap[today.getDay()]) orientationScore += 1;

    const monthNum = today.getMonth() + 1;
    let monthSeason;
    if (monthNum >= 3 && monthNum <= 5) monthSeason = "春季";
    else if (monthNum >= 6 && monthNum <= 8) monthSeason = "夏季";
    else if (monthNum >= 9 && monthNum <= 11) monthSeason = "秋季";
    else monthSeason = "冬季";
    if (season === monthSeason) orientationScore += 0.5;

    if (['北京', '北京市'].includes(capital)) orientationScore += 0.5;

    state.cognitiveTest.orientation_score = orientationScore;

    const ct = state.cognitiveTest;
    const totalCognitive = (
        (ct.recall_score || 0) +
        (ct.attention_score || 0) +
        (ct.fluency_score || 0) +
        (ct.spatial_score || 0) +
        (ct.orientation_score || 0)
    );
    state.cognitiveTest.total = totalCognitive;
    document.getElementById('cognitive-total-score').textContent = totalCognitive.toFixed(1);

    state.testStep = 5;
    updateTestStepUI();
}

function backFromCognitive() {
    state.testStep = 0;
    goToStep(2);
}

// ==================== 步骤4：生活方式辅助逻辑 ====================
function toggleExpander(header) {
    const expander = header.parentElement;
    expander.classList.toggle('active');
    const icon = header.querySelector('.expander-icon');
    icon.textContent = expander.classList.contains('active') ? '−' : '+';
}

function collectLifestyleData() {
    return {
        diet: {
            fish: document.getElementById('fish').value,
            veggie: document.getElementById('veggie').value,
            junk_food: document.getElementById('junk_food').value
        },
        exercise: {
            exercise: document.getElementById('exercise').value,
            sitting: document.getElementById('sitting').value
        },
        sleep: {
            sleep_hours: document.getElementById('sleep_hours').value,
            insomnia: document.getElementById('insomnia').value,
            sleep_apnea: document.getElementById('sleep_apnea').value
        },
        social: {
            social: document.getElementById('social').value,
            mental: document.getElementById('mental').value
        },
        habits: {
            smoking: document.getElementById('smoking').value,
            drinking: document.getElementById('drinking').value
        }
    };
}

// ==================== 核心：评分算法 ====================
function calculateTotalScore() {
    const answers = state.answers;
    const basicInfo = state.basicInfo;
    const cognitiveTest = state.cognitiveTest;
    const lifestyle = collectLifestyleData();
    state.lifestyle = lifestyle;

    const dimensionScores = {};
    let d1Raw = 0;
    const age = basicInfo.age;

    if (age < 50) d1Raw += 0;
    else if (age < 60) d1Raw += 1;
    else if (age < 65) d1Raw += 2;
    else if (age < 70) d1Raw += 3;
    else if (age < 75) d1Raw += 5;
    else if (age < 80) d1Raw += 7;
    else if (age < 85) d1Raw += 9;
    else d1Raw += 12;

    if (basicInfo.gender === '女') d1Raw += 2;

    const eduScores = {
        '文盲/小学未毕业': 4, '小学毕业': 3, '初中毕业': 2,
        '高中/中专毕业': 1, '大专/本科': 0, '硕士及以上': 0
    };
    d1Raw += eduScores[basicInfo.education] || 0;

    const fhScores = {
        '没有': 0, '有1位二级亲属': 2, '有1位一级亲属': 5, '有2位及以上一级亲属': 8
    };
    d1Raw += fhScores[basicInfo.family_history] || 0;

    const apoeScores = {
        '没做过/不清楚': 0, '没有携带APOEε4': 0,
        '携带1个APOEε4': 5, '携带2个APOEε4': 10
    };
    d1Raw += apoeScores[basicInfo.apoe] || 0;

    d1Raw += ({'没有': 0, '有，控制良好': 1, '有，控制不佳': 3}[basicInfo.hypertension] || 0);
    d1Raw += ({'没有': 0, '有，控制良好': 1, '有，控制不佳': 3}[basicInfo.diabetes] || 0);
    d1Raw += ({'没有': 0, '有过1次': 3, '有过2次及以上': 5}[basicInfo.stroke] || 0);
    d1Raw += ({'没有': 0, '有，控制良好': 1, '有，控制不佳': 2}[basicInfo.hyperlipidemia] || 0);
    d1Raw += ({'没有': 0, '曾经有过': 2, '目前仍有': 4}[basicInfo.depression] || 0);
    d1Raw += ({
        '没有': 0, '有，未失去意识': 1,
        '有，失去意识<30分钟': 2, '有，失去意识>30分钟': 4
    }[basicInfo.head_injury] || 0);
    d1Raw += ({'没有': 0, '有，已控制': 1, '有，未控制': 3}[basicInfo.thyroid] || 0);

    const meds = basicInfo.medications;
    if (!meds.includes('以上都没有')) {
        d1Raw += Math.min(meds.length * 2, 6);
    }

    dimensionScores.D1 = (d1Raw / 57) * 15;

    let d2Raw = 0;
    for (let i = 1; i <= 8; i++) d2Raw += answers['2.1.' + i] || 0;
    dimensionScores.D2 = (d2Raw / 24) * 25;

    let langRaw = 0, execRaw = 0, spatialRaw = 0;
    for (let i = 1; i <= 5; i++) langRaw += answers['2.2.' + i] || 0;
    for (let i = 1; i <= 5; i++) execRaw += answers['2.3.' + i] || 0;
    for (let i = 1; i <= 4; i++) spatialRaw += answers['2.4.' + i] || 0;

    const d3Weighted = (langRaw / 15) * 0.4 + (execRaw / 15) * 0.4 + (spatialRaw / 12) * 0.2;
    dimensionScores.D3 = d3Weighted * 20;

    let adlRaw = 0, iadlRaw = 0;
    for (let i = 1; i <= 5; i++) adlRaw += answers['2.5.1.' + i] || 0;
    for (let i = 1; i <= 5; i++) iadlRaw += answers['2.5.2.' + i] || 0;
    dimensionScores.D4 = ((adlRaw + iadlRaw) / 30) * 15;

    let d5Raw = 0;
    for (let i = 1; i <= 6; i++) d5Raw += answers['2.6.' + i] || 0;
    dimensionScores.D5 = (d5Raw / 18) * 10;

    const d6TestScore = cognitiveTest.total || 10;
    dimensionScores.D6 = ((20 - d6TestScore) / 20) * 10;

    let d7Raw = 0;
    d7Raw += ({
        '几乎每天': 0, '每周3-4次': 0, '每周1-2次': 1,
        '每月1-2次': 2, '很少或从不吃': 3
    }[lifestyle.diet.fish] || 1);
    d7Raw += ({
        '500克以上': 0, '300-500克': 1,
        '200-300克': 2, '200克以下': 3
    }[lifestyle.diet.veggie] || 1);
    d7Raw += ({
        '很少或从不吃': 0, '每月1-2次': 1,
        '每周1-2次': 2, '几乎每天': 3
    }[lifestyle.diet.junk_food] || 2);

    d7Raw += ({
        '每周5次以上': 0, '每周3-4次': 1,
        '每周1-2次': 2, '很少运动': 3
    }[lifestyle.exercise.exercise] || 1);
    d7Raw += ({
        '4小时以下': 0, '4-6小时': 1,
        '6-8小时': 2, '8小时以上': 3
    }[lifestyle.exercise.sitting] || 2);

    d7Raw += ({
        '7-8小时': 0, '6-7小时/8-9小时': 1,
        '5-6小时/9-10小时': 2, '5小时以下/10小时以上': 3
    }[lifestyle.sleep.sleep_hours] || 0);
    d7Raw += ({'没有': 0, '偶尔': 1, '经常': 3}[lifestyle.sleep.insomnia] || 1);
    d7Raw += ({
        '没有': 0, '有一点': 1, '很严重/有呼吸暂停': 3
    }[lifestyle.sleep.sleep_apnea] || 0);

    d7Raw += ({
        '每周3次以上': 0, '每周1-2次': 1,
        '每月1-2次': 2, '很少或几乎没有': 3
    }[lifestyle.social.social] || 1);
    d7Raw += ({
        '几乎每天': 0, '每周3-4次': 1,
        '每周1-2次': 2, '很少或几乎没有': 3
    }[lifestyle.social.mental] || 1);

    d7Raw += ({
        '从不吸烟': 0, '已戒烟5年以上': 0, '已戒烟不足5年': 1,
        '目前仍吸烟（每天少于10支）': 2, '目前仍吸烟（每天10支以上）': 3
    }[lifestyle.habits.smoking] || 0);
    d7Raw += ({
        '从不饮酒': 0, '少量饮酒': 0,
        '中等量饮酒': 2, '大量饮酒/酗酒': 3
    }[lifestyle.habits.drinking] || 0);

    dimensionScores.D7 = (d7Raw / 35) * 5;

    let total = Object.values(dimensionScores).reduce((sum, val) => sum + val, 0);
    let ageFactor = 0.8 + (age - 50) * 0.01;
    ageFactor = Math.max(0.8, Math.min(1.2, ageFactor));
    total = Math.min(total * ageFactor, 100);

    let riskLevel;
    if (total < 20) riskLevel = '低风险';
    else if (total < 40) riskLevel = '中低风险';
    else if (total < 60) riskLevel = '中高风险';
    else if (total < 80) riskLevel = '高风险';
    else riskLevel = '极高风险';

    state.totalScore = total;
    state.riskLevel = riskLevel;
    state.dimensionScores = dimensionScores;

    return { total, riskLevel, dimensionScores };
}

// ==================== 步骤5：结果页渲染 ====================
function showResult() {
    calculateTotalScore();
    goToStep(5);
    renderResultSummary();
    renderGaugeChart();
    renderRadarChart();
    renderScoreTable();
    renderResultTabContents();
}

function renderResultSummary() {
    const { totalScore, riskLevel, basicInfo } = state;
    const riskColors = {
        '低风险': '#38a169',
        '中低风险': '#d69e2e',
        '中高风险': '#dd6b20',
        '高风险': '#e53e3e',
        '极高风险': '#9b2c2c'
    };

    const riskText = document.getElementById('risk-level-text');
    riskText.textContent = riskLevel;
    riskText.style.color = riskColors[riskLevel] || '#2c5282';

    document.getElementById('result-age').textContent = basicInfo.age;
    document.getElementById('result-gender').textContent = basicInfo.gender;
    document.getElementById('result-time').textContent = new Date().toLocaleString('zh-CN');

    const summaries = {
        '低风险': '您的认知功能整体良好，请继续保持健康的生活方式。',
        '中低风险': '您可能存在轻度认知下降迹象，建议定期监测，注意生活方式调整。',
        '中高风险': '您的认知功能存在中度下降可能，建议尽快到医院进行专业检查。',
        '高风险': '您的认知功能下降较为明显，高度怀疑阿尔茨海默症，请尽快就诊。',
        '极高风险': '您的认知功能严重受损，请立即就医，并加强日常照护。'
    };
    document.getElementById('result-summary').textContent = summaries[riskLevel] || '';

    const suggestions = {
        '低风险': '建议每年自我评估一次',
        '中低风险': '建议每6个月复查一次',
        '中高风险': '建议3个月内就医检查',
        '高风险': '建议1个月内尽快就诊',
        '极高风险': '请立即就医'
    };
    document.getElementById('result-suggestion').textContent = '复查建议：' + suggestions[riskLevel];
}

function renderGaugeChart() {
    const ctx = document.getElementById('gauge-chart').getContext('2d');
    if (window.gaugeChartInstance) window.gaugeChartInstance.destroy();

    window.gaugeChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [state.totalScore, 100 - state.totalScore],
                backgroundColor: ['#2c5282', '#e2e8f0'],
                borderWidth: 0,
                cutout: '70%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw: function(chart) {
                const { width, height, ctx } = chart;
                ctx.restore();
                ctx.font = 'bold 32px "Microsoft YaHei", sans-serif';
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#2d3748';
                ctx.fillText(state.totalScore.toFixed(1), width / 2, height / 2 - 10);
                ctx.font = '14px "Microsoft YaHei", sans-serif';
                ctx.fillStyle = '#718096';
                ctx.fillText('风险总分', width / 2, height / 2 + 20);
                ctx.save();
            }
        }]
    });
}

function renderRadarChart() {
    const ctx = document.getElementById('radar-chart').getContext('2d');
    if (window.radarChartInstance) window.radarChartInstance.destroy();

    const ds = state.dimensionScores;
    const categories = [
        '人口统计学与家族史', '记忆功能', '其他认知域',
        '日常生活能力', '精神行为症状', '认知筛查测试', '生活方式'
    ];
    const values = [
        (ds.D1 / 15) * 100,
        (ds.D2 / 25) * 100,
        (ds.D3 / 20) * 100,
        (ds.D4 / 15) * 100,
        (ds.D5 / 10) * 100,
        (ds.D6 / 10) * 100,
        (ds.D7 / 5) * 100
    ];

    window.radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: categories,
            datasets: [{
                label: '风险得分',
                data: values,
                backgroundColor: 'rgba(44, 82, 130, 0.3)',
                borderColor: '#2c5282',
                borderWidth: 2,
                pointBackgroundColor: '#2c5282'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    min: 0, max: 100,
                    ticks: {
                        stepSize: 33,
                        callback: function(value) {
                            return value === 33 ? '低' : value === 66 ? '中' : value === 100 ? '高' : '';
                        }
                    }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function renderScoreTable() {
    const ds = state.dimensionScores;
    const tbody = document.getElementById('score-table-body');
    const rows = [
        ['人口统计学与家族史', `${ds.D1.toFixed(1)} / 15`, '15%'],
        ['记忆功能', `${ds.D2.toFixed(1)} / 25`, '25%'],
        ['语言/执行/视空间', `${ds.D3.toFixed(1)} / 20`, '20%'],
        ['日常生活能力', `${ds.D4.toFixed(1)} / 15`, '15%'],
        ['精神行为症状', `${ds.D5.toFixed(1)} / 10`, '10%'],
        ['认知筛查测试', `${ds.D6.toFixed(1)} / 10`, '10%'],
        ['生活方式', `${ds.D7.toFixed(1)} / 5`, '5%']
    ];
    tbody.innerHTML = rows.map(row =>
        `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td></tr>`
    ).join('');
    document.getElementById('total-score-text').textContent = state.totalScore.toFixed(1);
}

function initResultTabs() {
    document.querySelectorAll('[data-result-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.resultTab;
            document.querySelectorAll('[data-result-tab]').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('[id^="result-tab-"]').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`result-tab-${tabName}`).classList.add('active');
        });
    });
}

// ==================== 仅此处做了卡片化优化，其余全不变 ====================
function renderResultTabContents() {
    const ds = state.dimensionScores;
    const basicInfo = state.basicInfo;
    const lifestyle = state.lifestyle;
    const riskLevel = state.riskLevel;

    // 记忆分析
    let memoryHtml = '<h4>记忆功能分析</h4>';
    if (ds.D2 < 5) {
        memoryHtml += '<div class="success-box">您的记忆功能整体良好，未发现明显的记忆障碍迹象。</div>';
    } else if (ds.D2 < 12) {
        memoryHtml += '<div class="warning-box">您可能存在轻度记忆下降，主要表现为近期记忆减退，这可能是正常老化，也可能是早期信号。</div>';
    } else {
        memoryHtml += '<div class="error-box">您的记忆功能下降较为明显，尤其是近期记忆和学习能力，建议尽快就医检查。</div>';
    }

    memoryHtml += '<h4>其他认知域分析</h4>';
    if (ds.D3 < 4) {
        memoryHtml += '<div class="success-box">您的语言、执行功能和视空间能力整体良好。</div>';
    } else if (ds.D3 < 10) {
        memoryHtml += '<div class="warning-box">您在语言表达、执行功能或视空间方面可能存在轻度下降。</div>';
    } else {
        memoryHtml += '<div class="error-box">您的多项认知功能存在明显下降，建议进行全面的神经心理评估。</div>';
    }

    memoryHtml += '<h4>日常生活能力分析</h4>';
    if (ds.D4 < 3) {
        memoryHtml += '<div class="success-box">您的日常生活能力完全正常，可以独立完成各项日常活动。</div>';
    } else if (ds.D4 < 8) {
        memoryHtml += '<div class="warning-box">您在复杂的日常活动中可能需要一些帮助，但基本生活可以自理。</div>';
    } else {
        memoryHtml += '<div class="error-box">您的日常生活能力明显下降，需要他人的协助和照护。</div>';
    }
    document.getElementById('result-tab-memory').innerHTML = memoryHtml;

    // 危险因素
    let riskHtml = '<h4>不可控危险因素</h4><ul>';
    const uncontrollable = [];
    if (basicInfo.age >= 65) uncontrollable.push(`年龄较大（${basicInfo.age}岁）`);
    if (basicInfo.gender === '女') uncontrollable.push('女性（女性患病率高于男性）');
    if (basicInfo.family_history !== '没有') uncontrollable.push('家族史阳性');
    if (basicInfo.apoe && basicInfo.apoe.includes('携带')) uncontrollable.push('APOEε4基因携带');

    if (uncontrollable.length > 0) {
        uncontrollable.forEach(f => riskHtml += `<li>${f}</li>`);
    } else {
        riskHtml += '<div class="success-box">未发现明显的不可控危险因素</div>';
    }
    riskHtml += '</ul><hr><h4>可控危险因素</h4><ul>';

    const controllable = [];
    if (basicInfo.hypertension !== '没有') controllable.push('高血压');
    if (basicInfo.diabetes !== '没有') controllable.push('糖尿病');
    if (basicInfo.hyperlipidemia !== '没有') controllable.push('高血脂');
    if (basicInfo.depression !== '没有') controllable.push('抑郁症');
    if (basicInfo.stroke !== '没有') controllable.push('脑卒中史');

    if (['很少运动', '每周1-2次'].includes(lifestyle.exercise.exercise)) controllable.push('运动不足');
    if (['很少或从不吃', '每月1-2次'].includes(lifestyle.diet.fish)) controllable.push('鱼类摄入不足');
    if (['几乎每天', '每周1-2次'].includes(lifestyle.diet.junk_food)) controllable.push('不健康饮食');
    if (lifestyle.sleep.sleep_apnea !== '没有') controllable.push('睡眠呼吸暂停');
    if (lifestyle.habits.smoking.includes('目前仍吸烟')) controllable.push('吸烟');
    if (['大量饮酒/酗酒', '中等量饮酒'].includes(lifestyle.habits.drinking)) controllable.push('过量饮酒');
    if (['很少或几乎没有', '每月1-2次'].includes(lifestyle.social.social)) controllable.push('社交活动少');

    if (controllable.length > 0) {
        controllable.forEach(f => riskHtml += `<li>${f}</li>`);
        riskHtml += '</ul><div class="info-box">以上危险因素大多可以通过药物治疗或生活方式调整来改善，建议积极干预。</div>';
    } else {
        riskHtml += '<div class="success-box">未发现明显的可控危险因素，继续保持！</div>';
    }
    document.getElementById('result-tab-risk').innerHTML = riskHtml;

    // 就医建议
    const medicalAdvice = {
        '低风险': `
            <h4>就医建议</h4>
            <p>无需特殊就医，保持健康生活方式即可。</p>
            <h4>复查建议</h4>
            <p>建议每年进行一次自我评估，监测认知变化。</p>
            <h4>检查项目（可选）</h4>
            <ul><li>每年常规体检</li><li>血压、血糖、血脂监测</li></ul>
        `,
        '中低风险': `
            <h4>就医建议</h4>
            <p>建议到神经内科进行一次认知功能筛查。</p>
            <h4>推荐检查项目</h4>
            <ol>
                <li>MMSE或MoCA认知量表评估</li>
                <li>血压、血糖、血脂检查</li>
                <li>甲状腺功能检查</li>
                <li>维生素B12、叶酸水平</li>
            </ol>
            <h4>复查建议</h4>
            <p>建议每6个月复查一次，观察变化趋势。</p>
        `,
        '中高风险': `
            <h4>就医建议</h4>
            <p>建议尽快到三甲医院神经内科或记忆门诊就诊。</p>
            <h4>推荐检查项目</h4>
            <ol>
                <li>详细的神经心理评估</li>
                <li>头颅MRI检查</li>
                <li>血液检查（甲功、维生素B12、叶酸、肝肾功能等）</li>
                <li>必要时脑脊液检查</li>
            </ol>
            <h4>复查建议</h4>
            <p>建议3个月内就医检查，明确诊断。</p>
        `,
        '高风险': `
            <h4>就医建议</h4>
            <p>强烈建议立即到记忆障碍专科就诊。</p>
            <h4>推荐完善检查</h4>
            <ol>
                <li>全面神经心理评估</li>
                <li>头颅MRI+海马相</li>
                <li>淀粉样蛋白PET-CT（如条件允许）</li>
                <li>APOE基因检测</li>
                <li>脑脊液AD生物标志物检测（Aβ42、Tau、p-Tau）</li>
            </ol>
            <h4>复查建议</h4>
            <p>建议1个月内尽快就诊，明确诊断并开始干预。</p>
        `,
        '极高风险': `
            <h4>就医建议</h4>
            <p>请立即就医！建议家属陪同就诊。</p>
            <h4>注意事项</h4>
            <ul>
                <li>防止走失（可佩戴定位手环）</li>
                <li>防止跌倒（移除家中障碍物）</li>
                <li>防止误服药物（药品妥善保管）</li>
                <li>考虑专业照护机构或居家照护</li>
            </ul>
            <h4>推荐就诊科室</h4>
            <ul><li>记忆障碍专科</li><li>神经内科</li><li>老年病科</li></ul>
            <h4>复查建议</h4>
            <p>请立即就医，不要拖延。</p>
        `
    };
    document.getElementById('result-tab-medical').innerHTML = medicalAdvice[riskLevel] || '';

    // 生活建议（卡片化优化，仅此处排版优化，内容不变）
    const lifeHtml = `
        <div class="life-card-grid">
            <div class="life-card">
                <h4>🍽️ 饮食建议</h4>
                <ul>
                    <li><strong>多吃绿叶蔬菜</strong>：每天至少1份</li>
                    <li><strong>多吃浆果</strong>：每周至少2次（蓝莓、草莓）</li>
                    <li><strong>每天一小把坚果</strong>：核桃、杏仁等</li>
                    <li><strong>多用全谷物</strong>：燕麦、糙米代替精米白面</li>
                    <li><strong>每周至少1次深海鱼</strong>：三文鱼、沙丁鱼</li>
                    <li><strong>少吃红肉、油炸食品、甜点</strong></li>
                </ul>
            </div>

            <div class="life-card">
                <h4>🏃 运动建议</h4>
                <ul>
                    <li>每周<strong>150分钟快走/慢跑</strong>等有氧运动</li>
                    <li>推荐<strong>打太极拳</strong>，对平衡和认知都有帮助</li>
                    <li>每周2次简单力量训练</li>
                    <li>别久坐，<strong>每小时起来活动5分钟</strong></li>
                    <li>运动前后注意热身，别勉强</li>
                </ul>
            </div>

            <div class="life-card">
                <h4>🧠 动脑建议</h4>
                <ul>
                    <li><strong>多读书看报</strong>，保持思考习惯</li>
                    <li>下棋、打牌、做数独等益智活动</li>
                    <li><strong>学一点新东西</strong>：唱歌、写字、手工</li>
                    <li>保持好奇心，多接触新鲜事</li>
                </ul>
            </div>

            <div class="life-card">
                <h4>👥 社交建议</h4>
                <ul>
                    <li>多和家人朋友聊天、走动</li>
                    <li>参加社区活动、兴趣小组</li>
                    <li>别总一个人待着，<strong>多出门交流</strong></li>
                    <li>和晚辈多交流，保持心态年轻</li>
                </ul>
            </div>

            <div class="life-card">
                <h4>😴 睡眠建议</h4>
                <ul>
                    <li>每天<strong>固定时间睡觉、起床</strong></li>
                    <li>每天睡够<strong>7-8小时</strong></li>
                    <li>睡前少看手机电视</li>
                    <li>打鼾严重、白天总犯困，要去医院检查</li>
                </ul>
            </div>

            <div class="life-card">
                <h4>💊 慢病管理</h4>
                <ul>
                    <li><strong>控制好血压、血糖、血脂</strong></li>
                    <li>按时吃药，<strong>不要自己随便停药</strong></li>
                    <li>定期体检，监测各项指标</li>
                    <li>控制体重，别太胖也别太瘦</li>
                </ul>
            </div>
        </div>

        <div class="family-tip-box">
            <h4>💚 给家属的照护小提示</h4>
            <ul>
                <li>多陪伴、多耐心，别和老人着急、顶嘴</li>
                <li>家里收拾整齐，减少障碍物，防止跌倒</li>
                <li>重要物品放在固定位置，帮老人养成习惯</li>
                <li>出门带好联系卡，防止走失</li>
                <li>照护者也要注意休息，别自己硬扛</li>
            </ul>
        </div>

        <div class="life-summary-box">
            <strong>温馨提示：</strong>以上建议是通用的健康指导，每个人身体情况不同。
            有基础疾病的朋友，请在医生指导下调整。最重要的是<strong>长期坚持、慢慢来</strong>，健康生活是保护大脑最好的办法。
        </div>
    `;
    document.getElementById('result-tab-life').innerHTML = lifeHtml;
}

// ==================== 重新评估 ====================
function resetAssessment() {
    if (confirm('确定要重新评估吗？所有已填写的内容都会清空。')) {
        window.location.reload();
    }
}