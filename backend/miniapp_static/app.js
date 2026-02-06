// app.js

// ===== API endpoints (один домен) =====
const API = {
  collections: "/api/collections",
  stock: "/api/stock",
};

// ===== State =====
const state = {
  collection: "all",   // "all" или ключ коллекции (classic/modern)
  status: "in",        // "in" | "out" | "low" | "all"
  channel: "all",      // "all" | "fbs" | "fbo"
  rows: [],
  updatedAt: null,
};

// ===== DOM refs =====
const el = {
  meta: document.getElementById("meta"),
  btnRefresh: document.getElementById("btnRefresh"),
  collectionSelect: document.getElementById("collectionSelect"),
  list: document.getElementById("list"),

  statusBtns: Array.from(document.querySelectorAll("[data-status]")),
  channelBtns: Array.from(document.querySelectorAll("[data-channel]")),
};

// ===== Helpers =====
function setActive(buttons, value, attrName) {
  buttons.forEach(b => {
    const isActive = b.getAttribute(attrName) === value;
    b.classList.toggle("active", isActive);
  });
}

async function fetchJSON(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`${r.status} ${r.statusText}${text ? : ${text.slice(0, 120)} : ""}`);
  }
  return r.json();
}

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ===== Load collections =====
async function loadCollections() {
  const data = await fetchJSON(API.collections);

  // data должен быть массивом [{key,name},...]
  const list = Array.isArray(data) ? data : (data?.rows ?? []);
  // очистим селект
  el.collectionSelect.innerHTML = "";

  // option "Все коллекции"
  const allOpt = document.createElement("option");
  allOpt.value = "all";
  allOpt.textContent = "Все коллекции";
  el.collectionSelect.appendChild(allOpt);

  // остальные опции
  list.forEach(o => {
    const opt = document.createElement("option");
    opt.value = o.key;
    opt.textContent = o.name;
    el.collectionSelect.appendChild(opt);
  });

  // если текущий state.collection не существует — откатим на all
  const hasValue = Array.from(el.collectionSelect.options).some(op => op.value === state.collection);
  if (!hasValue) state.collection = "all";

  el.collectionSelect.value = state.collection;
}

// ===== Load stock =====
async function loadStock() {
  el.meta.textContent = "Загрузка…";
  const data = await fetchJSON(API.stock);

  state.rows = (data && Array.isArray(data.rows)) ? data.rows : [];
  state.updatedAt = data?.updated_at || null;

  render();
}

// ===== Filters =====
function passesCollection(row) {
  if (state.collection === "all") return true;

  // предполагаем, что vendor_code начинается с GP-CL- / GP-MD- как в твоих данных
  const vc = (row.vendor_code || "").toLowerCase();

  if (state.collection === "classic") return vc.includes("gp-cl-");
  if (state.collection === "modern") return vc.includes("gp-md-");

  // если у тебя в rows будет row.collection_key — можно будет сделать так:
  // return row.collection_key === state.collection;

  return true;
}

function passesStatus(row) {
  // row.status: "ok" | "low" | "oos" (у тебя так)
  const st = (row.status || "").toLowerCase();

  if (state.status === "all") return true;
  if (state.status === "in") return st === "ok" || st === "low"; // есть остаток
  if (state.status === "out") return st === "oos";               // нет
  if (state.status === "low") return st === "low";               // заканчивается
  return true;
}

function passesChannel(row) {
  // row.qty_breakdown: {fbs:12, fbo:4, all:16}
  const qb = row.qty_breakdown || {};
  const fbs = safeNum(qb.fbs);
  const fbo = safeNum(qb.fbo);

  if (state.channel === "all") return true;
  if (state.channel === "fbs") return fbs > 0;
  if (state.channel === "fbo") return fbo > 0;
  return true;
}

function statusBadgeClass(status) {
  const s = (status || "").toLowerCase();
if (s === "ok") return "badge ok";
  if (s === "low") return "badge low";
  if (s === "oos") return "badge oos";
  return "badge";
}

function statusLabel(status) {
  const s = (status || "").toLowerCase();
  if (s === "ok") return "OK";
  if (s === "low") return "LOW";
  if (s === "oos") return "OOS";
  return s || "-";
}

// ===== Render =====
function render() {
  const rows = state.rows
    .filter(passesCollection)
    .filter(passesStatus)
    .filter(passesChannel);

  // meta
  const total = rows.length;
  const updated = state.updatedAt ?  · обновлено: ${state.updatedAt} : "";
  el.meta.textContent = Найдено: ${total}${updated};

  // list
  if (!rows.length) {
    el.list.innerHTML = <div class="empty">Ничего не найдено по фильтрам</div>;
    return;
  }

  // сортировка: сначала oos, потом low, потом ok (чтобы проблемные сверху)
  const rank = { oos: 0, low: 1, ok: 2 };
  rows.sort((a, b) => {
    const ra = rank[(a.status || "").toLowerCase()] ?? 9;
    const rb = rank[(b.status || "").toLowerCase()] ?? 9;
    if (ra !== rb) return ra - rb;
    // потом по названию
    return String(a.title  "").localeCompare(String(b.title  ""));
  });

  const html = rows.map(r => {
    const vc = escapeHtml(r.vendor_code || "");
    const title = escapeHtml(r.title || "");
    const qty = safeNum(r.qty);

    const qb = r.qty_breakdown || {};
    const fbs = safeNum(qb.fbs);
    const fbo = safeNum(qb.fbo);
    const all = safeNum(qb.all);

    const lowThr = safeNum(r.low_threshold);

    return `
      <div class="rowCard">
        <div class="rowTop">
          <div class="rowTitle">${title}</div>
          <div class="${statusBadgeClass(r.status)}">${statusLabel(r.status)}</div>
        </div>

        <div class="rowSub">${vc}</div>

        <div class="rowGrid">
          <div class="cell">
            <div class="cellLabel">Всего</div>
            <div class="cellValue">${qty}</div>
          </div>
          <div class="cell">
            <div class="cellLabel">FBS</div>
            <div class="cellValue">${fbs}</div>
          </div>
          <div class="cell">
            <div class="cellLabel">FBO</div>
            <div class="cellValue">${fbo}</div>
          </div>
          <div class="cell">
            <div class="cellLabel">Порог</div>
            <div class="cellValue">${lowThr}</div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  el.list.innerHTML = html;
}

// ===== Bind UI =====
function bindUI() {
  el.btnRefresh.addEventListener("click", async () => {
    try {
      await loadStock();
    } catch (e) {
      el.meta.textContent = Ошибка: ${e.message};
    }
  });

  el.collectionSelect.addEventListener("change", (e) => {
    state.collection = e.target.value;
    render();
  });

  el.statusBtns.forEach(b => {
    b.addEventListener("click", () => {
      state.status = b.dataset.status; // in/out/low/all
      setActive(el.statusBtns, state.status, "data-status");
      render();
    });
  });

  el.channelBtns.forEach(b => {
    b.addEventListener("click", () => {
      state.channel = b.dataset.channel; // all/fbs/fbo
      setActive(el.channelBtns, state.channel, "data-channel");
      render();
    });
  });

  // выставим активные кнопки при старте
  setActive(el.statusBtns, state.status, "data-status");
  setActive(el.channelBtns, state.channel, "data-channel");
}

// ===== Init =====
(async function init() {
  bindUI();

  try {
    await loadCollections();
  } catch (e) {
    console.warn("collections error:", e);
  }

  try {
    await loadStock();
  } catch (e) {
    el.meta.textContent = Ошибка: ${e.message};
  }
})();
