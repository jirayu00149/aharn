(function () {
  const iconPaths = {
    x: ['<path d="M18 6 6 18"></path>', '<path d="m6 6 12 12"></path>'],
    monitor: ['<rect width="18" height="12" x="3" y="4" rx="2"></rect>', '<path d="M8 20h8"></path>', '<path d="M12 16v4"></path>'],
    search: ['<circle cx="11" cy="11" r="8"></circle>', '<path d="m21 21-4.3-4.3"></path>'],
    list: ['<path d="M8 6h13"></path>', '<path d="M8 12h13"></path>', '<path d="M8 18h13"></path>', '<path d="M3 6h.01"></path>', '<path d="M3 12h.01"></path>', '<path d="M3 18h.01"></path>'],
    "chevron-down": ['<path d="m6 9 6 6 6-6"></path>'],
    "chevron-right": ['<path d="m9 18 6-6-6-6"></path>'],
    check: ['<path d="M20 6 9 17l-5-5"></path>'],
    plus: ['<path d="M5 12h14"></path>', '<path d="M12 5v14"></path>'],
    minus: ['<path d="M5 12h14"></path>'],
    send: ['<path d="m22 2-7 20-4-9-9-4Z"></path>', '<path d="M22 2 11 13"></path>'],
    receipt: ['<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2Z"></path>', '<path d="M8 7h8"></path>', '<path d="M8 11h8"></path>', '<path d="M8 15h5"></path>'],
    users: ['<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>', '<circle cx="9" cy="7" r="4"></circle>', '<path d="M22 21v-2a4 4 0 0 0-3-3.9"></path>', '<path d="M16 3.1a4 4 0 0 1 0 7.8"></path>'],
    share: ['<circle cx="18" cy="5" r="3"></circle>', '<circle cx="6" cy="12" r="3"></circle>', '<circle cx="18" cy="19" r="3"></circle>', '<path d="m8.6 13.5 6.8 4"></path>', '<path d="m15.4 6.5-6.8 4"></path>'],
    info: ['<circle cx="12" cy="12" r="10"></circle>', '<path d="M12 16v-4"></path>', '<path d="M12 8h.01"></path>'],
    trash: ['<path d="M3 6h18"></path>', '<path d="M8 6V4h8v2"></path>', '<path d="m19 6-1 14H6L5 6"></path>'],
  };

  let db = window.NoodleOS.load();
  const state = db.session;
  let detailDraft = null;
  let toastTimer = null;

  const categoryTabs = document.getElementById("categoryTabs");
  const menuList = document.getElementById("menuList");
  const sectionTitle = document.getElementById("sectionTitle");
  const resultMeta = document.getElementById("resultMeta");
  const cartBar = document.getElementById("cartBar");
  const searchLayer = document.getElementById("searchLayer");
  const searchInput = document.getElementById("searchInput");
  const modalHost = document.getElementById("modalHost");
  const ordersPage = document.getElementById("ordersPage");
  const ordersList = document.getElementById("ordersList");

  const modeLabels = {
    th: { package: "เมนูหน้าร้าน", alaCarte: "เพิ่มพิเศษ" },
    en: { package: "Noodles", alaCarte: "Extras" },
  };

  function saveDb() {
    db.session = state;
    window.NoodleOS.save(db);
  }

  function refreshDb() {
    const latest = window.NoodleOS.load();
    latest.session = { ...latest.session, ...state };
    db = latest;
  }

  function renderIcons(root = document) {
    root.querySelectorAll("[data-icon]").forEach((node) => {
      const paths = iconPaths[node.dataset.icon];
      if (!paths) return;
      node.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths.join("")}</svg>`;
    });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function itemName(item) {
    return state.lang === "en" ? item.en || item.name : item.name;
  }

  function lineName(line) {
    return state.lang === "en" ? line.en || line.name : line.name;
  }

  function elapsedMinutes() {
    return Math.max(1, Math.round((Date.now() - Number(state.startedAt || Date.now())) / 60000));
  }

  function activeCategory() {
    const modeCategories = db.categories[state.mode] || [];
    return state.categoryByMode[state.mode] || modeCategories[0]?.id || "";
  }

  function categoryName(categoryId) {
    const found = (db.categories[state.mode] || []).find((category) => category.id === categoryId);
    return state.lang === "en" ? found?.en || found?.name || "" : found?.name || "";
  }

  function objectPositionFromLabel(label) {
    const positions = ["22% 22%", "50% 24%", "78% 26%", "28% 54%", "62% 54%", "86% 58%", "20% 82%", "52% 82%", "78% 84%"];
    let hash = 0;
    for (let index = 0; index < String(label).length; index += 1) hash += String(label).charCodeAt(index) * (index + 5);
    return positions[hash % positions.length];
  }

  function imageMarkup(item, alt) {
    return `<img src="${escapeHtml(item.img || window.NoodleOS.IMAGE)}" alt="${escapeHtml(alt)}" loading="lazy" data-label="${escapeHtml(alt)}" style="object-position:${objectPositionFromLabel(alt)}">`;
  }

  function renderCollage() {
    const positions = ["18% 24%", "42% 23%", "68% 25%", "88% 30%", "31% 52%", "72% 54%", "18% 78%", "50% 80%", "84% 78%"];
    document.getElementById("photoCollage").innerHTML = positions
      .map((position, index) => `<div class="collage-cell"><img src="${window.NoodleOS.IMAGE}" alt="ภาพเมนูก๋วยเตี๋ยว ${index + 1}" loading="lazy" style="object-position:${position}"></div>`)
      .join("");
  }

  function renderHeader() {
    const restaurant = db.restaurant;
    const tableText = state.lang === "en" ? `Table: ${state.table} | ${state.name}` : `โต๊ะ: ${state.table} | คุณ ${state.name}`;
    document.title = `${restaurant.name} | QR Ordering`;
    document.querySelector(".brand-logo-mini").textContent = restaurant.logoText;
    document.getElementById("brandEyebrow").textContent = `${restaurant.shortName} QR Ordering`;
    document.getElementById("brandHeadline").textContent = state.lang === "en" ? "Order noodles at your table" : "สั่งก๋วยเตี๋ยวที่โต๊ะ";
    document.getElementById("headerSession").textContent = state.lang === "en" ? `Table ${state.table} • ${state.name}` : `โต๊ะ ${state.table} • คุณ ${state.name}`;
    document.getElementById("tablePillText").textContent = tableText;
    document.getElementById("restaurantTitle").textContent = restaurant.name;
    document.getElementById("heroCopy").textContent = restaurant.tagline;
    document.getElementById("logoMark").textContent = restaurant.logoText;
    document.getElementById("summaryPackage").textContent = restaurant.serviceMode;
    document.getElementById("summaryDiners").textContent = state.lang === "en" ? `${state.diners} guests` : `${state.diners} ท่าน`;
    document.getElementById("summaryTime").textContent = state.lang === "en" ? `${elapsedMinutes()} min` : `${elapsedMinutes()} นาที`;
    document.getElementById("orderDot").classList.toggle("hidden", !state.hasNewOrders);
  }

  function renderModeButtons() {
    document.querySelectorAll(".mode-switch button").forEach((button) => {
      const isActive = button.dataset.mode === state.mode;
      button.textContent = modeLabels[state.lang][button.dataset.mode];
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });
  }

  function renderCategories() {
    const active = activeCategory();
    categoryTabs.innerHTML = (db.categories[state.mode] || [])
      .map((category) => `<button class="category-tab ${category.id === active ? "active" : ""}" type="button" role="tab" aria-selected="${category.id === active}" data-category="${category.id}">${escapeHtml(state.lang === "en" ? category.en : category.name)}</button>`)
      .join("");
  }

  function filteredItems() {
    const query = searchInput.value.trim().toLowerCase();
    const modeItems = db.menu.filter((item) => item.mode === state.mode && item.available !== false);
    if (query) {
      return modeItems.filter((item) => [item.name, item.en, item.desc, item.category, item.station, ...(item.tags || [])].join(" ").toLowerCase().includes(query));
    }
    const category = activeCategory();
    if (category === "best") {
      return modeItems.filter((item) => item.category === "best" || (item.tags || []).some((tag) => ["ขายดี", "แนะนำ", "ยอดนิยม"].includes(tag))).slice(0, 8);
    }
    return modeItems.filter((item) => item.category === category);
  }

  function renderMenu() {
    const list = filteredItems();
    const query = searchInput.value.trim();
    sectionTitle.textContent = query ? "ผลการค้นหา" : categoryName(activeCategory());
    resultMeta.textContent = query ? `พบ ${list.length} รายการ` : "แตะเมนูเพื่อเลือกเส้น/ความเผ็ด หรือกด + เพื่อเพิ่มทันที";

    if (!list.length) {
      menuList.innerHTML = `<div class="empty-state"><div><strong>ไม่พบเมนู</strong><span>ลองเปลี่ยนคำค้นหาหรือหมวดหมู่</span></div></div>`;
      return;
    }

    menuList.innerHTML = list
      .map((item) => `
        <article class="menu-row" data-item-id="${item.id}" tabindex="0" role="button" aria-label="${escapeHtml(itemName(item))}">
          <div class="menu-thumb">${imageMarkup(item, itemName(item))}</div>
          <div class="menu-meta">
            <h3>${escapeHtml(itemName(item))}</h3>
            <p>${escapeHtml(item.desc)}</p>
            <div class="menu-tags">${(item.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
          </div>
          <div class="menu-side">
            <span class="price">${window.NoodleOS.money(item.price)}</span>
            <button class="quick-add" type="button" data-action="quick-add" data-item="${item.id}" aria-label="เพิ่ม ${escapeHtml(itemName(item))}">
              <span data-icon="plus"></span>
            </button>
          </div>
        </article>
      `)
      .join("");
    renderIcons(menuList);
  }

  function renderCart() {
    const count = state.cart.reduce((sum, line) => sum + line.qty, 0);
    cartBar.hidden = count === 0;
    document.getElementById("cartCount").textContent = `${count} รายการ`;
    document.getElementById("cartTotal").textContent = window.NoodleOS.money(window.NoodleOS.cartTotal(state.cart));
  }

  function tableOrders() {
    return db.orders.filter((order) => String(order.table) === String(state.table));
  }

  function renderOrders() {
    const orders = tableOrders();
    const lines = orders.flatMap((order) => (order.lines || []).map((line) => ({ ...line, status: order.status, orderId: order.id, createdAt: order.createdAt })));
    const totalQty = lines.reduce((sum, line) => sum + line.qty, 0);
    const total = orders.reduce((sum, order) => sum + window.NoodleOS.orderTotal(order), 0);
    document.getElementById("ordersTimestamp").textContent = `ข้อมูล ณ เวลา ${window.NoodleOS.nowText()}`;
    document.getElementById("orderedCount").textContent = `${totalQty} รายการ`;
    document.getElementById("orderedTotal").textContent = window.NoodleOS.money(total);

    if (!lines.length) {
      ordersList.innerHTML = `<div class="empty-state"><div><strong>ยังไม่มีรายการที่สั่ง</strong><span>ส่งออเดอร์แล้วรายการจะมาอยู่ตรงนี้</span></div></div>`;
      return;
    }

    ordersList.innerHTML = lines
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((line) => `
        <article class="order-row">
          <div class="order-thumb">${imageMarkup(line, lineName(line))}</div>
          <div class="order-main">
            <h3>${escapeHtml(lineName(line))}</h3>
            <strong>x ${line.qty}</strong>
            <div class="ordered-by">${escapeHtml(line.optionText || (line.options || []).join(" • ") || "ตามสูตรร้าน")}</div>
          </div>
          <div class="order-side">
            <span class="price">${window.NoodleOS.money(line.price * line.qty)}</span>
            <span class="status-pill ${line.status === "ready" || line.status === "served" ? "done" : line.status === "cancelled" ? "cancelled" : ""}">${window.NoodleOS.statusText(line.status)}</span>
          </div>
        </article>
      `)
      .join("");
  }

  function render() {
    refreshDb();
    renderHeader();
    renderModeButtons();
    renderCategories();
    renderMenu();
    renderCart();
    renderOrders();
    saveDb();
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1900);
  }

  function makeLine(item, qty = 1, optionText = "", note = "") {
    return {
      id: window.NoodleOS.uid("cart"),
      itemId: item.id,
      name: item.name,
      en: item.en,
      price: item.price,
      qty,
      optionText,
      options: optionText ? [optionText] : [],
      note,
      img: item.img,
      accent: item.accent,
    };
  }

  function addToCart(item, qty = 1, optionText = "", note = "") {
    const signature = JSON.stringify({ itemId: item.id, optionText, note });
    const existing = state.cart.find((line) => line.signature === signature);
    if (existing) existing.qty += qty;
    else state.cart.push({ ...makeLine(item, qty, optionText, note), signature });
    renderCart();
    saveDb();
    showToast(`เพิ่ม ${item.name} แล้ว`);
  }

  function submitOrder() {
    if (!state.cart.length) {
      showToast("ยังไม่มีรายการในออเดอร์");
      return;
    }
    const order = {
      id: `ORD-${String(Date.now()).slice(-6)}`,
      table: state.table,
      customer: state.name,
      status: "new",
      lines: state.cart.map(({ signature, ...line }) => line),
      payment: "unpaid",
      paid: false,
      source: "QR",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    db.orders.unshift(order);
    const table = db.tables.find((entry) => String(entry.id) === String(state.table));
    if (table) table.status = "occupied";
    state.cart = [];
    state.hasNewOrders = true;
    saveDb();
    render();
    openOrders();
    showToast("ส่งออเดอร์เข้าครัวแล้ว");
  }

  function openOrders() {
    state.hasNewOrders = false;
    ordersPage.classList.add("open");
    ordersPage.setAttribute("aria-hidden", "false");
    renderHeader();
    renderOrders();
    saveDb();
  }

  function closeOrders() {
    ordersPage.classList.remove("open");
    ordersPage.setAttribute("aria-hidden", "true");
  }

  function openSearch() {
    searchLayer.classList.add("open");
    searchLayer.setAttribute("aria-hidden", "false");
    window.setTimeout(() => searchInput.focus(), 30);
  }

  function closeSearch() {
    searchLayer.classList.remove("open");
    searchLayer.setAttribute("aria-hidden", "true");
    searchInput.value = "";
    renderMenu();
  }

  function openModal(html, type = "") {
    modalHost.className = "modal-host active";
    modalHost.innerHTML = `<div class="scrim" data-action="close-modal"></div><section class="sheet ${type}" role="dialog" aria-modal="true"><div class="sheet-inner">${html}</div></section>`;
    renderIcons(modalHost);
  }

  function closeModal() {
    modalHost.className = "modal-host";
    modalHost.innerHTML = "";
    detailDraft = null;
  }

  function openCategorySheet() {
    const active = activeCategory();
    const list = (db.categories[state.mode] || [])
      .map((category) => `
        <button class="category-sheet-button ${category.id === active ? "active" : ""}" type="button" data-action="select-category" data-category="${category.id}">
          <span>${escapeHtml(state.lang === "en" ? category.en : category.name)}</span>
          ${category.id === active ? '<span data-icon="check"></span>' : "<span></span>"}
        </button>
      `)
      .join("");
    openModal(`<div class="sheet-head"><h2>หมวดหมู่ทั้งหมด</h2><button class="sheet-close" type="button" data-action="close-modal" aria-label="ปิด"><span data-icon="chevron-down"></span></button></div><div class="category-sheet-list">${list}</div>`, "category-sheet");
  }

  function openInfoSheet() {
    openModal(`
      <div class="info-profile">
        <div class="info-logo">${escapeHtml(db.restaurant.logoText)}</div>
        <h2>${escapeHtml(db.restaurant.name)}</h2>
        <button class="sheet-close" type="button" data-action="close-modal" aria-label="ปิด"><span data-icon="x"></span></button>
      </div>
      <div class="info-card">
        <div><strong>${escapeHtml(db.restaurant.serviceMode)}</strong><div class="info-item"><span data-icon="users"></span><span>${state.diners} ท่าน</span></div></div>
        <div><strong>&nbsp;</strong><span>เวลานั่ง : ${elapsedMinutes()} นาที</span></div>
      </div>
      <section class="terms"><h3>หมายเหตุจากร้าน</h3><p>${escapeHtml(db.restaurant.terms)}</p></section>
      <div class="divider"></div>
      <div class="field-block"><h3>ชื่อของคุณ (แสดงในรายการที่สั่ง)</h3><input class="soft-input" data-field="customerName" value="${escapeHtml(state.name)}" maxlength="18" /></div>
      <div class="mini-form" style="margin-top:18px;">
        <label>เลขโต๊ะ<input class="soft-input" data-field="table" value="${escapeHtml(state.table)}" maxlength="8" /></label>
        <label>จำนวนคน<input class="soft-input" data-field="diners" value="${escapeHtml(state.diners)}" inputmode="numeric" maxlength="2" /></label>
      </div>
      <div class="sheet-actions"><button class="primary-button" type="button" data-action="save-info">บันทึก</button></div>
    `, "info-sheet");
  }

  function qrUrl() {
    const base = window.location.href.split("#")[0];
    const data = `${base}#table=${encodeURIComponent(state.table)}&guest=${encodeURIComponent(state.name)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=560x560&margin=12&data=${encodeURIComponent(data)}`;
  }

  function qrFallbackMarkup() {
    const cells = [];
    const seed = String(state.table).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
    for (let row = 0; row < 17; row += 1) {
      for (let col = 0; col < 17; col += 1) {
        const finder = (row < 5 && col < 5) || (row < 5 && col > 11) || (row > 11 && col < 5);
        const active = finder ? row === 0 || col === 0 || row === 4 || col === 4 || (row > 1 && row < 3 && col > 1 && col < 3) : (row * 11 + col * 7 + seed) % 4 < 2;
        cells.push(active ? "<b></b>" : "<span></span>");
      }
    }
    return `<div class="qr-fallback">${cells.join("")}</div>`;
  }

  function openQRSheet() {
    openModal(`
      <div class="sheet-head center qr-sheet"><span></span><h2>แชร์ QR ให้เพื่อน</h2><button class="sheet-close" type="button" data-action="close-modal" aria-label="ปิด"><span data-icon="x"></span></button></div>
      <div class="qr-sheet"><p>สแกนแล้วจะเข้าหน้าเมนูโต๊ะเดียวกัน</p><div class="table-chip">โต๊ะ ${escapeHtml(state.table)}</div><div class="qr-wrap" id="qrWrap"><img id="qrImage" src="${escapeHtml(qrUrl())}" alt="QR สำหรับโต๊ะ ${escapeHtml(state.table)}"></div></div>
    `, "qr-panel");
    const qrImage = document.getElementById("qrImage");
    if (qrImage) qrImage.onerror = () => (document.getElementById("qrWrap").innerHTML = qrFallbackMarkup());
  }

  function openItemDetail(item) {
    detailDraft = { itemId: item.id, qty: 1 };
    const noodleOptions = db.noodleTypes.map((type) => `<option ${type === item.station ? "selected" : ""}>${escapeHtml(type)}</option>`).join("");
    const spiceOptions = db.spiceLevels.map((level) => `<option>${escapeHtml(level)}</option>`).join("");
    const hasNoodleOptions = item.mode === "package";
    openModal(`
      <div class="sheet-head"><h2>รายละเอียดเมนู</h2><button class="sheet-close" type="button" data-action="close-modal" aria-label="ปิด"><span data-icon="x"></span></button></div>
      <div class="detail-photo">${imageMarkup(item, itemName(item))}</div>
      <div class="detail-title"><h2>${escapeHtml(itemName(item))}</h2><strong>${window.NoodleOS.money(item.price)}</strong></div>
      <p class="detail-desc">${escapeHtml(item.desc)}</p>
      ${hasNoodleOptions ? `
        <div class="mini-form noodle-options">
          <label>เลือกเส้น<select class="soft-input select-input" data-field="noodle">${noodleOptions}</select></label>
          <label>ระดับเผ็ด<select class="soft-input select-input" data-field="spice">${spiceOptions}</select></label>
        </div>
        <div class="option-box"><label><input type="checkbox" data-field="extraEgg"> เพิ่มไข่ออนเซ็น +฿15</label></div>
      ` : ""}
      <textarea class="note-box" data-field="note" placeholder="หมายเหตุ เช่น ไม่ใส่ถั่ว แยกน้ำซุป"></textarea>
      <div class="qty-row"><button type="button" data-action="detail-qty" data-step="-1" aria-label="ลดจำนวน"><span data-icon="minus"></span></button><strong id="detailQty">1</strong><button type="button" data-action="detail-qty" data-step="1" aria-label="เพิ่มจำนวน"><span data-icon="plus"></span></button></div>
      <div class="sheet-actions"><button class="primary-button" type="button" data-action="add-detail"><span data-icon="plus"></span>เพิ่มลงรายการ</button></div>
    `, "detail-sheet");
  }

  function openBillSheet() {
    const orders = tableOrders().filter((order) => order.status !== "cancelled");
    const subtotal = orders.reduce((sum, order) => sum + window.NoodleOS.orderTotal(order), 0);
    const lines = orders.flatMap((order) => order.lines || []);
    openModal(`
      <div class="sheet-head"><h2>บิลค่าอาหาร</h2><button class="sheet-close" type="button" data-action="close-modal" aria-label="ปิด"><span data-icon="x"></span></button></div>
      <section class="bill-list">
        <h3>โต๊ะ ${escapeHtml(state.table)}</h3>
        ${lines.length ? lines.map((line) => `<div class="bill-line"><div>${escapeHtml(lineName(line))}<br><span>x ${line.qty} ${escapeHtml(line.optionText || "")}</span></div><strong>${window.NoodleOS.money(line.price * line.qty)}</strong></div>`).join("") : `<div class="bill-line"><div>ยังไม่มีรายการ</div><strong>฿0.00</strong></div>`}
        <div class="bill-total"><span>รวมทั้งหมด</span><strong>${window.NoodleOS.money(subtotal)}</strong></div>
      </section>
      <div class="sheet-actions"><button class="primary-button" type="button" data-action="close-modal">เสร็จสิ้น</button></div>
    `, "bill-sheet");
  }

  function openSettingsSheet() {
    openModal(`
      <div class="sheet-head"><h2>เมนูระบบ</h2><button class="sheet-close" type="button" data-action="close-modal" aria-label="ปิด"><span data-icon="x"></span></button></div>
      <button class="row-link" type="button" data-action="open-info"><span>ข้อมูลโต๊ะและร้าน</span><span data-icon="chevron-right"></span></button>
      <div class="divider"></div>
      <button class="row-link" type="button" data-action="open-orders"><span>รายการที่สั่ง</span><span data-icon="chevron-right"></span></button>
      <div class="divider"></div>
      <div class="sheet-actions"><button class="danger-button" type="button" data-action="reset-demo"><span data-icon="trash"></span>รีเซ็ตเดโม</button><button class="ghost-button" type="button" data-action="toggle-language">เปลี่ยนภาษา</button></div>
    `, "settings-sheet");
  }

  function saveInfoFromModal() {
    state.name = modalHost.querySelector('[data-field="customerName"]')?.value.trim() || "A";
    state.table = modalHost.querySelector('[data-field="table"]')?.value.trim() || "12";
    const diners = Number.parseInt(modalHost.querySelector('[data-field="diners"]')?.value, 10);
    state.diners = Number.isFinite(diners) && diners > 0 ? Math.min(diners, 99) : 1;
    const table = db.tables.find((entry) => String(entry.id) === String(state.table));
    if (table) table.status = "occupied";
    closeModal();
    render();
    showToast("บันทึกข้อมูลโต๊ะแล้ว");
  }

  function resetDemo() {
    db = window.NoodleOS.reset();
    Object.assign(state, db.session);
    closeModal();
    closeOrders();
    searchInput.value = "";
    render();
    showToast("รีเซ็ตข้อมูลเดโมแล้ว");
  }

  function selectCategory(categoryId) {
    state.categoryByMode[state.mode] = categoryId;
    closeModal();
    searchInput.value = "";
    render();
    categoryTabs.querySelector(`[data-category="${categoryId}"]`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  function switchMode(mode) {
    state.mode = mode;
    searchInput.value = "";
    render();
  }

  function toggleLanguage() {
    state.lang = state.lang === "th" ? "en" : "th";
    render();
    showToast(state.lang === "en" ? "Language: English" : "ภาษา: ไทย");
  }

  document.addEventListener("click", (event) => {
    const modeButton = event.target.closest(".mode-switch [data-mode]");
    if (modeButton) return switchMode(modeButton.dataset.mode);

    const categoryButton = event.target.closest("[data-category]");
    if (categoryButton && !categoryButton.matches(".category-sheet-button")) {
      state.categoryByMode[state.mode] = categoryButton.dataset.category;
      searchInput.value = "";
      return render();
    }

    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      const action = actionButton.dataset.action;
      if (action === "open-search") openSearch();
      if (action === "close-search") closeSearch();
      if (action === "open-categories") openCategorySheet();
      if (action === "open-info") openInfoSheet();
      if (action === "open-settings") openSettingsSheet();
      if (action === "open-qr") openQRSheet();
      if (action === "open-orders") {
        closeModal();
        openOrders();
      }
      if (action === "close-orders") closeOrders();
      if (action === "close-modal") closeModal();
      if (action === "quick-add") {
        const item = db.menu.find((entry) => entry.id === actionButton.dataset.item);
        if (item) addToCart(item, 1, item.mode === "package" ? `${item.station || "เส้นเล็ก"} • เผ็ดกลาง` : "");
      }
      if (action === "submit-order") submitOrder();
      if (action === "select-category") selectCategory(actionButton.dataset.category);
      if (action === "save-info") saveInfoFromModal();
      if (action === "toggle-language") toggleLanguage();
      if (action === "reset-demo") resetDemo();
      if (action === "detail-qty" && detailDraft) {
        detailDraft.qty = Math.max(1, Math.min(99, detailDraft.qty + Number(actionButton.dataset.step)));
        document.getElementById("detailQty").textContent = detailDraft.qty;
      }
      if (action === "add-detail" && detailDraft) {
        const item = db.menu.find((entry) => entry.id === detailDraft.itemId);
        const noodle = modalHost.querySelector('[data-field="noodle"]')?.value;
        const spice = modalHost.querySelector('[data-field="spice"]')?.value;
        const extraEgg = modalHost.querySelector('[data-field="extraEgg"]')?.checked;
        const note = modalHost.querySelector('[data-field="note"]')?.value.trim() || "";
        let optionText = [noodle, spice].filter(Boolean).join(" • ");
        if (extraEgg) optionText = optionText ? `${optionText} • เพิ่มไข่ออนเซ็น` : "เพิ่มไข่ออนเซ็น";
        if (item) addToCart({ ...item, price: item.price + (extraEgg ? 15 : 0) }, detailDraft.qty, optionText, note);
        closeModal();
      }
      if (action === "open-bill" || action === "open-bill-info") openBillSheet();
      return;
    }

    const row = event.target.closest(".menu-row[data-item-id]");
    if (row) {
      const item = db.menu.find((entry) => entry.id === row.dataset.itemId);
      if (item) openItemDetail(item);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (searchLayer.classList.contains("open")) closeSearch();
      else if (modalHost.classList.contains("active")) closeModal();
      else if (ordersPage.classList.contains("open")) closeOrders();
    }
  });

  searchInput.addEventListener("input", renderMenu);
  searchLayer.addEventListener("click", (event) => {
    if (event.target === searchLayer) closeSearch();
  });

  window.addEventListener("hashchange", applyHashTable);

  function applyHashTable() {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const table = hash.get("table");
    const guest = hash.get("guest");
    if (table) state.table = table;
    if (guest) state.name = guest;
  }

  if (window.location.hash) applyHashTable();
  renderIcons(document);
  renderCollage();
  render();
  window.setInterval(() => {
    renderHeader();
    renderOrders();
  }, 30000);
})();
