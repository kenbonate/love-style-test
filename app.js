// ============================================================
// 大五人格深度测评 · IPIP 60题专业版
// 基于 International Personality Item Pool (IPIP) 公有领域资源
// ============================================================

let TEST_CONFIG = null;

// ---- State ----
const state = {
  current: 0,                          // 当前题目索引
  answers: [],                         // 每题答案: null | 1-5
  activeDetailDim: 'E',               // 深度解读当前选中维度
  activeTab: 'profile',               // 结果页当前tab
  autoAdvanceTimer: null              // 自动跳转定时器，防抖
};

// ---- DOM Refs ----
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const heroSection = $('#heroSection');
const quizArea = $('#quizArea');
const calculatingArea = $('#calculatingArea');
const resultArea = $('#resultArea');

const startBtn = $('#startBtn');
const progressFill = $('#progressFill');
const progressText = $('#progressText');
const questionIndex = $('#questionIndex');
const questionCount = $('#questionCount');
const questionDimension = $('#questionDimension');
const questionText = $('#questionText');
const optionsEl = $('#options');
const prevBtn = $('#prevBtn');
const nextBtn = $('#nextBtn');
const navHint = $('#navHint');
const quickNavDots = $('#quickNavDots');
const calculatingText = $('#calculatingText');

const resultTabs = $('#resultTabs');
const barChart = $('#barChart');
const dimensionCards = $('#dimensionCards');
const detailSelector = $('#detailSelector');
const detailContent = $('#detailContent');
const combinedContent = $('#combinedContent');
const summaryContent = $('#summaryContent');

const restartBtn = $('#restartBtn');
const copyBtn = $('#copyBtn');
const pdfBtn = $('#pdfBtn');

// ---- Likert Scale Config ----
const LIKERT_OPTIONS = [
  { value: 1, icon: '🅐', label: '非常\n不符合' },
  { value: 2, icon: '🅑', label: '比较\n不符合' },
  { value: 3, icon: '🅒', label: '一般\n中立' },
  { value: 4, icon: '🅓', label: '比较\n符合' },
  { value: 5, icon: '🅔', label: '非常\n符合' }
];

// ---- Dimension Color Map ----
const DIM_COLORS = {
  'AS': { main: '#E8736E', light: '#FDF0EF', name: '依恋安全感' },
  'IO': { main: '#D4859B', light: '#FDF2F6', name: '亲密开放度' },
  'RE': { main: '#E8985E', light: '#FFF5ED', name: '浪漫表达力' },
  'RR': { main: '#7B8DB3', light: '#EEF2F8', name: '关系理性度' },
  'CR': { main: '#6BA89E', light: '#EEF7F5', name: '冲突修复力' }
};

// ============================================================
// INIT
// ============================================================
async function init() {
  // Try fetch first (works with HTTP server); fall back to embedded config (works with file://)
  try {
    const response = await fetch('./config.json');
    if (response.ok) {
      TEST_CONFIG = await response.json();
    } else {
      throw new Error('Fetch failed');
    }
  } catch (e) {
    // file:// protocol or network error — use embedded config
    TEST_CONFIG = window.__EMBEDDED_CONFIG__;
  }

  if (!TEST_CONFIG) {
    document.body.innerHTML = '<div style="text-align:center;padding:60px 20px;font-family:sans-serif;"><h2>⚠️ 配置加载失败</h2><p>请使用本地服务器打开此页面：<br><code>python3 -m http.server 3456</code><br>然后访问 <code>http://localhost:3456</code></p></div>';
    return;
  }

  state.answers = Array(TEST_CONFIG.questions.length).fill(null);
  state.activeDetailDim = Object.keys(TEST_CONFIG.dimensions)[0];

  // Set page metadata
  document.title = `${TEST_CONFIG.title} · 恋爱风格60题`;
  $('#testTitle').textContent = TEST_CONFIG.title;
  $('#testIntro').innerHTML = TEST_CONFIG.intro;

  // Bind events
  startBtn.addEventListener('click', startQuiz);
  prevBtn.addEventListener('click', prevQuestion);
  nextBtn.addEventListener('click', nextQuestion);
  restartBtn.addEventListener('click', restartQuiz);
  copyBtn.addEventListener('click', copyResult);
  pdfBtn.addEventListener('click', exportPDF);

  // Result tab switching
  resultTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.result-tab');
    if (!tab) return;
    switchTab(tab.dataset.tab);
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (quizArea.style.display === 'none') return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevQuestion();
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextQuestion();
    // 数字键 1-5 或字母键 A-E 选择答案
    const keyMap = {'1':1,'2':2,'3':3,'4':4,'5':5,'a':1,'b':2,'c':3,'d':4,'e':5,'A':1,'B':2,'C':3,'D':4,'E':5};
    if (keyMap[e.key] !== undefined) {
      selectAnswer(keyMap[e.key]);
    }
  });

  initQuickNav();
  buildDetailSelector();
}

// ============================================================
// QUIZ FLOW
// ============================================================
function startQuiz() {
  // Clear any stale auto-advance timer
  if (state.autoAdvanceTimer) {
    clearTimeout(state.autoAdvanceTimer);
    state.autoAdvanceTimer = null;
  }

  heroSection.style.display = 'none';
  quizArea.style.display = 'block';
  state.current = 0;
  state.answers = Array(TEST_CONFIG.questions.length).fill(null);
  renderQuestion();
  quizArea.scrollIntoView({ behavior: 'smooth' });
}

function renderQuestion() {
  const q = TEST_CONFIG.questions[state.current];
  const dim = TEST_CONFIG.dimensions[q.dimension];
  const progress = ((state.current + 1) / TEST_CONFIG.questions.length) * 100;

  // Update progress bar
  progressFill.style.width = progress + '%';
  progressText.textContent = `${state.current + 1}/${TEST_CONFIG.questions.length}`;

  // Update question meta
  questionIndex.textContent = `第 ${state.current + 1} 题`;
  questionCount.textContent = `共 ${TEST_CONFIG.questions.length} 题`;

  // Dimension badge
  const dimColor = DIM_COLORS[q.dimension].main;
  questionDimension.textContent = dim.name;
  questionDimension.style.background = dimColor;

  // Question text
  questionText.textContent = q.text;

  // Render Likert options
  optionsEl.innerHTML = '';
  LIKERT_OPTIONS.forEach((opt) => {
    const btn = document.createElement('button');
    btn.className = 'likert-option';
    if (state.answers[state.current] === opt.value) {
      btn.classList.add('selected');
    }
    btn.innerHTML = `
      <span class="likert-option__icon">${opt.icon}</span>
      <span class="likert-option__label">${opt.label.replace('\n', '<br>')}</span>
    `;
    btn.addEventListener('click', () => selectAnswer(opt.value));
    optionsEl.appendChild(btn);
  });

  // Navigation buttons
  prevBtn.disabled = state.current === 0;
  if (state.current === TEST_CONFIG.questions.length - 1) {
    nextBtn.textContent = '✨ 查看结果';
  } else {
    nextBtn.textContent = '下一题 ▶';
  }

  // Nav hint
  const answered = state.answers.filter(a => a !== null).length;
  navHint.textContent = `已答 ${answered}/${TEST_CONFIG.questions.length} 题`;

  // Update quick nav dots
  updateQuickNav();

  // Scroll question into view on mobile
  questionText.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function selectAnswer(value) {
  state.answers[state.current] = value;

  // Re-render options to show selection
  const optionBtns = optionsEl.querySelectorAll('.likert-option');
  optionBtns.forEach((btn, idx) => {
    btn.classList.toggle('selected', LIKERT_OPTIONS[idx].value === value);
  });

  // Clear any pending auto-advance (debounce rapid clicks)
  if (state.autoAdvanceTimer) {
    clearTimeout(state.autoAdvanceTimer);
    state.autoAdvanceTimer = null;
  }

  // Update nav hint and quick nav immediately
  const answered = state.answers.filter(a => a !== null).length;
  navHint.textContent = `已答 ${answered}/${TEST_CONFIG.questions.length} 题`;
  updateQuickNav();

  // Auto-advance after short delay (but don't auto on last question)
  if (state.current < TEST_CONFIG.questions.length - 1) {
    state.autoAdvanceTimer = setTimeout(() => {
      state.autoAdvanceTimer = null;
      state.current++;
      renderQuestion();
    }, 400);
  }
}

function prevQuestion() {
  if (state.current > 0) {
    state.current--;
    renderQuestion();
  }
}

function nextQuestion() {
  // Clear any pending auto-advance
  if (state.autoAdvanceTimer) {
    clearTimeout(state.autoAdvanceTimer);
    state.autoAdvanceTimer = null;
  }

  if (state.current < TEST_CONFIG.questions.length - 1) {
    if (state.answers[state.current] === null) {
      showToast('⚠️ 请先选择一个选项');
      return;
    }
    state.current++;
    renderQuestion();
  } else {
    // Last question → show results
    if (state.answers[state.current] === null) {
      showToast('⚠️ 请先选择一个选项');
      return;
    }
    showResults();
  }
}

// ============================================================
// QUICK NAV DOTS (60 questions)
// ============================================================
function initQuickNav() {
  quickNavDots.innerHTML = '';
  TEST_CONFIG.questions.forEach((q, idx) => {
    const dot = document.createElement('button');
    dot.className = 'quick-nav-dot';
    dot.title = `第 ${idx + 1} 题`;
    dot.addEventListener('click', () => {
      state.current = idx;
      renderQuestion();
      quizArea.scrollIntoView({ behavior: 'smooth' });
    });
    quickNavDots.appendChild(dot);
  });
}

function updateQuickNav() {
  const dots = quickNavDots.querySelectorAll('.quick-nav-dot');
  dots.forEach((dot, idx) => {
    dot.classList.remove('answered', 'current');
    if (idx === state.current) dot.classList.add('current');
    else if (state.answers[idx] !== null) dot.classList.add('answered');
  });
}

// ============================================================
// SCORING
// ============================================================
function scoreTest() {
  const dimScores = {};
  const dimCounts = {};

  // Initialize
  Object.keys(TEST_CONFIG.dimensions).forEach(dim => {
    dimScores[dim] = 0;
    dimCounts[dim] = 0;
  });

  // Score each question
  TEST_CONFIG.questions.forEach((q) => {
    const answer = state.answers[q.id - 1];
    if (answer == null) return;

    let score = answer;
    // Reverse score for negatively-keyed items
    if (q.reverse) {
      score = 6 - answer;
    }

    dimScores[q.dimension] += score;
    dimCounts[q.dimension]++;
  });

  return dimScores;
}

function getScoreLevel(score) {
  for (const level of TEST_CONFIG.scoreLevels) {
    if (score >= level.min && score <= level.max) {
      return level;
    }
  }
  // Edge case: score below range → 低; above range → 高
  if (score < TEST_CONFIG.scoreLevels[0].min) return TEST_CONFIG.scoreLevels[0];
  return TEST_CONFIG.scoreLevels[TEST_CONFIG.scoreLevels.length - 1];
}

function getLevelKey(score) {
  const level = getScoreLevel(score);
  return `${level.min}-${level.max}`;
}

// ============================================================
// RESULTS DISPLAY
// ============================================================
function showResults() {
  quizArea.style.display = 'none';
  calculatingArea.style.display = 'block';
  resultArea.style.display = 'none';
  calculatingArea.scrollIntoView({ behavior: 'smooth' });

  // Animated calculating text
  const texts = [
    '正在分析你的恋爱风格...',
    '计算五维度得分中...',
    '匹配恋爱组合类型...',
    '生成专属深度解读报告...'
  ];
  let idx = 0;
  const textInterval = setInterval(() => {
    idx = (idx + 1) % texts.length;
    calculatingText.textContent = texts[idx];
  }, 1000);

  // Simulate processing delay for UX
  setTimeout(() => {
    clearInterval(textInterval);
    calculatingArea.style.display = 'none';
    resultArea.style.display = 'block';

    renderAllResults();
    resultArea.scrollIntoView({ behavior: 'smooth' });
  }, 2200);
}

function renderAllResults() {
  renderProfileTab();
  renderDetailTab();
  renderCombinedTab();
  renderSummaryTab();

  // Activate first tab
  switchTab('profile');
}

// ---- Tab Switching ----
function switchTab(tabId) {
  state.activeTab = tabId;

  // Update tab buttons
  resultTabs.querySelectorAll('.result-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabId);
  });

  // Update panels
  $$('.result-panel').forEach(p => p.classList.remove('active'));
  const panel = $(`#panel-${tabId}`);
  if (panel) panel.classList.add('active');

  // Trigger chart animation when switching to profile
  if (tabId === 'profile') {
    setTimeout(animateChartBars, 100);
  }
}

// ---- Tab 1: Profile (Bar Chart + Dimension Cards) ----
function renderProfileTab() {
  const scores = scoreTest();
  const dims = TEST_CONFIG.dimensions;

  // Build bar chart
  barChart.innerHTML = '';
  Object.entries(dims).forEach(([dimKey, dim]) => {
    const score = scores[dimKey];
    const level = getScoreLevel(score);
    const pct = ((score - 12) / (60 - 12)) * 100;
    const color = DIM_COLORS[dimKey].main;

    const row = document.createElement('div');
    row.className = 'chart-row';
    row.innerHTML = `
      <div class="chart-label">${dim.icon} ${dim.name}</div>
      <div class="chart-bar-wrap">
        <div class="chart-bar-fill" style="width:0%;background:${color};" data-width="${pct}%">
          <span>${level.label}</span>
        </div>
      </div>
      <div class="chart-score">${score}</div>
      <div class="chart-level">/60</div>
    `;
    barChart.appendChild(row);
  });

  // Animate bars
  setTimeout(animateChartBars, 200);

  // Build dimension summary cards
  dimensionCards.innerHTML = '';
  Object.entries(dims).forEach(([dimKey, dim]) => {
    const score = scores[dimKey];
    const level = getScoreLevel(score);
    const color = DIM_COLORS[dimKey].main;
    const bg = DIM_COLORS[dimKey].light;
    const template = window.__REPORT_TEMPLATES__[dimKey][getLevelKey(score)];

    const card = document.createElement('div');
    card.className = 'dim-card';
    card.style.borderLeft = `4px solid ${color}`;
    card.innerHTML = `
      <div class="dim-card__header">
        <span class="dim-card__icon">${dim.icon}</span>
        <span class="dim-card__name">${dim.name}</span>
        <span class="dim-card__score" style="background:${bg};color:${color};">${score}/60 · ${level.label}</span>
      </div>
      <div class="dim-card__headline">${template.headline}</div>
      <div class="dim-card__summary">${template.summary}</div>
    `;
    card.addEventListener('click', () => {
      state.activeDetailDim = dimKey;
      switchTab('detail');
      updateDetailView();
      // Scroll to top of result
      resultArea.scrollIntoView({ behavior: 'smooth' });
    });
    dimensionCards.appendChild(card);
  });
}

function animateChartBars() {
  const bars = barChart.querySelectorAll('.chart-bar-fill');
  bars.forEach(bar => {
    bar.style.width = bar.dataset.width;
  });
}

// ---- Tab 2: Deep Detail ----
function buildDetailSelector() {
  detailSelector.innerHTML = '';
  Object.entries(TEST_CONFIG.dimensions).forEach(([dimKey, dim]) => {
    const btn = document.createElement('button');
    btn.className = 'detail-dim-btn';
    btn.textContent = `${dim.icon} ${dim.name}`;
    btn.style.borderColor = DIM_COLORS[dimKey].main;
    btn.addEventListener('click', () => {
      state.activeDetailDim = dimKey;
      updateDetailView();
    });
    detailSelector.appendChild(btn);
  });
}

function renderDetailTab() {
  updateDetailView();
}

function updateDetailView() {
  const dimKey = state.activeDetailDim;
  const dim = TEST_CONFIG.dimensions[dimKey];
  const scores = scoreTest();
  const score = scores[dimKey];
  const level = getScoreLevel(score);
  const template = window.__REPORT_TEMPLATES__[dimKey][getLevelKey(score)];
  const color = DIM_COLORS[dimKey].main;

  // Update selector buttons
  detailSelector.querySelectorAll('.detail-dim-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim().endsWith(dim.name));
  });

  detailContent.innerHTML = `
    <div class="detail-header">
      <span class="detail-header__icon">${dim.icon}</span>
      <div class="detail-header__info">
        <div class="detail-header__name">${dim.name}：${template.headline}</div>
        <div class="detail-header__level">
          得分 <strong style="color:${color}">${score}/60</strong> · ${level.label} · ${level.percentile}
        </div>
      </div>
    </div>

    <div class="detail-traits">
      ${(template.traits||[]).map(t => `<span class="detail-trait" style="background:${DIM_COLORS[dimKey].light};color:${color}">${t}</span>`).join('')}
    </div>

    <div class="detail-section">
      <div class="detail-section__title">📖 深度洞察</div>
      <div class="detail-section__content">${template.deepInsight||'暂无深度分析'}</div>
    </div>

    <div class="detail-section">
      <div class="detail-section__title">💪 核心优势</div>
      <div class="detail-section__content">${template.strengths||'暂无优势分析'}</div>
    </div>

    <div class="detail-section">
      <div class="detail-section__title">🌱 成长空间</div>
      <div class="detail-section__content">${template.growthAreas||template.growth||'暂无成长建议'}</div>
    </div>

    <div class="detail-section">
      <div class="detail-section__title">⚠️ 潜在盲区</div>
      <div class="detail-section__content">${template.blindSpots||'暂无盲区分析'}</div>
    </div>

    <div class="detail-section">
      <div class="detail-section__title">🧠 决策风格</div>
      <div class="detail-section__content">${template.decisionMaking||'暂无决策分析'}</div>
    </div>

    <div class="detail-section">
      <div class="detail-section__title">💭 压力与情绪模式</div>
      <div class="detail-section__content">${template.stressAndEmotion||'暂无情绪分析'}</div>
    </div>

    <div class="detail-section">
      <div class="detail-section__title">💬 沟通风格</div>
      <div class="detail-section__content">${template.communication||'暂无沟通分析'}</div>
    </div>

    <div class="detail-section">
      <div class="detail-section__title">💕 人际关系</div>
      <div class="detail-section__content">${template.relationships||'暂无关系分析'}</div>
    </div>

    <div class="detail-section">
      <div class="detail-section__title">💼 职业发展路径</div>
      <div class="detail-section__content">${template.careerPath||template.career||'暂无职业建议'}</div>
    </div>

    <div class="detail-section">
      <div class="detail-section__title">🌅 日常生活节奏</div>
      <div class="detail-section__content">${template.dailyRhythm||'暂无日常建议'}</div>
    </div>

    <div class="detail-section">
      <div class="detail-section__title">🗺️ 成长路线图</div>
      <div class="detail-section__content">${template.growthRoadmap||'暂无路线图'}</div>
    </div>
  `;
}

// ---- Tab 3: Combined Profile ----
function renderCombinedTab() {
  const scores = scoreTest();
  const allLevels = {};
  Object.keys(TEST_CONFIG.dimensions).forEach(dimKey => {
    const score = scores[dimKey];
    const level = getScoreLevel(score);
    // Classify as high/low for pattern matching
    if (level.label === '高' || level.label === '偏高') allLevels[dimKey] = 'high';
    else if (level.label === '低' || level.label === '偏低') allLevels[dimKey] = 'low';
    else allLevels[dimKey] = 'mid';
  });

  // Find matching profiles
  const matchedProfiles = [];
  window.__REPORT_TEMPLATES__.combinedProfiles.forEach(profile => {
    let match = true;
    Object.entries(profile.conditions).forEach(([dimKey, required]) => {
      if (allLevels[dimKey] !== required) match = false;
    });
    if (match) matchedProfiles.push(profile);
  });

  // Build highlight summary: highest and lowest dimensions
  const sortedDims = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const highest = sortedDims[0];
  const lowest = sortedDims[sortedDims.length - 1];

  let html = '';

  // Self-generated combined analysis
  html += `<div class="combined-card matched">
    <div class="combined-card__name">🎯 你的核心恋爱配置</div>
    <div class="combined-card__desc">
      你的<strong style="color:${DIM_COLORS[highest[0]].main}">${TEST_CONFIG.dimensions[highest[0]].name}</strong>得分最高（${highest[1]}/60），
      而<strong style="color:${DIM_COLORS[lowest[0]].main}">${TEST_CONFIG.dimensions[lowest[0]].name}</strong>得分最低（${lowest[1]}/60）。
      这一高一低的张力，构成了你恋爱风格的基本动力结构。
    </div>
  </div>`;

  // Matched pre-defined profiles
  if (matchedProfiles.length > 0) {
    html += `<p style="margin:16px 0 10px;font-weight:700;color:var(--text-secondary);">以下是与你的维度组合匹配的恋爱类型：</p>`;
    matchedProfiles.forEach(profile => {
      html += `<div class="combined-card matched">
        <div class="combined-card__name">${profile.name}</div>
        <div class="combined-card__desc">${profile.description}</div>
        <div class="combined-card__famous">${profile.famous}</div>
        <div class="combined-card__advice">💡 ${profile.advice}</div>
      </div>`;
    });
  }

  // All profiles for reference
  html += `<p style="margin:20px 0 10px;font-weight:700;color:var(--text-secondary);">参考：其他恋爱类型一览</p>`;
  window.__REPORT_TEMPLATES__.combinedProfiles.forEach(profile => {
    const isMatched = matchedProfiles.includes(profile);
    html += `<div class="combined-card ${isMatched ? 'matched' : ''}">
      <div class="combined-card__name">${isMatched ? '✅ ' : ''}${profile.name}</div>
      <div class="combined-card__desc">${profile.description}</div>
      <div class="combined-card__famous">${profile.famous}</div>
    </div>`;
  });

  combinedContent.innerHTML = html;
}

// ---- Tab 4: Summary ----
function renderSummaryTab() {
  const scores = scoreTest();
  let html = '';

  // Overall summary
  html += `<div class="summary-section">
    <div class="summary-section__title">🧬 整体人格画像</div>
    <p style="font-size:14px;color:var(--text-secondary);line-height:1.8;">`;

  const sortedDims = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  sortedDims.forEach(([dimKey, score], idx) => {
    const dim = TEST_CONFIG.dimensions[dimKey];
    const level = getScoreLevel(score);
    const color = DIM_COLORS[dimKey].main;
    html += `${idx + 1}. <strong style="color:${color}">${dim.icon} ${dim.name}：${score}/60（${level.label}）</strong><br>`;
  });

  html += `</p></div>`;

  // Per-dimension growth advice
  html += `<div class="summary-section">
    <div class="summary-section__title">🌱 各维度发展建议</div>`;

  Object.entries(scores).forEach(([dimKey, score]) => {
    const dim = TEST_CONFIG.dimensions[dimKey];
    const template = window.__REPORT_TEMPLATES__[dimKey][getLevelKey(score)];
    const color = DIM_COLORS[dimKey].main;

    html += `<div class="summary-dim-item" style="border-left:3px solid ${color}">
      <span class="summary-dim-item__icon">${dim.icon}</span>
      <div>
        <div class="summary-dim-item__name" style="color:${color}">${dim.name}：${template.headline}</div>
        <div class="summary-dim-item__text">${template.growthAreas||template.growth||''}</div>
      </div>
    </div>`;
  });

  html += `</div>`;

  // Final words
  html += `<div class="summary-section">
    <div class="summary-section__title">💫 最后的话</div>
    <p style="font-size:14px;color:var(--text-secondary);line-height:1.8;">
      恋爱风格没有好坏之分，每个维度的每个位置都有其独特的优势和挑战。
      这份测评揭示的不是"你是什么样的恋人"，而是"你在恋爱中倾向于如何感受、表达和连接"。
      了解自己的恋爱风格，不是为了给自己贴标签，而是为了更好地理解自己在爱中的行为模式，
      从而在适合自己天性的方式中，去爱、去成长、去建立更健康更幸福的亲密关系。
    </p>
    <p style="font-size:13px;color:var(--muted);margin-top:8px;">
      本测评基于依恋理论、爱情三角理论等公开学术资源改编。
      结果仅供自我探索参考，不构成婚恋建议或临床诊断。如需专业的情感咨询，请咨询持证心理咨询师。
    </p>
  </div>`;

  summaryContent.innerHTML = html;
}

// ============================================================
// COPY RESULT
// ============================================================
async function copyResult() {
  const scores = scoreTest();
  let text = `═══════════════════════════════\n`;
  text += `  🧠 ${TEST_CONFIG.title}\n`;
  text += `  基于IPIP国际人格项目库 · 60题专业版\n`;
  text += `═══════════════════════════════\n\n`;
  text += `📊 五维度得分总览\n`;
  text += `───────────────────────────────\n`;

  Object.entries(TEST_CONFIG.dimensions).forEach(([dimKey, dim]) => {
    const score = scores[dimKey];
    const level = getScoreLevel(score);
    const bar = '█'.repeat(Math.round((score - 12) / 48 * 20));
    text += `${dim.icon} ${dim.name}：${score}/60 ${bar} ${level.label}\n`;
  });

  text += `\n───────────────────────────────\n`;
  text += `🔍 各维度详细解读\n`;
  text += `───────────────────────────────\n\n`;

  Object.entries(TEST_CONFIG.dimensions).forEach(([dimKey, dim]) => {
    const score = scores[dimKey];
    const template = window.__REPORT_TEMPLATES__[dimKey][getLevelKey(score)];
    text += `【${dim.icon} ${dim.name}：${template.headline}】\n`;
    text += `得分：${score}/60（${getScoreLevel(score).label}）\n`;
    text += `特质标签：${(template.traits||[]).join('、')}\n`;
    text += `深度洞察：${(template.deepInsight||'').replace(/<br>/g,'\n')}\n`;
    text += `核心优势：${template.strengths||''}\n`;
    text += `成长空间：${template.growthAreas||template.growth||''}\n`;
    text += `潜在盲区：${template.blindSpots||''}\n`;
    text += `决策风格：${template.decisionMaking||''}\n`;
    text += `压力与情绪：${template.stressAndEmotion||''}\n`;
    text += `沟通风格：${template.communication||''}\n`;
    text += `人际关系：${template.relationships||''}\n`;
    text += `职业路径：${template.careerPath||template.career||''}\n`;
    text += `成长路线图：${(template.growthRoadmap||'').replace(/<br>/g,'\n')}\n\n`;
  });

  text += `═══════════════════════════════\n`;
  text += `结果仅供自我探索参考\n`;
  text += `基于IPIP公有领域学术资源\n`;
  text += `═══════════════════════════════\n`;

  try {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = '✅ 已复制！';
    setTimeout(() => { copyBtn.textContent = '📋 复制结果报告'; }, 2000);
  } catch {
    copyBtn.textContent = '❌ 复制失败';
    setTimeout(() => { copyBtn.textContent = '📋 复制结果报告'; }, 2000);
  }
}

// ============================================================
// EXPORT PDF
// ============================================================
async function exportPDF() {
  const origText = pdfBtn.textContent;
  pdfBtn.textContent = '⏳ 生成中...';
  pdfBtn.disabled = true;

  const scores = scoreTest();
  const dims = TEST_CONFIG.dimensions;

  // Build a clean report HTML combining all 4 tabs
  let reportHTML = `
    <div style="font-family:'PingFang SC','Microsoft YaHei',sans-serif;color:#2D1B2E;padding:24px;max-width:700px;margin:0 auto;">
      <h1 style="text-align:center;font-size:22px;color:#E8736E;margin-bottom:4px;">💕 ${TEST_CONFIG.title}</h1>
      <p style="text-align:center;font-size:12px;color:#A090A0;margin-bottom:20px;">${TEST_CONFIG.subtitle}  |  报告生成时间：${new Date().toLocaleDateString('zh-CN')}</p>
      <hr style="border:none;border-top:2px solid #F0E0E5;margin-bottom:20px;">

      <h2 style="font-size:17px;color:#E8736E;margin-bottom:12px;">📊 五维度得分总览</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr style="background:#FDF0EF;font-weight:700;font-size:13px;">
          <td style="padding:8px 10px;border:1px solid #F0E0E5;">维度</td>
          <td style="padding:8px 10px;border:1px solid #F0E0E5;">得分</td>
          <td style="padding:8px 10px;border:1px solid #F0E0E5;">等级</td>
          <td style="padding:8px 10px;border:1px solid #F0E0E5;">类型</td>
        </tr>`;

  Object.entries(dims).forEach(([dimKey, dim]) => {
    const score = scores[dimKey];
    const level = getScoreLevel(score);
    const template = window.__REPORT_TEMPLATES__[dimKey][getLevelKey(score)];
    reportHTML += `
        <tr style="font-size:13px;">
          <td style="padding:8px 10px;border:1px solid #F0E0E5;">${dim.icon} ${dim.name}</td>
          <td style="padding:8px 10px;border:1px solid #F0E0E5;font-weight:700;">${score}/60</td>
          <td style="padding:8px 10px;border:1px solid #F0E0E5;color:${level.color};">${level.label}</td>
          <td style="padding:8px 10px;border:1px solid #F0E0E5;">${template.headline}</td>
        </tr>`;
  });

  reportHTML += `</table>`;

  // Per-dimension deep dive
  reportHTML += `<h2 style="font-size:17px;color:#E8736E;margin-bottom:12px;">🔍 各维度深度解读</h2>`;

  Object.entries(dims).forEach(([dimKey, dim]) => {
    const score = scores[dimKey];
    const level = getScoreLevel(score);
    const template = window.__REPORT_TEMPLATES__[dimKey][getLevelKey(score)];

    reportHTML += `
      <div style="margin-bottom:16px;padding:14px;background:#FEFCFB;border-left:4px solid ${level.color};border-radius:4px;">
        <h3 style="font-size:15px;color:${level.color};margin:0 0 6px 0;">${dim.icon} ${dim.name}：${template.headline}（${score}/60 · ${level.label}）</h3>
        <p style="font-size:12px;color:#6B5B6B;line-height:1.8;margin:0 0 10px 0;">${template.deepInsight.replace(/<br\s*\/?>/g,'\n')}</p>
        <p style="font-size:12px;color:#6B5B6B;line-height:1.8;margin:0 0 4px 0;"><strong>💪 核心优势：</strong>${template.strengths.replace(/<br\s*\/?>/g,'\n')}</p>
        <p style="font-size:12px;color:#6B5B6B;line-height:1.8;margin:0 0 4px 0;"><strong>🌱 成长空间：</strong>${(template.growthAreas||'').replace(/<br\s*\/?>/g,'\n')}</p>
        <p style="font-size:12px;color:#6B5B6B;line-height:1.8;margin:0;"><strong>🗺️ 成长路线：</strong>${template.growthRoadmap.replace(/<br\s*\/?>/g,'\n')}</p>
      </div>`;
  });

  // Combined profile
  const allLevels = {};
  Object.keys(dims).forEach(dk => {
    const lvl = getScoreLevel(scores[dk]);
    if (lvl.label === '高' || lvl.label === '偏高') allLevels[dk] = 'high';
    else if (lvl.label === '低' || lvl.label === '偏低') allLevels[dk] = 'low';
    else allLevels[dk] = 'mid';
  });

  const matched = window.__REPORT_TEMPLATES__.combinedProfiles.filter(p => {
    return Object.entries(p.conditions).every(([dk, req]) => allLevels[dk] === req);
  });

  if (matched.length > 0) {
    reportHTML += `<h2 style="font-size:17px;color:#E8736E;margin-bottom:12px;">🧩 匹配的恋爱类型</h2>`;
    matched.forEach(p => {
      reportHTML += `
        <div style="margin-bottom:12px;padding:14px;background:#FFF5ED;border-radius:4px;">
          <h3 style="font-size:14px;color:#E8985E;margin:0 0 6px 0;">${p.name}</h3>
          <p style="font-size:12px;color:#6B5B6B;line-height:1.8;margin:0 0 4px 0;">${p.description}</p>
          <p style="font-size:12px;color:#6B5B6B;line-height:1.8;margin:0 0 4px 0;">${p.famous}</p>
          <p style="font-size:12px;color:#6B5B6B;line-height:1.8;margin:0;">💡 ${p.advice}</p>
        </div>`;
    });
  }

  reportHTML += `
      <hr style="border:none;border-top:1px solid #F0E0E5;margin:20px 0;">
      <p style="text-align:center;font-size:11px;color:#A090A0;">${TEST_CONFIG.disclaimer}</p>
    </div>`;

  // Use html2pdf to generate and download
  try {
    // Create temporary element
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:700px;z-index:-1;';
    container.innerHTML = reportHTML;
    document.body.appendChild(container);

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${TEST_CONFIG.title}_${new Date().toISOString().slice(0,10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    await html2pdf().set(opt).from(container).save();

    document.body.removeChild(container);
    pdfBtn.textContent = '✅ 下载完成！';
    setTimeout(() => { pdfBtn.textContent = origText; pdfBtn.disabled = false; }, 2500);
  } catch (err) {
    console.error('PDF export failed:', err);
    pdfBtn.textContent = '❌ 导出失败，请重试';
    setTimeout(() => { pdfBtn.textContent = origText; pdfBtn.disabled = false; }, 2500);
  }
}

// ============================================================
// RESTART
// ============================================================
function restartQuiz() {
  resultArea.style.display = 'none';
  heroSection.style.display = 'block';
  state.current = 0;
  state.answers = Array(TEST_CONFIG.questions.length).fill(null);
  state.activeTab = 'profile';
  heroSection.scrollIntoView({ behavior: 'smooth' });
}

// ============================================================
// TOAST UTILITY
// ============================================================
function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2000);
}

// ============================================================
// BOOT
// ============================================================
init();
