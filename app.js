const storageKey = "mood_records_v1";
const summaryKey = "mood_summaries_v1";

const moodGroups = [
  ["不安类", ["焦虑", "紧张", "慌乱", "害怕", "担心", "没安全感", "坐立不安"]],
  ["愤怒类", ["生气", "烦躁", "委屈", "被冒犯", "不服气", "怨恨", "想爆发"]],
  ["低落类", ["难过", "失落", "沮丧", "空虚", "孤独", "想哭", "没动力"]],
  ["压力类", ["累", "崩溃", "压抑", "承受不住", "心很沉", "脑子很乱", "快撑不住"]],
  ["自我攻击类", ["内疚", "羞耻", "自责", "觉得自己很差", "觉得自己没用", "后悔", "害怕被讨厌"]],
  ["关系受伤类", ["不被理解", "被忽视", "被否定", "被抛下", "被控制", "被比较", "不被在乎"]],
  ["麻木/断开类", ["麻木", "空白", "没感觉", "像旁观者", "不真实", "什么都不想说", "想消失一会儿"]],
  ["积极/稳定类", ["平静", "放松", "开心", "满足", "安心", "有希望", "被支持"]],
  ["其他", ["说不清"]]
];

const unclearOptions = ["心里堵着", "身体紧绷", "脑子很乱", "想哭", "想逃走", "想发火", "很累", "很空", "不想动", "不想说话"];
const triggerOptions = ["和别人聊天", "被批评/否定", "被忽视", "工作/学习压力", "想起过去的事", "看到某些内容", "身体不舒服", "睡眠不好", "计划被打乱", "没有明显原因"];
const copingOptions = ["深呼吸", "离开现场", "找人说了说", "写下来", "哭了一会儿", "睡觉/休息", "刷手机", "吃东西", "忍住了", "发火了", "解释/沟通了", "运动/散步", "什么都没做"];
const changeOptions = ["轻了一点", "没变化", "更强了", "变成另一种情绪", "清楚了一点", "更累了", "想休息", "想继续处理"];

const encouragements = {
  default: "今天不需要马上变好。先看见自己，就已经很重要。",
  焦虑: "你不用立刻解决所有问题，可以先把呼吸放慢一点。",
  紧张: "紧张说明你正在认真面对一些事，慢一点也可以。",
  难过: "难过的时候，不必急着解释自己。先陪自己待一会儿。",
  委屈: "委屈也值得被看见，它常常在提醒你有需要没有被听见。",
  生气: "愤怒也许是在提醒你：有些边界需要被认真对待。",
  累: "今天能记录下来，就说明你还在努力照顾自己。",
  麻木: "说不清也没关系，先允许自己慢慢回来。",
  平静: "平静的时刻也值得被记录，它们会成为你回看的证据。"
};

const state = {
  records: loadJSON(storageKey, []),
  summaries: loadJSON(summaryKey, {}),
  currentStep: 0,
  activeView: "record",
  trendPeriod: "day",
  historyDate: toDateKey(new Date()),
  editingId: "",
  activeDetailId: "",
  draft: {
    mood: "",
    unclear: "",
    intensity: 5,
    trigger: "",
    event: "",
    coping: "",
    copingText: "",
    change: "",
    after: 4,
    note: ""
  }
};

const steps = ["stepMood", "stepIntensity", "stepEvent", "stepCoping", "stepChange"];
const titles = {
  record: "记录此刻",
  today: "今天的状态",
  trends: "趋势总结",
  history: "回看记录"
};

document.addEventListener("DOMContentLoaded", () => {
  initStaticUI();
  bindEvents();
  renderAll();
  registerServiceWorker();
});

function initStaticUI() {
  document.getElementById("todayLabel").textContent = formatDateLong(new Date());
  renderMoodPicker();
  renderChipGroup("unclearOptions", unclearOptions, "unclear");
  renderChipGroup("triggerOptions", triggerOptions, "trigger");
  renderChipGroup("copingOptions", copingOptions, "coping");
  renderChipGroup("changeOptions", changeOptions, "change");
  document.getElementById("historyDate").value = state.historyDate;
}

function bindEvents() {
  document.querySelectorAll(".bottom-nav button").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  document.querySelectorAll(".segmented button").forEach((button) => {
    button.addEventListener("click", () => {
      state.trendPeriod = button.dataset.period;
      document.querySelectorAll(".segmented button").forEach((item) => item.classList.toggle("active", item === button));
      renderTrends();
    });
  });

  document.getElementById("openMoodPicker").addEventListener("click", () => toggleSheet(true));
  document.getElementById("closeMoodPicker").addEventListener("click", () => toggleSheet(false));
  document.querySelector(".sheet-backdrop").addEventListener("click", () => toggleSheet(false));
  document.getElementById("closeDetail").addEventListener("click", closeDetail);
  document.querySelector(".detail-backdrop").addEventListener("click", closeDetail);
  document.getElementById("detailEdit").addEventListener("click", () => {
    const id = state.activeDetailId;
    closeDetail();
    editRecord(id);
  });
  document.getElementById("detailDelete").addEventListener("click", () => deleteRecord(state.activeDetailId));
  document.getElementById("backStep").addEventListener("click", previousStep);
  document.getElementById("nextStep").addEventListener("click", nextStep);
  document.getElementById("cancelEdit").addEventListener("click", cancelEdit);

  document.getElementById("intensityInput").addEventListener("input", (event) => {
    state.draft.intensity = Number(event.target.value);
    document.getElementById("intensityValue").textContent = state.draft.intensity;
  });
  document.getElementById("afterInput").addEventListener("input", (event) => {
    state.draft.after = Number(event.target.value);
    document.getElementById("afterValue").textContent = state.draft.after;
  });

  document.getElementById("eventText").addEventListener("input", (event) => state.draft.event = event.target.value.trim());
  document.getElementById("copingText").addEventListener("input", (event) => state.draft.copingText = event.target.value.trim());
  document.getElementById("noteText").addEventListener("input", (event) => state.draft.note = event.target.value.trim());

  document.getElementById("dailySummaryText").addEventListener("input", (event) => {
    state.summaries[`day:${toDateKey(new Date())}`] = event.target.value;
    saveJSON(summaryKey, state.summaries);
  });

  document.getElementById("periodSummaryText").addEventListener("input", (event) => {
    state.summaries[summaryStorageKey()] = event.target.value;
    saveJSON(summaryKey, state.summaries);
  });

  document.getElementById("historyDate").addEventListener("change", (event) => {
    state.historyDate = event.target.value || toDateKey(new Date());
    renderHistory();
  });
  document.getElementById("prevDay").addEventListener("click", () => shiftHistoryDate(-1));
  document.getElementById("nextDay").addEventListener("click", () => shiftHistoryDate(1));

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    window.deferredInstallPrompt = event;
    document.getElementById("installBtn").classList.remove("hidden");
  });
  document.getElementById("installBtn").addEventListener("click", async () => {
    if (!window.deferredInstallPrompt) return;
    window.deferredInstallPrompt.prompt();
    await window.deferredInstallPrompt.userChoice;
    window.deferredInstallPrompt = null;
    document.getElementById("installBtn").classList.add("hidden");
  });
}

function renderAll() {
  renderWizard();
  renderEncouragement();
  renderToday();
  renderTrends();
  renderHistory();
}

function switchView(view) {
  state.activeView = view;
  document.querySelectorAll(".view").forEach((node) => node.classList.toggle("active", node.id === `view-${view}`));
  document.querySelectorAll(".bottom-nav button").forEach((node) => node.classList.toggle("active", node.dataset.view === view));
  document.getElementById("pageTitle").textContent = titles[view];
  if (view === "today") renderToday();
  if (view === "trends") renderTrends();
  if (view === "history") renderHistory();
}

function renderMoodPicker() {
  const wrap = document.getElementById("moodGroups");
  wrap.innerHTML = "";
  moodGroups.forEach(([title, moods]) => {
    const group = document.createElement("section");
    group.className = "mood-group";
    group.innerHTML = `<h3>${title}</h3>`;
    const chips = document.createElement("div");
    chips.className = "chip-grid";
    moods.forEach((mood) => {
      const button = document.createElement("button");
      button.className = "chip";
      button.type = "button";
      button.textContent = mood;
      button.addEventListener("click", () => {
        state.draft.mood = mood;
        state.draft.unclear = "";
        document.getElementById("selectedMoodText").textContent = mood;
        document.getElementById("unclearPanel").classList.toggle("hidden", mood !== "说不清");
        toggleSheet(false);
        renderMoodPicker();
      });
      if (state.draft.mood === mood) button.classList.add("active");
      chips.appendChild(button);
    });
    group.appendChild(chips);
    wrap.appendChild(group);
  });
}

function renderChipGroup(id, options, key) {
  const wrap = document.getElementById(id);
  wrap.innerHTML = "";
  options.forEach((option) => {
    const button = document.createElement("button");
    button.className = "chip";
    button.type = "button";
    button.textContent = option;
    button.addEventListener("click", () => {
      state.draft[key] = state.draft[key] === option ? "" : option;
      renderChipGroup(id, options, key);
    });
    if (state.draft[key] === option) button.classList.add("active");
    wrap.appendChild(button);
  });
}

function renderWizard() {
  steps.forEach((id, index) => {
    document.getElementById(id).classList.toggle("active", index === state.currentStep);
  });
  document.getElementById("stepText").textContent = `${state.currentStep + 1} / ${steps.length}`;
  document.getElementById("progressBar").style.width = `${((state.currentStep + 1) / steps.length) * 100}%`;
  document.getElementById("backStep").disabled = state.currentStep === 0;
  document.getElementById("backStep").style.opacity = state.currentStep === 0 ? "0.45" : "1";
  document.getElementById("nextStep").textContent = state.currentStep === steps.length - 1
    ? (state.editingId ? "保存修改" : "完成记录")
    : "下一步";
  document.getElementById("editingNotice").classList.toggle("hidden", !state.editingId);
}

function previousStep() {
  if (state.currentStep > 0) {
    state.currentStep -= 1;
    renderWizard();
  }
}

function nextStep() {
  if (state.currentStep === 0 && !state.draft.mood) {
    pulse(document.getElementById("openMoodPicker"));
    return;
  }
  if (state.currentStep < steps.length - 1) {
    state.currentStep += 1;
    renderWizard();
    return;
  }
  saveRecord();
}

function saveRecord() {
  const now = new Date();
  const mood = state.draft.mood === "说不清" && state.draft.unclear
    ? `说不清：${state.draft.unclear}`
    : state.draft.mood;
  const existing = state.records.find((item) => item.id === state.editingId);
  const record = {
    id: existing?.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    datetime: existing?.datetime || now.toISOString(),
    mood,
    intensity: state.draft.intensity,
    trigger: state.draft.trigger,
    event: state.draft.event,
    coping: state.draft.coping,
    copingText: state.draft.copingText,
    change: state.draft.change,
    after: state.draft.after,
    note: state.draft.note
  };
  if (existing) {
    state.records = state.records.map((item) => item.id === existing.id ? record : item);
  } else {
    state.records.unshift(record);
  }
  saveJSON(storageKey, state.records);
  resetDraft();
  switchView("today");
}

function resetDraft() {
  state.currentStep = 0;
  state.editingId = "";
  state.draft = { mood: "", unclear: "", intensity: 5, trigger: "", event: "", coping: "", copingText: "", change: "", after: 4, note: "" };
  document.getElementById("selectedMoodText").textContent = "选择状态";
  document.getElementById("unclearPanel").classList.add("hidden");
  document.getElementById("intensityInput").value = 5;
  document.getElementById("afterInput").value = 4;
  document.getElementById("intensityValue").textContent = "5";
  document.getElementById("afterValue").textContent = "4";
  ["eventText", "copingText", "noteText"].forEach((id) => document.getElementById(id).value = "");
  renderChipGroup("unclearOptions", unclearOptions, "unclear");
  renderChipGroup("triggerOptions", triggerOptions, "trigger");
  renderChipGroup("copingOptions", copingOptions, "coping");
  renderChipGroup("changeOptions", changeOptions, "change");
  renderMoodPicker();
  renderWizard();
}

function cancelEdit() {
  resetDraft();
  switchView("record");
}

function renderEncouragement() {
  const today = recordsForDate(toDateKey(new Date()));
  const mood = topValue(today.map((item) => baseMood(item.mood)));
  document.getElementById("encouragementText").textContent = encouragements[mood] || encouragements.default;
}

function renderToday() {
  const key = toDateKey(new Date());
  const records = recordsForDate(key);
  document.getElementById("todayCount").textContent = `${records.length} 次记录`;
  document.getElementById("todayStats").innerHTML = statsHTML(records);
  document.getElementById("todayCurve").innerHTML = curveHTML(records);
  document.getElementById("autoDailySummary").textContent = buildSummary(records, "今天");
  document.getElementById("dailySummaryText").value = state.summaries[`day:${key}`] || "";
  renderRecordList("todayList", records);
  renderEncouragement();
}

function renderTrends() {
  const records = recordsForPeriod(state.trendPeriod);
  const labels = { day: "今日趋势", week: "本周总结", month: "本月总结" };
  const scope = { day: "今天", week: "这一周", month: "这个月" };
  document.getElementById("trendTitle").textContent = labels[state.trendPeriod];
  document.getElementById("trendRange").textContent = periodRangeLabel(state.trendPeriod);
  document.getElementById("trendStats").innerHTML = statsHTML(records);
  document.getElementById("trendChart").innerHTML = barChartHTML(records, state.trendPeriod);
  document.getElementById("periodSummaryTitle").textContent = `${labels[state.trendPeriod]}提示`;
  document.getElementById("periodAutoSummary").textContent = buildSummary(records, scope[state.trendPeriod]);
  document.getElementById("periodSummaryText").value = state.summaries[summaryStorageKey()] || "";
}

function renderHistory() {
  const date = state.historyDate || toDateKey(new Date());
  document.getElementById("historyDate").value = date;
  document.getElementById("historyTitle").textContent = formatDateLong(parseDate(date));
  const records = recordsForDate(date);
  document.getElementById("historyCount").textContent = `${records.length} 次记录`;
  renderCalendar(date);
  renderRecordList("historyList", records);
  renderTimeline();
}

function renderCalendar(dateKey) {
  const wrap = document.getElementById("calendarGrid");
  wrap.innerHTML = "";
  const selected = parseDate(dateKey);
  const first = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const last = new Date(selected.getFullYear(), selected.getMonth() + 1, 0);
  const offset = (first.getDay() + 6) % 7;
  const recordDates = new Set(state.records.map((item) => toDateKey(new Date(item.datetime))));
  for (let i = 0; i < offset; i += 1) wrap.appendChild(document.createElement("div"));
  for (let day = 1; day <= last.getDate(); day += 1) {
    const key = toDateKey(new Date(selected.getFullYear(), selected.getMonth(), day));
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-cell";
    button.textContent = String(day);
    button.classList.toggle("selected", key === dateKey);
    button.classList.toggle("has-record", recordDates.has(key));
    button.addEventListener("click", () => {
      state.historyDate = key;
      renderHistory();
    });
    wrap.appendChild(button);
  }
}

function renderTimeline() {
  const wrap = document.getElementById("allTimeline");
  const grouped = groupByDate(state.records);
  const keys = Object.keys(grouped).sort().reverse();
  if (!keys.length) {
    wrap.innerHTML = `<div class="empty">还没有记录。等你写下第一条，它会出现在这里。</div>`;
    return;
  }
  wrap.innerHTML = keys.map((key) => {
    const records = grouped[key];
    const mood = topValue(records.map((item) => baseMood(item.mood))) || "未记录";
    const max = records.length ? Math.max(...records.map((item) => item.intensity)) : 0;
    return `<button class="timeline-day" type="button" data-date="${key}">
      <strong>${formatDateLong(parseDate(key))}</strong>
      <span>主要状态：${mood} · ${records.length} 次 · 最高强度 ${max}</span>
    </button>`;
  }).join("");
  wrap.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.historyDate = button.dataset.date;
      renderHistory();
    });
  });
}

function renderRecordList(id, records) {
  const wrap = document.getElementById(id);
  if (!records.length) {
    wrap.innerHTML = `<div class="empty">这一天还没有记录。你可以先从一个最接近的状态开始。</div>`;
    return;
  }
  wrap.innerHTML = "";
  const template = document.getElementById("recordTemplate");
  records.forEach((record) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.tabIndex = 0;
    node.querySelector(".record-time").textContent = formatTime(new Date(record.datetime));
    node.querySelector("strong").textContent = record.mood;
    node.querySelector("p").textContent = record.event || record.trigger || "没有写具体事件";
    node.querySelector("small").textContent = `${record.coping || "未记录应对"} · ${record.intensity} → ${record.after}`;
    node.querySelector(".record-score").textContent = record.intensity;
    node.addEventListener("click", () => openDetail(record.id));
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") openDetail(record.id);
    });
    node.querySelector(".edit-record").addEventListener("click", (event) => {
      event.stopPropagation();
      editRecord(record.id);
    });
    node.querySelector(".delete-record").addEventListener("click", (event) => {
      event.stopPropagation();
      deleteRecord(record.id);
    });
    wrap.appendChild(node);
  });
}

function openDetail(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return;
  state.activeDetailId = id;
  const date = new Date(record.datetime);
  document.getElementById("detailContent").innerHTML = `
    <div class="detail-hero">
      <div>
        <strong>${escapeHTML(record.mood)}</strong>
        <span>${formatDateLong(date)} ${formatTime(date)} · ${record.intensity} → ${record.after}</span>
      </div>
      <div class="detail-score">${record.intensity}</div>
    </div>
    ${detailField("发生前的线索", record.trigger)}
    ${detailField("发生了什么", record.event)}
    ${detailField("我是怎么应对的", [record.coping, record.copingText].filter(Boolean).join("："))}
    ${detailField("应对后的变化", record.change)}
    ${detailField("备注", record.note)}
  `;
  const sheet = document.getElementById("detailSheet");
  sheet.classList.remove("hidden");
  sheet.setAttribute("aria-hidden", "false");
}

function closeDetail() {
  state.activeDetailId = "";
  const sheet = document.getElementById("detailSheet");
  sheet.classList.add("hidden");
  sheet.setAttribute("aria-hidden", "true");
}

function detailField(label, value) {
  return `<div class="detail-field"><span>${label}</span><p>${escapeHTML(value || "未记录")}</p></div>`;
}

function editRecord(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return;
  closeDetail();
  const unclearPrefix = "说不清：";
  state.editingId = id;
  state.currentStep = 0;
  state.draft = {
    mood: record.mood.startsWith(unclearPrefix) ? "说不清" : record.mood,
    unclear: record.mood.startsWith(unclearPrefix) ? record.mood.slice(unclearPrefix.length) : "",
    intensity: record.intensity,
    trigger: record.trigger || "",
    event: record.event || "",
    coping: record.coping || "",
    copingText: record.copingText || "",
    change: record.change || "",
    after: record.after,
    note: record.note || ""
  };
  document.getElementById("selectedMoodText").textContent = state.draft.mood;
  document.getElementById("unclearPanel").classList.toggle("hidden", state.draft.mood !== "说不清");
  document.getElementById("intensityInput").value = state.draft.intensity;
  document.getElementById("afterInput").value = state.draft.after;
  document.getElementById("intensityValue").textContent = state.draft.intensity;
  document.getElementById("afterValue").textContent = state.draft.after;
  document.getElementById("eventText").value = state.draft.event;
  document.getElementById("copingText").value = state.draft.copingText;
  document.getElementById("noteText").value = state.draft.note;
  renderChipGroup("unclearOptions", unclearOptions, "unclear");
  renderChipGroup("triggerOptions", triggerOptions, "trigger");
  renderChipGroup("copingOptions", copingOptions, "coping");
  renderChipGroup("changeOptions", changeOptions, "change");
  renderMoodPicker();
  renderWizard();
  switchView("record");
}

function deleteRecord(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return;
  const ok = confirm(`确定删除这条「${record.mood}」记录吗？删除后不能恢复。`);
  if (!ok) return;
  state.records = state.records.filter((item) => item.id !== id);
  if (state.editingId === id) resetDraft();
  if (state.activeDetailId === id) closeDetail();
  saveJSON(storageKey, state.records);
  renderAll();
}

function statsHTML(records) {
  const count = records.length;
  const topMood = topValue(records.map((item) => baseMood(item.mood))) || "暂无";
  const max = count ? Math.max(...records.map((item) => item.intensity)) : 0;
  const avg = count ? (records.reduce((sum, item) => sum + item.intensity, 0) / count).toFixed(1) : "0.0";
  return [
    stat("记录", `${count}`, "次"),
    stat("主要", topMood, "状态"),
    stat("平均", avg, "强度")
  ].join("") + stat("最高", `${max}`, "强度");
}

function stat(label, value, caption) {
  return `<div class="stat"><strong>${value}</strong><span>${label}${caption}</span></div>`;
}

function curveHTML(records) {
  const sorted = [...records].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  if (!sorted.length) return `<div class="empty">今天记录后，这里会出现情绪曲线。</div>`;
  const points = sorted.length === 1
    ? [[160, 64]]
    : sorted.map((item, index) => [16 + index * (288 / (sorted.length - 1)), 112 - item.intensity * 10]);
  const path = points.map((point, index) => `${index ? "L" : "M"}${point[0].toFixed(1)} ${point[1].toFixed(1)}`).join(" ");
  const circles = points.map((point) => `<circle cx="${point[0]}" cy="${point[1]}" r="5" fill="#dfaaa3"/>`).join("");
  return `<svg viewBox="0 0 320 128" role="img" aria-label="情绪变化曲线">
    <path d="${path}" fill="none" stroke="#8fa78d" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    ${circles}
  </svg>`;
}

function barChartHTML(records, period) {
  const buckets = periodBuckets(period);
  return buckets.map(({ label, key }) => {
    const items = records.filter((item) => bucketKey(new Date(item.datetime), period) === key);
    const avg = items.length ? items.reduce((sum, item) => sum + item.intensity, 0) / items.length : 0;
    const height = Math.max(8, avg * 9);
    return `<div class="bar"><i style="height:${height}px"></i><span>${label}</span></div>`;
  }).join("");
}

function buildSummary(records, scope) {
  if (!records.length) return `${scope}还没有记录。等你愿意的时候，先写下一条最接近的状态就好。`;
  const topMood = topValue(records.map((item) => baseMood(item.mood)));
  const maxRecord = records.reduce((max, item) => item.intensity > max.intensity ? item : max, records[0]);
  const topTrigger = topValue(records.map((item) => item.trigger).filter(Boolean));
  const helpful = records
    .filter((item) => item.after < item.intensity && item.coping)
    .sort((a, b) => (b.intensity - b.after) - (a.intensity - a.after))[0];
  const parts = [`${scope}主要出现的是「${topMood}」，强度最高的一次在 ${formatTime(new Date(maxRecord.datetime))}，是 ${maxRecord.intensity} 分。`];
  if (topTrigger) parts.push(`常见触发线索是「${topTrigger}」。`);
  if (helpful) parts.push(`「${helpful.coping}」之后，情绪从 ${helpful.intensity} 降到 ${helpful.after}。`);
  return parts.join("");
}

function periodBuckets(period) {
  const now = new Date();
  if (period === "day") {
    return ["早", "午", "晚", "夜"].map((label, index) => ({ label, key: String(index) }));
  }
  if (period === "week") {
    return ["一", "二", "三", "四", "五", "六", "日"].map((label, index) => ({ label, key: String(index) }));
  }
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Array.from({ length: Math.ceil(days / 5) }, (_, index) => ({ label: `${index * 5 + 1}`, key: String(index) }));
}

function bucketKey(date, period) {
  if (period === "day") return String(Math.min(3, Math.floor(date.getHours() / 6)));
  if (period === "week") return String((date.getDay() + 6) % 7);
  return String(Math.floor((date.getDate() - 1) / 5));
}

function recordsForPeriod(period) {
  const now = new Date();
  return state.records.filter((record) => {
    const date = new Date(record.datetime);
    if (period === "day") return toDateKey(date) === toDateKey(now);
    if (period === "week") return date >= startOfWeek(now) && date <= endOfDay(now);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
}

function recordsForDate(dateKey) {
  return state.records
    .filter((record) => toDateKey(new Date(record.datetime)) === dateKey)
    .sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
}

function groupByDate(records) {
  return records.reduce((grouped, record) => {
    const key = toDateKey(new Date(record.datetime));
    grouped[key] ||= [];
    grouped[key].push(record);
    return grouped;
  }, {});
}

function topValue(values) {
  const counts = values.reduce((map, value) => {
    if (value) map[value] = (map[value] || 0) + 1;
    return map;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function baseMood(mood) {
  return mood.split("：")[0];
}

function periodRangeLabel(period) {
  const now = new Date();
  if (period === "day") return formatDateLong(now);
  if (period === "week") return `${formatMonthDay(startOfWeek(now))} - ${formatMonthDay(now)}`;
  return `${now.getFullYear()} 年 ${now.getMonth() + 1} 月`;
}

function summaryStorageKey() {
  const now = new Date();
  if (state.trendPeriod === "day") return `day:${toDateKey(now)}`;
  if (state.trendPeriod === "week") return `week:${toDateKey(startOfWeek(now))}`;
  return `month:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftHistoryDate(days) {
  const date = parseDate(state.historyDate);
  date.setDate(date.getDate() + days);
  state.historyDate = toDateKey(date);
  renderHistory();
}

function toggleSheet(show) {
  const sheet = document.getElementById("moodSheet");
  sheet.classList.toggle("hidden", !show);
  sheet.setAttribute("aria-hidden", String(!show));
}

function pulse(element) {
  element.animate([{ transform: "scale(1)" }, { transform: "scale(1.02)" }, { transform: "scale(1)" }], { duration: 220 });
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateLong(date) {
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日，${["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][date.getDay()]}`;
}

function formatMonthDay(date) {
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function startOfWeek(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
  return copy;
}

function endOfDay(date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function loadJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js");
  }
}
