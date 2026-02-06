forEach(o => {
    const opt = document.createElement("option");
    opt.value = o.key;
    opt.textContent = o.name;
    el.collectionSelect.appendChild(opt);
  });

  el.collectionSelect.value = state.collection;
}

async function loadStock() {
  el.meta.textContent = "Загрузка…";
  const data = await fetchJSON(API.stock);

  // ожидаем {rows:[...], updated_at:"..."}
  state.rows = data.rows || [];
  state.updatedAt = data.updated_at || null;
  render();
}

function bindUI() {
  el.btnRefresh.addEventListener("click", async () => {
    try { await loadStock(); } catch (e) { el.meta.textContent = Ошибка: ${e.message}; }
  });

  el.collectionSelect.addEventListener("change", async (e) => {
    state.collection = e.target.value;
    render();
  });

  el.statusBtns.forEach(b => {
    b.addEventListener("click", () => {
      state.status = b.dataset.status;
      setActive(el.statusBtns, state.status, "data-status");
      render();
    });
  });

  el.channelBtns.forEach(b => {
    b.addEventListener("click", () => {
      state.channel = b.dataset.channel;
      setActive(el.channelBtns, state.channel, "data-channel");
      render();
    });
  });
}

(async function init() {
  bindUI();

  try {
    await loadCollections();
  } catch (e) {
    // если коллекции вдруг упали — UI всё равно работает
    console.warn("collections error:", e);
  }

  try {
    await loadStock();
  } catch (e) {
    el.meta.textContent = Ошибка: ${e.message};
  }
})();
