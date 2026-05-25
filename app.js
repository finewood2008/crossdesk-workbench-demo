const storageKey = "crossdeskStateV2";

const defaultBrowserHomeUrl = "https://www.google.com/";
const defaultGoogleLoginUrl = "https://accounts.google.com/";

const titles = {
  overview: ["总览", "创建任意数量本机 Chrome 浏览器身份，用户在系统 Chrome 里安全登录账号。"],
  inbox: ["会话中心", "演示工作台：集中处理多平台私信、自动翻译与 AI 建议回复；生产接入仍需官方授权。"],
  browser: ["浏览器身份", "每个身份会调起一套独立系统 Chrome 登录态，避开 Google 对内嵌浏览器的安全拦截。"],
  knowledge: ["知识库", "只使用用户导入的真实文件或粘贴文本，不再预置示例资料。"],
  policy: ["AI 策略", "配置浏览器身份的客服模式、风险规则、翻译和 AI 服务边界。"],
  audit: ["审计日志", "记录用户在本地工作台中的配置、导入、登录态清理和导出操作。"],
  settings: ["设置", "配置隐私边界、工作区、审计保留和后续官方授权入口。"]
};

const modeLabels = {
  manual: "完全人工",
  assist: "人工+AI",
  autopilot: "AI 托管"
};

const browserModules = {
  browser: "浏览器",
  auth: "登录",
  sync: "同步",
  logs: "隐私"
};

const demoThreads = [
  {
    id: "demo-amz-001",
    customer: "Emily Carter",
    platform: "Amazon US",
    store: "北美运营",
    locale: "English",
    orderId: "AMZ-2048-77",
    status: "待回复",
    priority: "高",
    sla: "18 分钟",
    topic: "物流延迟",
    last: "I still have not received the tracking update.",
    summary: "客户询问订单物流停滞，语气焦急，需要解释最新追踪并给补偿边界。",
    messages: [
      {
        from: "customer",
        time: "09:18",
        text: "Hi, I still have not received the tracking update. It was supposed to arrive yesterday.",
        translation: "您好，我还没有收到物流更新。它本来应该昨天送达。"
      },
      {
        from: "agent",
        time: "09:21",
        text: "Thanks for letting us know. I am checking the carrier scan now and will update you shortly.",
        translation: "感谢告知。我正在查看承运商扫描记录，稍后会更新您。"
      },
      {
        from: "customer",
        time: "09:24",
        text: "Please help. This is a gift and I need to know whether I should buy another one.",
        translation: "请帮忙。这是礼物，我需要知道是否应该再买一个。"
      }
    ],
    draftZh: "您好 Emily，非常抱歉让您久等了。我已查看物流记录，包裹目前仍在承运商网络中，预计 24 小时内会有下一次扫描。如果今天仍没有更新，我们会立即为您升级物流查询，并根据平台政策提供可行方案。",
    draftEn: "Hi Emily, I am very sorry for the wait. I checked the tracking record and the package is still moving within the carrier network. A new scan is expected within 24 hours. If there is still no update today, we will escalate the carrier inquiry right away and offer the available options under the platform policy.",
    ai: [
      "先道歉并确认礼物场景，避免承诺一定送达。",
      "说明已检查 tracking，给 24 小时观察窗口。",
      "若无更新，承诺升级查询，而不是直接承诺赔偿。"
    ],
    sources: ["物流异常处理 SOP", "Amazon 迟到包裹话术", "补偿边界：不承诺现金赔偿"],
    risk: "中：涉及延迟和礼物场景，避免 guarantee / compensation 等绝对承诺。"
  },
  {
    id: "demo-ebay-002",
    customer: "Marco Rossi",
    platform: "eBay EU",
    store: "欧洲店",
    locale: "Italian",
    orderId: "EB-8841",
    status: "需人工确认",
    priority: "高",
    sla: "42 分钟",
    topic: "退货请求",
    last: "The size is wrong and I want to return it.",
    summary: "客户尺码不合适并要求退货，需要确认未使用、包装完整、退货地址。",
    messages: [
      {
        from: "customer",
        time: "10:02",
        text: "The size is wrong and I want to return it. Can you send me a label?",
        translation: "尺码不对，我想退货。你能发我退货标签吗？"
      },
      {
        from: "agent",
        time: "10:05",
        text: "I can help with the return request. Could you confirm whether the item is unused and in the original packaging?",
        translation: "我可以协助退货申请。请确认商品是否未使用且保留原包装。"
      }
    ],
    draftZh: "您好 Marco，我们可以协助您处理退货。请先确认商品未使用、配件齐全并保留原包装。确认后，我们会按照 eBay 退货流程为您发送下一步说明。",
    draftEn: "Hi Marco, we can help you with the return. Please first confirm that the item is unused, all accessories are included, and the original packaging is kept. After confirmation, we will send the next steps according to the eBay return process.",
    ai: ["先确认退货条件，再进入标签/地址流程。", "不在未确认状态下承诺免费标签。", "提醒保留包装和配件。"],
    sources: ["eBay EU 退货流程", "尺码问题回复模板"],
    risk: "高：退货和费用责任相关，建议人工确认后发送。"
  },
  {
    id: "demo-shopify-003",
    customer: "Sofia Green",
    platform: "Shopify",
    store: "DTC 独立站",
    locale: "English",
    orderId: "SH-30219",
    status: "可快速回复",
    priority: "普通",
    sla: "2 小时",
    topic: "使用方法",
    last: "How do I clean the bottle cap?",
    summary: "客户询问商品清洁方式，可引用知识库给出步骤。",
    messages: [
      {
        from: "customer",
        time: "11:11",
        text: "How do I clean the bottle cap? Can it go into the dishwasher?",
        translation: "瓶盖怎么清洗？可以放进洗碗机吗？"
      }
    ],
    draftZh: "您好 Sofia，瓶盖建议用温水和少量中性清洁剂手洗，然后自然晾干。我们不建议将瓶盖放入洗碗机，因为高温可能影响密封圈寿命。",
    draftEn: "Hi Sofia, we recommend washing the bottle cap by hand with warm water and a small amount of mild detergent, then letting it air dry. We do not recommend putting the cap in the dishwasher because high heat may shorten the life of the sealing ring.",
    ai: ["这是低风险使用咨询，可直接快速回复。", "引用商品护理说明，给出明确步骤。"],
    sources: ["产品护理说明", "FAQ：清洁与保养"],
    risk: "低：普通售后咨询。"
  }
];

const persisted = loadPersistedState();

const rawProfiles = Array.isArray(persisted.profiles) ? persisted.profiles : [];
const rawAuditEntries = Array.isArray(persisted.auditEntries) ? persisted.auditEntries : [];

let profiles = rawProfiles.map(normalizeBrowserIdentity).filter(Boolean);
let knowledgeItems = Array.isArray(persisted.knowledgeItems) ? persisted.knowledgeItems : [];
let auditEntries = rawAuditEntries.map(sanitizeAuditEntry);
const needsPrivacyMigration =
  Array.isArray(persisted.connections) ||
  rawProfiles.some((profile, index) => JSON.stringify(profile) !== JSON.stringify(profiles[index])) ||
  rawAuditEntries.some((entry, index) => JSON.stringify(entry) !== JSON.stringify(auditEntries[index]));

const state = {
  activeProfileId: persisted.activeProfileId || profiles[0]?.id || null,
  search: "",
  inbox: {
    demoMode: true,
    activeThreadId: demoThreads[0].id,
    listCollapsed: false,
    aiCollapsed: false,
    filter: "all",
    composerTranslation: demoThreads[0].draftEn
  },
  browser: {
    activeModule: "browser",
    openedProfileIds: new Set((persisted.openedProfileIds || []).filter((id) => profiles.some((profile) => profile.id === id))),
    meta: {},
    electronAttachedProfileId: null
  },
  policy: {
    rules: {
      lowRiskAuto: false,
      refundManual: true,
      verifiedReplacement: false
    },
    tone: "礼貌、明确、承担责任",
    backTranslate: "每次发送前展示中文回译",
    blockedTerms: "guarantee, definitely, compensation, legal responsibility",
    ...persisted.policy
  },
  settings: {
    workspaceName: "local",
    slaReminder: "剩余 20 分钟提醒",
    auditRetention: "180 天",
    ...persisted.settings
  }
};

const els = {
  clockText: document.getElementById("clockText"),
  syncState: document.getElementById("syncState"),
  sidebarStores: document.getElementById("sidebarStores"),
  connectionProgress: document.getElementById("connectionProgress"),
  connectionSummary: document.getElementById("connectionSummary"),
  identityTable: document.getElementById("identityTable"),
  pageTitle: document.getElementById("pageTitle"),
  pageSub: document.getElementById("pageSub"),
  nav: document.getElementById("nav"),
  views: document.querySelectorAll(".view"),
  toast: document.getElementById("toast"),
  globalSearch: document.getElementById("globalSearch"),
  metricStores: document.getElementById("metricStores"),
  metricConnections: document.getElementById("metricConnections"),
  metricKnowledge: document.getElementById("metricKnowledge"),
  metricAudit: document.getElementById("metricAudit"),
  setupChecklist: document.getElementById("setupChecklist"),
  threadList: document.getElementById("threadList"),
  chatHead: document.getElementById("chatHead"),
  messages: document.getElementById("messages"),
  replyText: document.getElementById("replyText"),
  composerPills: document.getElementById("composerPills"),
  copyBtn: document.getElementById("copyBtn"),
  sendBtn: document.getElementById("sendBtn"),
  aiTranslate: document.getElementById("aiTranslate"),
  aiSources: document.getElementById("aiSources"),
  aiRisk: document.getElementById("aiRisk"),
  browserStoreList: document.getElementById("browserStoreList"),
  browserChrome: document.getElementById("browserChrome"),
  browserAddress: document.getElementById("browserAddress"),
  browserUrlForm: document.getElementById("browserUrlForm"),
  browserModuleTabs: document.getElementById("browserModuleTabs"),
  embeddedBrowser: document.getElementById("embeddedBrowser"),
  knowledgeList: document.getElementById("knowledgeList"),
  currentReferences: document.getElementById("currentReferences"),
  recallSettings: document.getElementById("recallSettings"),
  modeTable: document.getElementById("modeTable"),
  auditTable: document.getElementById("auditTable"),
  auditStatus: document.getElementById("auditStatus"),
  connectionList: document.getElementById("connectionList"),
  toneSelect: document.getElementById("toneSelect"),
  backTranslateSelect: document.getElementById("backTranslateSelect"),
  blockedTerms: document.getElementById("blockedTerms"),
  workspaceName: document.getElementById("workspaceName"),
  slaReminder: document.getElementById("slaReminder"),
  auditRetention: document.getElementById("auditRetention"),
  profileName: document.getElementById("profileName"),
  saveProfile: document.getElementById("saveProfile"),
  importSource: document.getElementById("importSource"),
  importFile: document.getElementById("importFile"),
  importText: document.getElementById("importText"),
  importProgress: document.getElementById("importProgress")
};

function loadPersistedState() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "{}");
  } catch {
    return {};
  }
}

function persistState() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      profiles: profiles.map(normalizeBrowserIdentity).filter(Boolean),
      knowledgeItems,
      auditEntries: auditEntries.slice(0, 500),
      activeProfileId: state.activeProfileId,
      openedProfileIds: [...state.browser.openedProfileIds],
      policy: state.policy,
      settings: state.settings
    }));
  } catch {
    showToast("本地保存失败，请检查浏览器存储权限");
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function deriveDebugPort(id) {
  let hash = 0;
  for (const char of String(id || "")) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return 43000 + (Math.abs(hash) % 2000);
}

function allocateDebugPort(id) {
  const used = new Set(profiles.map((profile) => Number(profile.debugPort)).filter(Boolean));
  let port = deriveDebugPort(id);
  while (used.has(port)) {
    port += 1;
    if (port > 44999) {
      port = 43000;
    }
  }
  return port;
}

function normalizeBrowserIdentity(profile) {
  if (!profile || typeof profile !== "object" || !profile.id) {
    return null;
  }
  const id = String(profile.id);
  return {
    id,
    name: String(profile.name || "Chrome 浏览器身份"),
    platform: "System Chrome",
    market: "本机隔离",
    loginUrl: defaultGoogleLoginUrl,
    homeUrl: defaultBrowserHomeUrl,
    partition: String(profile.partition || `persist:crossdesk-${id}`),
    debugPort: Number(profile.debugPort) || deriveDebugPort(id),
    mode: profile.mode || "assist",
    createdAt: profile.createdAt || new Date().toISOString()
  };
}

function sanitizeAuditEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return entry;
  }
  const basis = String(entry.basis || "");
  const action = String(entry.action || "");
  const shouldHideBasis =
    /\bhttps?:\/\//i.test(basis) ||
    /平台接入|地址栏打开|打开 Google|打开登录页|打开 Google 登录/i.test(action);
  if (!shouldHideBasis) {
    return entry;
  }
  return {
    ...entry,
    basis: "已隐藏历史网址或接入信息"
  };
}

function currentTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date());
}

function updateClock() {
  els.clockText.textContent = currentTime();
}

function getActiveProfile() {
  return profiles.find((profile) => profile.id === state.activeProfileId) || profiles[0] || null;
}

function normalizeLocalBrowserInput(input) {
  const raw = String(input || "").trim();
  if (!raw) {
    return "https://www.google.com/";
  }
  if (/^[\w.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(raw) || /^localhost([/:?#].*)?$/i.test(raw)) {
    return `https://${raw}`;
  }
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    return `https://www.google.com/search?q=${encodeURIComponent(raw)}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(raw)}`;
}

function visibleBrowserUrl(profile) {
  if (!profile) {
    return defaultBrowserHomeUrl;
  }
  const meta = state.browser.meta[profile.id] || {};
  return meta.url || profile.homeUrl || defaultBrowserHomeUrl;
}

function profileOpenPill(profile) {
  if (!window.crossdesk?.isElectron) {
    return { className: "warn", label: "需桌面版" };
  }
  return state.browser.openedProfileIds.has(profile.id)
    ? { className: "good", label: "已打开" }
    : { className: "blue", label: "未打开" };
}

function showToast(text) {
  els.toast.textContent = text;
  els.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 1800);
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add("show");
  }
}

function closeModals() {
  document.querySelectorAll(".modal-backdrop").forEach((modal) => modal.classList.remove("show"));
}

function addAudit(action, basis = "本地操作", objectId = "工作台", actor = "当前用户") {
  const entry = {
    id: createId("audit"),
    time: currentTime(),
    actor,
    objectId,
    action,
    basis
  };
  auditEntries = [entry, ...auditEntries].slice(0, 500);
  persistState();
  renderAudit();
  renderOverviewMetrics();
}

function showView(id) {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === id);
  });
  els.views.forEach((view) => {
    view.classList.toggle("active", view.id === id);
  });
  els.pageTitle.textContent = titles[id][0];
  els.pageSub.textContent = titles[id][1];

  if (id === "browser") {
    renderBrowserWorkbench();
  } else if (window.crossdesk?.isElectron) {
    window.crossdesk.hideBackend();
    state.browser.electronAttachedProfileId = null;
  }
}

function filteredProfiles() {
  const query = state.search.trim().toLowerCase();
  if (!query) {
    return profiles;
  }
  return profiles.filter((profile) => [
    profile.name,
    profile.platform,
    profile.market
  ].join(" ").toLowerCase().includes(query));
}

function filteredKnowledge() {
  const query = state.search.trim().toLowerCase();
  if (!query) {
    return knowledgeItems;
  }
  return knowledgeItems.filter((item) => [
    item.title,
    item.sourceName,
    item.content,
    item.kind
  ].join(" ").toLowerCase().includes(query));
}

function renderOverviewMetrics() {
  els.metricStores.textContent = profiles.length;
  els.metricConnections.textContent = state.browser.openedProfileIds.size;
  els.metricKnowledge.textContent = knowledgeItems.length;
  els.metricAudit.textContent = auditEntries.length;

  const browserRatio = profiles.length ? Math.min(100, Math.round((state.browser.openedProfileIds.size / profiles.length) * 100)) : 0;
  els.connectionProgress.style.width = `${browserRatio}%`;
  els.connectionSummary.textContent = profiles.length
    ? `已创建 ${profiles.length} 个本机浏览器身份；账号密码和 Token 只在网页里输入。`
    : "尚未创建浏览器身份，不会收集任何平台账号或密钥。";
}

function renderSetupChecklist() {
  const items = [
    {
      title: "创建浏览器身份",
      detail: profiles.length ? `已有 ${profiles.length} 个本机身份` : "只保存本机标签和隔离 session，不填写平台账号密码。",
      pill: profiles.length ? "good" : "warn",
      action: "browserProfileModal",
      label: profiles.length ? "继续添加" : "创建身份"
    },
    {
      title: "在系统 Chrome 登录",
      detail: profiles.length ? "打开系统 Chrome 后，用户自己登录 Google 和各平台账号。" : "创建身份后即可打开 Google 登录页。",
      pill: state.browser.openedProfileIds.size ? "good" : "blue",
      action: "privacyModal",
      label: "查看边界"
    },
    {
      title: "导入知识资料",
      detail: knowledgeItems.length ? `已有 ${knowledgeItems.length} 条资料` : "导入真实 FAQ、政策、商品说明或客服话术。",
      pill: knowledgeItems.length ? "good" : "blue",
      action: "importModal",
      label: "导入资料"
    }
  ];

  els.setupChecklist.innerHTML = items
    .map((item) => `
      <div class="doc-row">
        <div><strong>${escapeHtml(item.title)}</strong><br><span>${escapeHtml(item.detail)}</span></div>
        <div class="row-actions"><span class="pill ${item.pill}">${item.pill === "good" ? "已完成" : "待配置"}</span><button class="btn small" type="button" data-modal="${item.action}">${escapeHtml(item.label)}</button></div>
      </div>
    `)
    .join("");
}

function renderStores() {
  if (!profiles.length) {
    els.sidebarStores.innerHTML = `<div class="empty-state compact"><strong>未创建身份</strong><span>先创建一个 Google 浏览器身份。</span></div>`;
  } else {
    els.sidebarStores.innerHTML = profiles
      .map((profile) => {
        const status = profileOpenPill(profile);
        return `
          <div class="store-mini">
            <span>${escapeHtml(profile.name)}</span>
            <span class="pill ${status.className}">${status.label}</span>
          </div>
        `;
      })
      .join("");
  }

  els.identityTable.innerHTML = `
    <tr><th>身份标签</th><th>浏览器</th><th>隔离范围</th><th>Session Partition</th><th>默认入口</th></tr>
    ${profiles.map((profile) => `
      <tr>
        <td>${escapeHtml(profile.name)}</td>
        <td>${escapeHtml(profile.platform)}</td>
        <td>${escapeHtml(profile.market || "-")}</td>
        <td class="mono">${escapeHtml(profile.partition)}</td>
        <td class="mono">${escapeHtml(profile.homeUrl || defaultBrowserHomeUrl)}</td>
      </tr>
    `).join("") || `<tr><td colspan="5">还没有浏览器身份。</td></tr>`}
  `;
}

function renderInbox() {
  const activeThread = demoThreads.find((thread) => thread.id === state.inbox.activeThreadId) || demoThreads[0];
  const visibleThreads = demoThreads.filter((thread) => {
    if (state.inbox.filter === "urgent") {
      return thread.priority === "高";
    }
    if (state.inbox.filter === "manual") {
      return thread.status.includes("人工");
    }
    return true;
  });

  document.querySelector(".layout-conversation")?.classList.toggle("list-collapsed", state.inbox.listCollapsed);
  document.querySelector(".layout-conversation")?.classList.toggle("ai-collapsed", state.inbox.aiCollapsed);

  els.threadList.innerHTML = `
    <div class="conversation-panel-head">
      <div>
        <strong>会话队列</strong>
        <span>${visibleThreads.length} 个演示会话</span>
      </div>
      <button class="btn small" type="button" data-inbox-action="toggle-list">${state.inbox.listCollapsed ? "展开" : "收起"}</button>
    </div>
    <div class="conversation-filters">
      <button class="${state.inbox.filter === "all" ? "active" : ""}" type="button" data-inbox-filter="all">全部</button>
      <button class="${state.inbox.filter === "urgent" ? "active" : ""}" type="button" data-inbox-filter="urgent">高优先级</button>
      <button class="${state.inbox.filter === "manual" ? "active" : ""}" type="button" data-inbox-filter="manual">需人工</button>
    </div>
    ${visibleThreads.map((thread) => `
      <button class="thread ${thread.id === activeThread.id ? "active" : ""}" type="button" data-thread-id="${escapeHtml(thread.id)}">
        <div class="thread-top">
          <strong>${escapeHtml(thread.customer)}</strong>
          <span class="pill ${thread.priority === "高" ? "warn" : "blue"}">${escapeHtml(thread.sla)}</span>
        </div>
        <p>${escapeHtml(thread.platform)} · ${escapeHtml(thread.topic)}</p>
        <p>${escapeHtml(thread.last)}</p>
      </button>
    `).join("")}
  `;

  els.chatHead.innerHTML = `
    <div>
      <strong>${escapeHtml(activeThread.customer)}</strong>
      <br><span>${escapeHtml(activeThread.platform)} · ${escapeHtml(activeThread.orderId)} · ${escapeHtml(activeThread.locale)}</span>
    </div>
    <div class="row-actions">
      <span class="pill ${activeThread.priority === "高" ? "warn" : "blue"}">${escapeHtml(activeThread.priority)}</span>
      <span class="pill ${activeThread.status.includes("人工") ? "danger" : "good"}">${escapeHtml(activeThread.status)}</span>
    </div>
  `;
  els.messages.innerHTML = `
    <div class="demo-banner">
      <strong>演示数据</strong>
      <span>用于跨境卖家试用会话、翻译、AI 建议流程；真实消息后续通过官方授权、CDP 或扩展接入。</span>
    </div>
    ${activeThread.messages.map((message) => `
      <div class="msg ${message.from === "agent" ? "agent" : "customer"}">
        <small>${message.from === "agent" ? "客服" : activeThread.customer} · ${escapeHtml(message.time)}</small>
        <div>${escapeHtml(message.text)}</div>
        <div class="bubble-translation">
          <span>译文</span>
          <p>${escapeHtml(message.translation)}</p>
        </div>
      </div>
    `).join("")}
  `;
  els.replyText.value = activeThread.draftZh;
  els.replyText.disabled = false;
  els.copyBtn.disabled = false;
  els.sendBtn.disabled = false;
  state.inbox.composerTranslation = activeThread.draftEn;
  els.composerPills.innerHTML = `
    <span class="pill good">自动翻译 EN</span>
    <span class="pill blue">${escapeHtml(activeThread.platform)}</span>
    <span class="pill warn">SLA ${escapeHtml(activeThread.sla)}</span>
  `;
  renderComposerTranslation(activeThread);
  renderAiWorkbench(activeThread);
}

function renderComposerTranslation(thread) {
  const existing = document.getElementById("composerTranslation");
  if (existing) {
    existing.remove();
  }
  const translation = document.createElement("div");
  translation.id = "composerTranslation";
  translation.className = "composer-translation";
  translation.innerHTML = `<strong>将发送译文</strong><p>${escapeHtml(state.inbox.composerTranslation || thread.draftEn)}</p>`;
  els.replyText.insertAdjacentElement("afterend", translation);
}

function renderAiWorkbench(thread) {
  const layout = document.querySelector(".layout-conversation");
  layout?.classList.toggle("ai-collapsed", state.inbox.aiCollapsed);
  els.aiTranslate.innerHTML = `
    <div class="ai-workbench-head">
      <div><strong>AI 建议回复</strong><span>设置里控制语气、风险和引用策略</span></div>
      <button class="btn small" type="button" data-inbox-action="toggle-ai">${state.inbox.aiCollapsed ? "展开" : "收起"}</button>
    </div>
    <div class="suggestion-card">
      <h4>推荐回复</h4>
      <p>${escapeHtml(thread.draftEn)}</p>
      <div class="row-actions">
        <button class="btn small primary" type="button" data-ai-apply="draft">采用</button>
        <button class="btn small" type="button" data-view-jump="policy">调整策略</button>
      </div>
    </div>
    ${thread.ai.map((item) => `<div class="source"><span>•</span><p>${escapeHtml(item)}</p></div>`).join("")}
  `;
  els.aiSources.innerHTML = `
    ${thread.sources.map((source) => `<div class="translation-box"><h4>引用资料</h4><p>${escapeHtml(source)}</p></div>`).join("")}
  `;
  els.aiRisk.innerHTML = `
    <div class="translation-box"><h4>风险判断</h4><p>${escapeHtml(thread.risk)}</p></div>
    <div class="translation-box"><h4>发送前检查</h4><p>避免绝对承诺、赔偿承诺、平台规则外的物流时效承诺。</p></div>
  `;
}

function pseudoTranslateReply(text) {
  const normalized = text.trim();
  if (!normalized) {
    return "";
  }
  if (normalized.includes("退货") || normalized.includes("退回")) {
    return "Hi, we can help you with the return. Please confirm that the item is unused, all accessories are included, and the original packaging is kept. After confirmation, we will send the next steps according to the platform return process.";
  }
  if (normalized.includes("物流") || normalized.includes("包裹") || normalized.includes("扫描")) {
    return "Hi, I am sorry for the wait. I checked the tracking record and the package is still moving within the carrier network. If there is still no update today, we will escalate the carrier inquiry right away.";
  }
  if (normalized.includes("清洗") || normalized.includes("洗碗机")) {
    return "Hi, we recommend washing it by hand with warm water and a small amount of mild detergent, then letting it air dry. We do not recommend putting it in the dishwasher.";
  }
  return "Hi, thanks for your message. We have checked the details and will help you with the next step according to the order status and platform policy.";
}

function activeDemoThread() {
  return demoThreads.find((thread) => thread.id === state.inbox.activeThreadId) || demoThreads[0];
}

function sendDemoReply() {
  const thread = activeDemoThread();
  const zh = els.replyText.value.trim();
  if (!zh) {
    showToast("请先输入回复内容");
    return;
  }
  thread.messages.push({
    from: "agent",
    time: currentTime().slice(0, 5),
    text: state.inbox.composerTranslation || pseudoTranslateReply(zh),
    translation: zh
  });
  thread.status = "已回复";
  thread.last = state.inbox.composerTranslation || pseudoTranslateReply(zh);
  addAudit("演示发送回复", "Demo 数据：未连接真实平台，不会发送到客户", thread.customer, "当前用户");
  renderInbox();
  showToast("演示回复已记录");
}

function renderBrowserStoreList() {
  const visibleProfiles = filteredProfiles();
  if (!profiles.length) {
    els.browserStoreList.innerHTML = `
      <div class="empty-state">
        <strong>没有浏览器身份</strong>
        <span>可以按需创建任意数量身份，每个身份拥有独立登录态。</span>
        <button class="btn primary" type="button" data-modal="browserProfileModal">创建浏览器身份</button>
      </div>
    `;
    return;
  }

  if (!visibleProfiles.length) {
    els.browserStoreList.innerHTML = `<div class="empty-state"><strong>没有匹配身份</strong><span>换个身份标签关键词。</span></div>`;
    return;
  }

  els.browserStoreList.innerHTML = visibleProfiles
    .map((profile) => {
      const active = profile.id === state.activeProfileId ? " active" : "";
      const status = profileOpenPill(profile);
      return `
        <button class="store-tab${active}" type="button" data-profile-id="${escapeHtml(profile.id)}">
          <div><strong>${escapeHtml(profile.name)}</strong><br><span>${escapeHtml(profile.platform)} · 独立 Chrome Profile · ${escapeHtml(modeLabels[profile.mode] || modeLabels.assist)}</span></div>
          <span class="pill ${status.className}">${status.label}</span>
        </button>
      `;
    })
    .join("") + `<div class="store-action"><button class="btn" type="button" data-modal="browserProfileModal">创建身份</button></div>`;
}

function renderBrowserChrome(profile) {
  const address = visibleBrowserUrl(profile);
  els.browserAddress.value = address;
  els.browserAddress.title = address;
  const meta = profile ? state.browser.meta[profile.id] || {} : {};
  els.browserAddress.classList.toggle("is-loading", Boolean(meta.isLoading));

  const hasProfile = Boolean(profile);
  els.browserChrome.querySelectorAll("button").forEach((button) => {
    const action = button.dataset.browserAction;
    if (!action) {
      return;
    }
    button.disabled = !hasProfile && action !== "open-all";
  });

  const backButton = els.browserChrome.querySelector("[data-browser-action='back']");
  const forwardButton = els.browserChrome.querySelector("[data-browser-action='forward']");
  if (backButton) {
    backButton.disabled = !hasProfile || (window.crossdesk?.isElectron ? !meta.canGoBack : false);
  }
  if (forwardButton) {
    forwardButton.disabled = !hasProfile || (window.crossdesk?.isElectron ? !meta.canGoForward : false);
  }

  const googleButton = els.browserChrome.querySelector("[data-browser-action='google']");
  const loginButton = els.browserChrome.querySelector("[data-browser-action='login']");
  const externalButton = els.browserChrome.querySelector("[data-browser-action='external']");
  if (googleButton) {
    googleButton.textContent = "打开 Chrome";
  }
  if (loginButton) {
    loginButton.textContent = "Chrome 登录";
  }
  if (externalButton) {
    externalButton.textContent = "Chrome 打开";
  }
}

function requestBackendLayout() {
  if (window.crossdesk?.isElectron) {
    window.crossdesk.hideBackend();
  }
  state.browser.electronAttachedProfileId = null;
}

function renderBrowserModules() {
  els.browserModuleTabs.querySelectorAll("[data-browser-module]").forEach((button) => {
    button.classList.toggle("active", button.dataset.browserModule === state.browser.activeModule);
  });
}

function renderBrowserWorkbench() {
  const profile = getActiveProfile();
  renderBrowserStoreList();
  renderBrowserChrome(profile);
  renderBrowserModules();

  if (!profile) {
    els.embeddedBrowser.innerHTML = `
      <div class="embedded-placeholder">
        <div>
          <span class="pill warn">需要身份</span>
          <h2>先创建浏览器身份</h2>
          <p>身份数量不受固定列表限制。每个身份会创建独立 Chromium session，用户只在网页里登录自己的 Google 或平台账号。</p>
          <button class="btn primary" type="button" data-modal="browserProfileModal">创建浏览器身份</button>
        </div>
      </div>
    `;
    return;
  }

  if (window.crossdesk?.isElectron) {
    const meta = state.browser.meta[profile.id] || {};
    const diag = meta.profileDir
      ? `<p class="mono">Profile: ${escapeHtml(meta.profileDir)}${meta.debugPort ? ` · CDP: ${escapeHtml(meta.debugPort)}` : ""}${meta.cdpReachable ? ` · 页面: ${escapeHtml(meta.targets?.length || 0)}` : ""}</p>`
      : "";
    els.embeddedBrowser.innerHTML = `
      <div class="embedded-placeholder">
        <div>
          <span class="pill good">系统 Chrome 安全登录</span>
          <h2>${escapeHtml(profile.name)}</h2>
          <p>Google 不允许在 Electron 内嵌浏览器里登录。请使用按钮打开本机真实 Chrome；CrossDesk 会为这个身份创建独立 Chrome Profile，并且不读取、不保存账号密码或 Token。</p>
          <p>登录后，后续读取页面内容和操作私信需要通过本机 CDP 调试通道、平台官方 API 或平台授权扩展来完成。</p>
          ${diag}
          <div class="row-actions">
            <button class="btn primary" type="button" data-browser-action="login">打开 Chrome 登录 Google</button>
            <button class="btn" type="button" data-browser-action="inspect">诊断连接</button>
          </div>
        </div>
      </div>
    `;
    requestBackendLayout();
    return;
  }

  els.embeddedBrowser.innerHTML = `
    <div class="embedded-placeholder">
      <div>
        <span class="pill blue">浏览器预览模式</span>
        <h2>${escapeHtml(profile.name)}</h2>
        <p>当前网页预览不能调起独立 Chrome Profile。请在桌面版里点击“Chrome 登录”，系统会打开本机真实 Chrome 登录页。</p>
      </div>
    </div>
  `;
}

async function openAllBackends() {
  if (!profiles.length) {
    showToast("请先创建浏览器身份");
    openModal("browserProfileModal");
    return;
  }
  const results = [];
  if (window.crossdesk?.isElectron) {
    for (const profile of profiles) {
      const result = await window.crossdesk.openSystemBrowser(profile, profile.loginUrl);
      results.push({ profile, result });
      if (result?.ok) {
        state.browser.openedProfileIds.add(profile.id);
        state.browser.meta[profile.id] = {
          ...(state.browser.meta[profile.id] || {}),
          url: result.url,
          externalBrowser: result.browser,
          isolated: result.isolated,
          profileDir: result.profileDir,
          debugPort: result.debugPort,
          cdpReachable: result.cdpReachable
        };
      }
    }
    state.browser.electronAttachedProfileId = profiles[0].id;
  } else {
    profiles.forEach((profile) => state.browser.openedProfileIds.add(profile.id));
  }
  state.activeProfileId = profiles[0].id;
  persistState();
  renderBrowserWorkbench();
  renderOverviewMetrics();
  addAudit("打开全部浏览器身份", `${profiles.length} 个独立 Chrome Profile`, "系统 Chrome", "系统");
  const failed = results.filter((item) => item.result && !item.result.ok);
  showToast(failed.length ? `${failed.length} 个身份未打开，请查看审计日志` : `已准备 ${profiles.length} 个浏览器身份`);
}

async function openProfileInSystemBrowser(input, label = "打开系统 Chrome") {
  const profile = getActiveProfile();
  if (!profile) {
    showToast("请先创建浏览器身份");
    openModal("browserProfileModal");
    return;
  }
  const url = normalizeLocalBrowserInput(input);
  state.browser.openedProfileIds.add(profile.id);

  if (window.crossdesk?.isElectron) {
    const result = await window.crossdesk.openSystemBrowser(profile, url);
    if (!result?.ok) {
      showToast(result?.message ? `无法打开 Chrome：${result.message}` : "无法打开系统 Chrome");
      return;
    }
    state.browser.meta[profile.id] = {
      ...(state.browser.meta[profile.id] || {}),
      url: result.url,
      externalBrowser: result.browser,
      isolated: result.isolated,
      profileDir: result.profileDir,
      debugPort: result.debugPort,
      cdpReachable: result.cdpReachable
    };
    renderBrowserWorkbench();
    if (!result.isolated) {
      showToast("未找到 Google Chrome，已用系统默认浏览器打开，身份隔离不可用");
      return;
    }
  } else {
    els.browserAddress.value = url;
    openModal("desktopRequiredModal");
    showToast("请在 CrossDesk 桌面版中打开 Chrome 登录");
  }
  persistState();
  addAudit(
    label,
    result?.profileDir ? `Chrome Profile：${result.profileDir} · CDP ${result.debugPort || "-"}` : "已调起系统 Chrome，未记录具体网址或凭据",
    profile.name,
    "系统"
  );
  showToast(`${label}：${profile.name}`);
}

async function inspectActiveChromeIdentity() {
  const profile = getActiveProfile();
  if (!profile) {
    showToast("请先创建浏览器身份");
    return;
  }
  if (!window.crossdesk?.isElectron || !window.crossdesk.chromeStatus) {
    openModal("desktopRequiredModal");
    return;
  }
  const status = await window.crossdesk.chromeStatus(profile);
  if (!status?.ok) {
    showToast(status?.message ? `诊断失败：${status.message}` : "诊断失败");
    return;
  }
  state.browser.meta[profile.id] = {
    ...(state.browser.meta[profile.id] || {}),
    profileDir: status.profileDir,
    debugPort: status.debugPort,
    cdpReachable: status.cdpReachable,
    targets: status.targets
  };
  addAudit(
    "诊断 Chrome 身份",
    `Profile：${status.profileDir} · CDP ${status.debugPort} · 页面 ${status.targets.length}`,
    profile.name,
    "系统"
  );
  renderBrowserWorkbench();
  showToast(status.cdpReachable ? `已连接 Chrome：${status.targets.length} 个页面` : "Chrome 未打开或调试端口未连接");
}

async function goToBrowserUrl(input, label = "地址栏打开") {
  return openProfileInSystemBrowser(input, label);
}

async function clearActiveBrowserSession() {
  const profile = getActiveProfile();
  if (!profile) {
    return;
  }
  if (!window.crossdesk?.isElectron) {
    showToast("清除登录态需要在 Electron 桌面版中执行");
    return;
  }
  const [embeddedResult, chromeResult] = await Promise.all([
    window.crossdesk.clearSession(profile),
    window.crossdesk.clearSystemBrowserProfile?.(profile)
  ]);
  if (!chromeResult?.ok) {
    showToast("请先关闭该身份的 Chrome 窗口，再清除登录态");
    return;
  }
  if (embeddedResult?.ok && chromeResult?.ok) {
    state.browser.meta[profile.id] = { ...(state.browser.meta[profile.id] || {}), url: profile.homeUrl };
    renderBrowserWorkbench();
    addAudit("清除浏览器登录态", "已清除该身份的本地 Chrome Profile 和缓存", profile.name, "系统");
    showToast(`${profile.name} 登录态已清除`);
  } else {
    showToast("清除登录态失败");
  }
}

async function deleteActiveProfile() {
  const profile = getActiveProfile();
  if (!profile) {
    return;
  }
  if (window.crossdesk?.isElectron) {
    const result = await window.crossdesk.deleteProfile(profile.id);
    if (!result?.ok) {
      showToast("请先关闭该身份的 Chrome 窗口，再删除身份");
      return;
    }
  }
  profiles = profiles.filter((item) => item.id !== profile.id);
  state.browser.openedProfileIds.delete(profile.id);
  delete state.browser.meta[profile.id];
  state.activeProfileId = profiles[0]?.id || null;
  persistState();
  addAudit("删除浏览器身份", "已删除本地身份并清理对应 session", profile.name, "当前用户");
  renderAll();
  showToast(`${profile.name} 已删除`);
}

async function controlEmbeddedBrowser(action) {
  const profile = getActiveProfile();
  if (action === "open-all") {
    openAllBackends();
    return;
  }
  if (!profile) {
    showToast("请先创建浏览器身份");
    openModal("browserProfileModal");
    return;
  }
  if (action === "google") {
    await openProfileInSystemBrowser(profile.homeUrl || defaultBrowserHomeUrl, "打开 Chrome");
    return;
  }
  if (action === "login") {
    await openProfileInSystemBrowser(profile.loginUrl || defaultGoogleLoginUrl, "打开 Chrome 登录 Google");
    return;
  }
  if (action === "inspect") {
    await inspectActiveChromeIdentity();
    return;
  }
  if (action === "clear-session") {
    await clearActiveBrowserSession();
    return;
  }
  if (action === "delete-profile") {
    await deleteActiveProfile();
    return;
  }
  if (["back", "forward", "reload", "home"].includes(action)) {
    showToast("系统 Chrome 已在外部打开，请在 Chrome 窗口中操作");
    return;
  }
  if (window.crossdesk?.isElectron && action === "external") {
    await openProfileInSystemBrowser(visibleBrowserUrl(profile), "打开 Chrome");
    return;
  }
  if (window.crossdesk?.isElectron) {
    window.crossdesk.navigateBackend(action);
    return;
  }
  if (action === "home") {
    els.browserAddress.value = profile.homeUrl || defaultBrowserHomeUrl;
  }
  if (action === "external") {
    window.open(visibleBrowserUrl(profile), `${profile.id}-external`);
  }
}

function updateBackendState(payload) {
  if (!payload?.storeId) {
    return;
  }
  state.browser.meta[payload.storeId] = payload;
  if (payload.storeId === state.activeProfileId) {
    renderBrowserChrome(getActiveProfile());
  }
}

function renderKnowledge() {
  const items = filteredKnowledge();
  if (!knowledgeItems.length) {
    els.knowledgeList.innerHTML = `
      <div class="empty-state">
        <strong>未导入真实资料</strong>
        <span>请导入 FAQ、退换货政策、物流规则、商品说明或客服话术。</span>
        <button class="btn primary" type="button" data-modal="importModal">导入资料</button>
      </div>
    `;
  } else if (!items.length) {
    els.knowledgeList.innerHTML = `<div class="empty-state"><strong>没有匹配资料</strong><span>换个资料标题或内容关键词。</span></div>`;
  } else {
    els.knowledgeList.innerHTML = items
      .map((item) => `
        <div class="doc-row" data-knowledge-id="${escapeHtml(item.id)}">
          <div><strong>${escapeHtml(item.title)}</strong><br><span>${escapeHtml(item.kind)} · ${escapeHtml(item.sourceName)} · ${escapeHtml(item.content.length)} 字</span></div>
          <div class="row-actions"><span class="pill ${item.enabled ? "good" : "danger"}">${item.enabled ? "已启用" : "已禁用"}</span><button class="btn small" type="button" data-knowledge-action="toggle" data-knowledge-id="${escapeHtml(item.id)}">${item.enabled ? "禁用" : "启用"}</button></div>
        </div>
      `)
      .join("");
  }
  els.currentReferences.textContent = knowledgeItems.length
    ? `已导入 ${knowledgeItems.length} 条真实资料，AI 回复可在后续接入检索服务时引用。`
    : "未导入资料时，AI 不会生成带来源的回复。";
  els.recallSettings.innerHTML = `可用资料 <span class="mono">${knowledgeItems.filter((item) => item.enabled).length}</span> 条 · 当前为本地资料管理，向量检索需接入后端服务。`;
}

function renderPolicy() {
  if (!profiles.length) {
    els.modeTable.innerHTML = `<div class="empty-state compact"><strong>暂无身份</strong><span>创建浏览器身份后可配置客服模式。</span></div>`;
  } else {
    els.modeTable.innerHTML = `
      <table class="table compact">
        <tr><th>浏览器身份</th><th>会话隔离</th><th>模式</th></tr>
        ${profiles.map((profile) => `
          <tr>
            <td>${escapeHtml(profile.name)}</td>
            <td>${escapeHtml(profile.market)}</td>
            <td>
              <div class="segmented" role="group" aria-label="${escapeHtml(profile.name)} 客服模式">
                ${Object.entries(modeLabels).map(([mode, label]) => `<button class="${profile.mode === mode ? "active" : ""}" type="button" data-mode-profile="${escapeHtml(profile.id)}" data-mode-value="${escapeHtml(mode)}">${escapeHtml(label)}</button>`).join("")}
              </div>
            </td>
          </tr>
        `).join("")}
      </table>
    `;
  }

  Object.entries(state.policy.rules).forEach(([ruleId, enabled]) => {
    document.querySelectorAll(`[data-rule-id="${ruleId}"]`).forEach((toggle) => {
      toggle.classList.toggle("on", enabled);
      toggle.setAttribute("aria-pressed", String(enabled));
    });
  });
  els.toneSelect.value = state.policy.tone;
  els.backTranslateSelect.value = state.policy.backTranslate;
  els.blockedTerms.value = state.policy.blockedTerms;
}

function renderAudit() {
  els.auditStatus.textContent = auditEntries.length ? "本地记录" : "暂无记录";
  els.auditTable.innerHTML = `
    <tr><th>时间</th><th>操作者</th><th>对象</th><th>动作</th><th>依据</th></tr>
    ${auditEntries.map((entry) => `
      <tr><td class="mono">${escapeHtml(entry.time)}</td><td>${escapeHtml(entry.actor)}</td><td>${escapeHtml(entry.objectId)}</td><td>${escapeHtml(entry.action)}</td><td>${escapeHtml(entry.basis)}</td></tr>
    `).join("") || `<tr><td colspan="5">暂无审计记录。</td></tr>`}
  `;
}

function renderPrivacyBoundary() {
  els.connectionList.innerHTML = `
    <div class="empty-state compact">
      <strong>不收集敏感登录信息</strong>
      <span>CrossDesk 不提供账号、密码、API Key、Webhook Secret 或 Token 输入框。用户只在本机系统 Chrome 里完成 Google 和平台登录。</span>
    </div>
    <div class="doc-row">
      <div><strong>本机会保存</strong><br><span>浏览器身份标签、session partition、本地知识资料和审计动作。</span></div>
      <span class="pill blue">非密码</span>
    </div>
    <div class="doc-row">
      <div><strong>本机不保存</strong><br><span>Google 密码、平台密码、OAuth Token、API 密钥、Webhook Secret。</span></div>
      <span class="pill good">已移除输入</span>
    </div>
    <div class="doc-row">
      <div><strong>后续真实同步</strong><br><span>需要通过官方 OAuth 或平台应用授权实现，不在这个界面手填密钥。</span></div>
      <span class="pill warn">待接入</span>
    </div>
  `;
}

function renderSettings() {
  els.workspaceName.value = state.settings.workspaceName;
  els.slaReminder.value = state.settings.slaReminder;
  els.auditRetention.value = state.settings.auditRetention;
  document.querySelector(".titlebar-center").textContent = `CrossDesk · Workspace / ${state.settings.workspaceName}`;
}

function saveProfile() {
  const name = els.profileName.value.trim();
  if (!name) {
    showToast("请填写身份标签");
    return;
  }
  const id = createId("profile");
  const profile = {
    id,
    name,
    platform: "System Chrome",
    market: "本机隔离",
    loginUrl: defaultGoogleLoginUrl,
    homeUrl: defaultBrowserHomeUrl,
    partition: `persist:crossdesk-${id}`,
    debugPort: allocateDebugPort(id),
    mode: "assist",
    createdAt: new Date().toISOString()
  };
  profiles = [...profiles, profile];
  state.activeProfileId = profile.id;
  persistState();
  closeModals();
  addAudit("创建浏览器身份", "仅保存本机标签与隔离 session，不保存账号密码", profile.name, "当前用户");
  clearProfileForm();
  renderAll();
  showView("browser");
  showToast(`${profile.name} 已创建`);
}

function clearProfileForm() {
  els.profileName.value = "";
}

async function importKnowledge() {
  const title = els.importSource.value.trim();
  const file = els.importFile.files?.[0];
  const pasted = els.importText.value.trim();
  if (!title && !file) {
    showToast("请填写标题或选择文件");
    return;
  }

  let content = pasted;
  let sourceName = file?.name || "粘贴文本";
  let kind = file ? "文件" : "粘贴文本";
  if (file) {
    content = await file.text();
  }
  if (!content.trim()) {
    showToast("资料内容为空");
    return;
  }

  els.importProgress.style.width = "100%";
  const item = {
    id: createId("kb"),
    title: title || file.name,
    sourceName,
    kind,
    content,
    enabled: true,
    createdAt: new Date().toISOString()
  };
  knowledgeItems = [item, ...knowledgeItems];
  persistState();
  addAudit("导入真实资料", sourceName, item.title, "当前用户");
  closeModals();
  els.importSource.value = "";
  els.importText.value = "";
  els.importFile.value = "";
  els.importProgress.style.width = "0%";
  renderAll();
  showView("knowledge");
  showToast("资料已导入");
}

function updateKnowledgeItem(itemId) {
  const item = knowledgeItems.find((entry) => entry.id === itemId);
  if (!item) {
    return;
  }
  item.enabled = !item.enabled;
  persistState();
  addAudit(`${item.enabled ? "启用" : "禁用"}知识资料`, item.sourceName, item.title, "当前用户");
  renderAll();
}

function savePolicy() {
  state.policy.tone = els.toneSelect.value;
  state.policy.backTranslate = els.backTranslateSelect.value;
  state.policy.blockedTerms = els.blockedTerms.value;
  persistState();
  addAudit("保存 AI 策略", `${state.policy.tone} · ${state.policy.backTranslate}`, "AI 策略");
  showToast("AI 策略已保存");
}

function saveSettings() {
  state.settings.workspaceName = els.workspaceName.value.trim() || "local";
  state.settings.slaReminder = els.slaReminder.value;
  state.settings.auditRetention = els.auditRetention.value;
  persistState();
  renderSettings();
  addAudit("保存系统配置", `${state.settings.slaReminder} · 审计 ${state.settings.auditRetention}`, "设置");
  showToast("设置已保存");
}

function exportAuditCsv() {
  const rows = [["时间", "操作者", "对象", "动作", "依据"], ...auditEntries.map((entry) => [entry.time, entry.actor, entry.objectId, entry.action, entry.basis])];
  const csv = `\ufeff${rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `crossdesk-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  addAudit("导出审计日志 CSV", "本地审计记录", "审计日志");
  showToast("审计日志已导出");
}

function renderAll() {
  if (state.activeProfileId && !profiles.some((profile) => profile.id === state.activeProfileId)) {
    state.activeProfileId = profiles[0]?.id || null;
  }
  renderOverviewMetrics();
  renderSetupChecklist();
  renderStores();
  renderInbox();
  renderBrowserStoreList();
  renderBrowserChrome(getActiveProfile());
  renderKnowledge();
  renderPolicy();
  renderAudit();
  renderPrivacyBoundary();
  renderSettings();
}

function wireEvents() {
  els.nav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-view]");
    if (button) {
      showView(button.dataset.view);
    }
  });

  document.addEventListener("click", (event) => {
    const viewJump = event.target.closest("[data-view-jump]");
    if (viewJump) {
      showView(viewJump.dataset.viewJump);
    }

    const modalButton = event.target.closest("[data-modal]");
    if (modalButton) {
      openModal(modalButton.dataset.modal);
    }

    const closeButton = event.target.closest("[data-close]");
    if (closeButton) {
      closeModals();
    }

    const knowledgeButton = event.target.closest("[data-knowledge-action]");
    if (knowledgeButton) {
      updateKnowledgeItem(knowledgeButton.dataset.knowledgeId);
    }

    const modeButton = event.target.closest("[data-mode-profile]");
    if (modeButton) {
      const profile = profiles.find((item) => item.id === modeButton.dataset.modeProfile);
      if (profile) {
        profile.mode = modeButton.dataset.modeValue;
        persistState();
        addAudit("切换客服模式", modeLabels[profile.mode], profile.name, "当前用户");
        renderAll();
      }
    }

    const threadButton = event.target.closest("[data-thread-id]");
    if (threadButton) {
      state.inbox.activeThreadId = threadButton.dataset.threadId;
      renderInbox();
    }

    const inboxFilter = event.target.closest("[data-inbox-filter]");
    if (inboxFilter) {
      state.inbox.filter = inboxFilter.dataset.inboxFilter;
      renderInbox();
    }

    const inboxAction = event.target.closest("[data-inbox-action]");
    if (inboxAction) {
      if (inboxAction.dataset.inboxAction === "toggle-list") {
        state.inbox.listCollapsed = !state.inbox.listCollapsed;
      }
      if (inboxAction.dataset.inboxAction === "toggle-ai") {
        state.inbox.aiCollapsed = !state.inbox.aiCollapsed;
      }
      renderInbox();
    }

    if (event.target.closest("[data-ai-apply='draft']")) {
      const thread = activeDemoThread();
      els.replyText.value = thread.draftZh;
      state.inbox.composerTranslation = thread.draftEn;
      renderComposerTranslation(thread);
      showToast("已采用 AI 建议");
    }

    if (event.target.closest("#saveProfile")) {
      saveProfile();
    }
    if (event.target.closest("#startImport")) {
      importKnowledge();
    }
    if (event.target.closest("#savePolicy")) {
      savePolicy();
    }
    if (event.target.closest("#saveSettings")) {
      saveSettings();
    }
    if (event.target.closest("#exportAudit")) {
      exportAuditCsv();
    }
    if (event.target.closest("#copyBtn")) {
      navigator.clipboard?.writeText(state.inbox.composerTranslation || els.replyText.value).catch(() => {});
      showToast("已复制将发送译文");
    }
    if (event.target.closest("#sendBtn")) {
      sendDemoReply();
    }
    if (event.target.closest("#refreshIdentity")) {
      renderStores();
      addAudit("刷新浏览器身份状态", `${profiles.length} 个身份`, "浏览器身份", "系统");
      showToast("浏览器身份状态已刷新");
    }
  });

  document.querySelectorAll(".modal-backdrop").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModals();
      }
    });
  });

  document.querySelectorAll("[data-ai-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-ai-tab]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      els.aiTranslate.classList.toggle("hidden", button.dataset.aiTab !== "translate");
      els.aiSources.classList.toggle("hidden", button.dataset.aiTab !== "sources");
      els.aiRisk.classList.toggle("hidden", button.dataset.aiTab !== "risk");
    });
  });

  document.querySelectorAll(".toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const ruleId = toggle.dataset.ruleId;
      if (!ruleId) {
        return;
      }
      state.policy.rules[ruleId] = !state.policy.rules[ruleId];
      toggle.classList.toggle("on", state.policy.rules[ruleId]);
      toggle.setAttribute("aria-pressed", String(state.policy.rules[ruleId]));
      persistState();
      addAudit("更新托管规则", `${ruleId}: ${state.policy.rules[ruleId] ? "启用" : "关闭"}`, "AI 策略");
    });
  });

  els.globalSearch.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderBrowserStoreList();
    renderKnowledge();
  });

  els.replyText.addEventListener("input", () => {
    const thread = activeDemoThread();
    state.inbox.composerTranslation = pseudoTranslateReply(els.replyText.value);
    renderComposerTranslation(thread);
  });

  els.browserStoreList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-profile-id]");
    if (!button) {
      return;
    }
    state.activeProfileId = button.dataset.profileId;
    state.browser.electronAttachedProfileId = null;
    persistState();
    renderBrowserWorkbench();
  });

  els.browserChrome.addEventListener("click", (event) => {
    const button = event.target.closest("[data-browser-action]");
    if (button) {
      controlEmbeddedBrowser(button.dataset.browserAction);
    }
  });

  els.embeddedBrowser.addEventListener("click", (event) => {
    const button = event.target.closest("[data-browser-action]");
    if (button) {
      controlEmbeddedBrowser(button.dataset.browserAction);
    }
  });

  els.browserUrlForm.addEventListener("submit", (event) => {
    event.preventDefault();
    goToBrowserUrl(els.browserAddress.value);
  });

  els.browserModuleTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-browser-module]");
    if (!button) {
      return;
    }
    state.browser.activeModule = button.dataset.browserModule;
    renderBrowserModules();
    showToast(`切换到${browserModules[state.browser.activeModule]}`);
  });

  window.addEventListener("resize", requestBackendLayout);
  window.addEventListener("scroll", requestBackendLayout, true);

  if (window.crossdesk?.onBackendState) {
    window.crossdesk.onBackendState(updateBackendState);
  }
}

function init() {
  updateClock();
  setInterval(updateClock, 1000);
  if (needsPrivacyMigration) {
    persistState();
  }
  renderAll();
  wireEvents();
}

init();
