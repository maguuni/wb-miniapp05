// backend/miniapp_static/app.js
(() => {
  // ===== DOM =====
  const el = {
    meta: document.getElementById("meta"),
    btnRefresh: document.getElementById("btnRefresh"),
    collectionSelect: document.getElementById("collectionSelect"),
    list: document.getElementById("list"),
    statusBtns: Array.from(document.querySelectorAll('[data-status]')),
    channelBtns: Array.from(document.querySelectorAll('[data-channel]')),
  };

  // если чего-то нет в HTML — не падаем сразу, а покажем в meta
  function assertUI() {
    const missing = [];
    if (!el.meta) missing.push("#meta");
    if (!el.btnRefresh) missing.push("#btnRefresh");
    if (!el.collectionSelect) missing.push("#collectionSelect");
    if (!el.list) missing.push("#list");
    if (!el.statusBtns.length) missing.push("[data-status]");
    if (!el.channelBtns.length) missing.push("[data-channel]");

    if (missing.length) {
      const msg = `Не найдены элементы в HTML: ${missing.join(", ")}`;
      console.warn(msg);
      if (el.meta) el.meta.textContent = msg;
      return false;
    }
    return true;
  }

  // ===== API =====
  // ВАЖНО: относительные пути -> работают на одном домене Render
  const API = {
    collections: "/api/collections",
    stock: "/api/stock",
  };

  // ===== State =====
  const state = {
    collection: "all",   // all / classic / modern ...
    status: "in",        // in / none / low / all
    channel: "all",      // all / fbs / fbo
    rows: [],
    updatedAt: null,
    collections: [],
  };

  // ===== Helpers =====
  function safeNum(x) {
    const n = Number(x);
    return Number.isFinite(n) ? n : 0;
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setActive(btns, value, attr) {
    btns.forEach(b => {
      const v = b.getAttribute(attr);
      if (v === value) b.classList.add("active");
      else b.classList.remove("active");
    });
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText}${txt ? " — " + txt.slice(0, 200) : ""}`);
    }
    return await res.json();
  }

  // ===== Filters =====
  function passesCollection(r) {
    if (state.collection === "all") return true;
    // кол-ция может приходить как r.collection или по префиксу артикула, но у нас есть title.
    // У тебя тестовые: Classic / Modern => ищем по названию
    const t = String(r.title || "").toLowerCase();
    return t.includes(String(state.collection).toLowerCase());
  }

  function passesStatus(r) {
    const s = String(r.status || "").toLowerCase(); // ok/low/oos
    if (state.status === "all") return true;
    if (state.status === "in") return s === "ok";
    if (state.status === "low") return s === "low";
    if (state.status === "none") return s === "oos";
    return true;
  }

  function passesChannel(r) {
    if (state.channel === "all") return true;
    const qb = r.qty_breakdown || {};
    const fbs = safeNum(qb.fbs);
    const fbo = safeNum(qb.fbo);
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

  // ===== Loaders =====
  async function loadCollections() {
    const arr = await fetchJSON(API.collections);
    // ожидаем [{key:"classic",name:"Classic"},...]
    state.collections = Array.isArray(arr) ? arr : [];

    // перерисуем select
    el.collectionSelect.innerHTML = "";

    // "Все коллекции"
    const optAll = document.createElement("option");
    optAll.value = "all";
    optAll.textContent = "Все коллекции";
    el.collectionSelect.appendChild(optAll);

    state.collections.forEach(o => {
      const opt = document.createElement("option");
      opt.value = o.key;
      opt.textContent = o.name;
      el.collectionSelect.appendChild(opt);
    });

    // выставим выбранное
    el.collectionSelect.value = state.collection;
  }

  async function loadStock() {
    el.meta.textContent = "Загрузка...";
    const data = await fetchJSON(API.stock);

    // ожидаем {rows:[...], updated_at:"..."}
    state.rows = Array.isArray(data.rows) ? data.rows : [];
    state.updatedAt = data.updated_at || null;

    render();
  }

  // ===== Render =====
  function render() {
    const rows = state.rows
      .filter(passesCollection)
      .filter(passesStatus)
      .filter(passesChannel);

    // meta
    const total = rows.length;
    const updated = state.updatedAt ? ` · обновлено: ${state.updatedAt}` : "";
    el.meta.textContent = `Найдено: ${total}${updated}`;

    // list
    if (!rows.length) {
      el.list.innerHTML = `<div class="empty">Ничего не найдено по фильтрам</div>`;
      return;
    }

    // сортировка: oos -> low -> ok
    const rank = { oos: 0, low: 1, ok: 2 };
    rows.sort((a, b) => {
      const ra = rank[String(a.status || "").toLowerCase()] ?? 9;
      const rb = rank[String(b.status || "").toLowerCase()] ?? 9;
      if (ra !== rb) return ra - rb;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });

    const html = rows.map(r => {
      const vc = escapeHtml(r.vendor_code || "");
      const title = escapeHtml(r.title || "");
      const qty = safeNum(r.qty);

      const qb = r.qty_breakdown || {};
      const fbs = safeNum(qb.fbs);
      const fbo = safeNum(qb.fbo);

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
        el.meta.textContent = `Ошибка: ${e.message}`;
      }
    });

    el.collectionSelect.addEventListener("change", (e) => {
      state.collection = e.target.value;
      render();
    });

    el.statusBtns.forEach(b => {
      b.addEventListener("click", () => {
        state.status = b.dataset.status; // in/none/low/all
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

    // активные при старте
    setActive(el.statusBtns, state.status, "data-status");
    setActive(el.channelBtns, state.channel, "data-channel");
  }

  // ===== Init =====
  (async function init() {
    if (!assertUI()) return;

    bindUI();

    try {
      await loadCollections();
    } catch (e) {
      console.warn("collections error:", e);
      // не убиваем приложение — просто оставим "Все коллекции"
      el.collectionSelect.innerHTML = `<option value="all">Все коллекции</option>`;
      el.collectionSelect.value = "all";
    }

    try {
      await loadStock();
    } catch (e) {
      el.meta.textContent = `Ошибка: ${e.message}`;
      el.list.innerHTML = `<div class="empty">Не удалось загрузить данные</div>`;
    }
  })();
})();
