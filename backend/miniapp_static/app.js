forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".segbtn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      state.channel = btn.dataset.channel;
      loadStock();
    });
  });

  btnRefresh.addEventListener("click", async ()=>{
    await loadAll();
  });
}

async function loadStock(){
  setError("");
  setEmpty(false);
  elList.innerHTML = "";
  renderMeta(0);

  const url = "/api/stock?" + qs({
    tab: state.tab,
    channel: state.channel,
    collection: state.collection
  });

  const res = await fetch(url);
  if (!res.ok) throw new Error("Не удалось загрузить остатки");

  const data = await res.json();
  const rows = data.rows || [];

  renderMeta(rows.length);
  if (rows.length === 0) {
    setEmpty(true);
    return;
  }
  renderRows(rows);
}

async function loadAll(){
  try{
    await loadCollections();
    // Перерисуем активные коллекции красиво:
    // просто повторно загрузим коллекции с учётом state.collection
    // (это упрощение — работает стабильно)
    elCollections.innerHTML = "";
    const res = await fetch("/api/collections");
    const data = await res.json();

    const allBtn = document.createElement("button");
    allBtn.className = "chip" + (state.collection === null ? " active" : "");
    allBtn.textContent = "Все";
    allBtn.onclick = () => { state.collection = null; loadAll(); };
    elCollections.appendChild(allBtn);

    data.forEach(c=>{
      const btn = document.createElement("button");
      btn.className = "chip" + (state.collection === c.key ? " active" : "");
      btn.textContent = c.name;
      btn.onclick = () => { state.collection = c.key; loadAll(); };
      elCollections.appendChild(btn);
    });

    await loadStock();
  } catch(e){
    setError(e.message || "Ошибка");
  }
}

bindTabs();
loadAll();
