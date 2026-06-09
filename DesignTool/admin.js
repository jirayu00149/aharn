(function () {
  let db = window.NoodleOS.load();
  let view = new URLSearchParams(window.location.search).get("view") || "dashboard";
  let editingMenuId = "";
  let toastTimer = null;
  const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
  const MAX_IMAGE_DATA_LENGTH = 1200000;

  const content = document.getElementById("adminContent");
  const searchInput = document.getElementById("adminSearch");
  const viewTitle = document.getElementById("viewTitle");
  const menuToggle = document.querySelector(".admin-menu-toggle");

  const viewNames = {
    dashboard: "แดชบอร์ด",
    orders: "ออเดอร์สด",
    menu: "จัดการเมนู",
    tables: "โต๊ะและ QR",
    stock: "สต๊อก",
    promo: "โปรโมชัน",
    staff: "พนักงาน",
    reports: "รายงาน",
    settings: "ตั้งค่าร้าน",
  };

  function save() {
    window.NoodleOS.save(db);
  }

  function reload() {
    db = window.NoodleOS.load();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function adminImageSrc(item) {
    const src = item?.img || window.NoodleOS.IMAGE;
    if (src === window.NoodleOS.IMAGE && !window.location.pathname.includes("/DesignTool/")) {
      return "./DesignTool/assets/noodle-collage.png";
    }
    return src;
  }

  function adminImageMarkup(item, alt) {
    return `<img src="${escapeHtml(adminImageSrc(item))}" alt="${escapeHtml(alt || "รูปเมนู")}" loading="lazy">`;
  }

  function editableImageValue(item) {
    const src = item?.img || "";
    if (!src || src === window.NoodleOS.IMAGE || src.startsWith("data:")) return "";
    return src;
  }

  function toast(message) {
    const el = document.getElementById("adminToast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
  }

  function statusClass(status) {
    return `status-badge status-${status}`;
  }

  function searchText() {
    return searchInput.value.trim().toLowerCase();
  }

  function orderTotal(order) {
    return window.NoodleOS.orderTotal(order);
  }

  function formatTime(ts) {
    return new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(ts));
  }

  function metrics() {
    const activeOrders = db.orders.filter((order) => order.status !== "cancelled");
    const revenue = activeOrders.reduce((sum, order) => sum + orderTotal(order), 0);
    const pending = db.orders.filter((order) => ["new", "preparing", "ready"].includes(order.status)).length;
    const lowStock = db.inventory.filter((entry) => Number(entry.qty) <= Number(entry.lowAt)).length;
    const occupied = db.tables.filter((table) => table.status === "occupied").length;
    return { activeOrders, revenue, pending, lowStock, occupied };
  }

  function renderShell() {
    document.title = `Admin | ${db.restaurant.name}`;
    document.getElementById("adminLogo").textContent = db.restaurant.logoText;
    document.getElementById("adminBrandName").textContent = db.restaurant.shortName;
    document.getElementById("branchName").textContent = db.restaurant.branch;
    viewTitle.textContent = viewNames[view];
    document.querySelectorAll(".admin-nav button").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  }

  function setAdminMenu(open) {
    document.body.classList.toggle("admin-menu-open", open);
    menuToggle?.setAttribute("aria-expanded", String(open));
  }

  function renderDashboard() {
    const m = metrics();
    const queue = db.orders.filter((order) => ["new", "preparing", "ready"].includes(order.status)).slice(0, 8);
    const low = db.inventory.filter((entry) => Number(entry.qty) <= Number(entry.lowAt)).slice(0, 8);
    const popular = topItems();

    content.innerHTML = `
      <div class="kpi-grid">
        ${kpi("ยอดขายวันนี้", window.NoodleOS.money(m.revenue), `${m.activeOrders.length} ออเดอร์ที่ยังไม่ยกเลิก`)}
        ${kpi("คิวที่ต้องดูแล", m.pending, "รอรับ/กำลังทำ/พร้อมเสิร์ฟ")}
        ${kpi("โต๊ะมีลูกค้า", `${m.occupied}/${db.tables.length}`, "สถานะจาก QR และแอดมิน")}
        ${kpi("สต๊อกใกล้หมด", m.lowStock, "ควรเติมก่อนช่วงพีค")}
      </div>
      <div class="admin-grid">
        <section class="admin-card">
          <h2>คิวครัวล่าสุด</h2>
          <div class="queue-list">
            ${queue.length ? queue.map((order) => `
              <div class="queue-item">
                <div><strong>${order.id} • โต๊ะ ${escapeHtml(order.table)}</strong><div class="muted">${order.lines.map((line) => `${line.name} x${line.qty}`).join(", ")}</div></div>
                <span class="${statusClass(order.status)}">${window.NoodleOS.statusText(order.status)}</span>
              </div>
            `).join("") : `<div class="muted">ไม่มีคิวค้าง</div>`}
          </div>
        </section>
        <section class="admin-card">
          <h2>สต๊อกต้องเช็ค</h2>
          <div class="stock-list">
            ${low.length ? low.map((entry) => `<div class="stock-item"><strong>${escapeHtml(entry.name)}</strong><span class="status-badge low">${entry.qty} ${entry.unit} / ขั้นต่ำ ${entry.lowAt}</span></div>`).join("") : `<div class="muted">สต๊อกยังปลอดภัย</div>`}
          </div>
        </section>
      </div>
      <section class="admin-card" style="margin-top:14px;">
        <h2>เมนูขายดี</h2>
        ${popular.length ? popular.map((entry) => bar(entry.name, entry.qty, popular[0].qty)).join("") : `<div class="muted">ยังไม่มีข้อมูลยอดขาย</div>`}
      </section>
    `;
  }

  function kpi(label, value, note) {
    return `<article class="kpi-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><p>${escapeHtml(note)}</p></article>`;
  }

  function bar(label, value, max) {
    const percent = max ? Math.max(8, Math.round((value / max) * 100)) : 0;
    return `<div class="bar-row"><strong>${escapeHtml(label)}</strong><div class="bar"><i style="width:${percent}%"></i></div><span>${value} ชิ้น</span></div>`;
  }

  function topItems() {
    const map = new Map();
    db.orders
      .filter((order) => order.status !== "cancelled")
      .flatMap((order) => order.lines || [])
      .forEach((line) => map.set(line.itemId, { name: line.name, qty: (map.get(line.itemId)?.qty || 0) + Number(line.qty || 0) }));
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);
  }

  function renderOrders() {
    const q = searchText();
    const status = document.getElementById("orderStatusFilter")?.value || "all";
    const orders = db.orders
      .filter((order) => (status === "all" ? true : order.status === status))
      .filter((order) => [order.id, order.table, order.customer, order.lines.map((line) => line.name).join(" ")].join(" ").toLowerCase().includes(q))
      .sort((a, b) => b.createdAt - a.createdAt);

    content.innerHTML = `
      <div class="section-tools">
        <h2>ออเดอร์สด</h2>
        <div class="filter-row">
          <select id="orderStatusFilter" data-action="rerender">
            ${option("all", "ทุกสถานะ", status)}
            ${["new", "preparing", "ready", "served", "cancelled"].map((entry) => option(entry, window.NoodleOS.statusText(entry), status)).join("")}
          </select>
        </div>
      </div>
      <div class="order-board">
        ${orders.map(orderCard).join("") || `<section class="admin-card"><div class="muted">ไม่พบออเดอร์</div></section>`}
      </div>
    `;
  }

  function orderCard(order) {
    return `
      <article class="order-card">
        <div class="order-head">
          <div>
            <h3>${order.id}</h3>
            <div class="muted">โต๊ะ ${escapeHtml(order.table)} • คุณ ${escapeHtml(order.customer)} • ${formatTime(order.createdAt)}</div>
          </div>
          <span class="${statusClass(order.status)}">${window.NoodleOS.statusText(order.status)}</span>
        </div>
        <ul class="order-lines">
          ${(order.lines || []).map((line) => `<li><strong>${escapeHtml(line.name)}</strong> x${line.qty}<br><span>${escapeHtml(line.optionText || line.note || "ตามสูตรร้าน")}</span></li>`).join("")}
        </ul>
        <div class="muted">ยอดรวม ${window.NoodleOS.money(orderTotal(order))} • ${order.paid ? "ชำระแล้ว" : "ยังไม่ชำระ"}</div>
        <div class="button-row" style="margin-top:12px;">
          ${["new", "preparing", "ready", "served"].map((status) => `<button class="status-btn ${order.status === status ? "primary" : ""}" type="button" data-action="set-order-status" data-id="${order.id}" data-status="${status}">${window.NoodleOS.statusText(status)}</button>`).join("")}
          <button class="status-btn" type="button" data-action="toggle-paid" data-id="${order.id}">${order.paid ? "ยกเลิกชำระ" : "รับเงินแล้ว"}</button>
          <button class="status-btn danger" type="button" data-action="set-order-status" data-id="${order.id}" data-status="cancelled">ยกเลิก</button>
        </div>
      </article>
    `;
  }

  function renderMenu() {
    const q = searchText();
    const item = db.menu.find((entry) => entry.id === editingMenuId) || {};
    const items = db.menu.filter((entry) => [entry.name, entry.en, entry.category, entry.desc].join(" ").toLowerCase().includes(q));
    const categoryOptions = Object.entries(db.categories).flatMap(([mode, categories]) => categories.map((category) => ({ ...category, mode })));

    content.innerHTML = `
      <div class="menu-layout">
        <section class="menu-editor">
          <h2>${editingMenuId ? "แก้ไขเมนู" : "เพิ่มเมนูใหม่"}</h2>
          <form id="menuForm" class="form-grid">
            <input name="name" placeholder="ชื่อเมนู" value="${escapeHtml(item.name || "")}" required />
            <input name="en" placeholder="ชื่ออังกฤษ" value="${escapeHtml(item.en || "")}" />
            <input name="price" type="number" min="0" placeholder="ราคา" value="${escapeHtml(item.price || "")}" required />
            <input name="stock" type="number" min="0" placeholder="จำนวนขายได้" value="${escapeHtml(item.stock ?? 20)}" />
            <select name="mode">${option("package", "เมนูหน้าร้าน", item.mode || "package")}${option("alaCarte", "เพิ่มพิเศษ", item.mode || "package")}</select>
            <select name="category">${categoryOptions.map((cat) => option(cat.id, `${cat.mode === "package" ? "เมนู" : "เพิ่ม"} • ${cat.name}`, item.category || "best")).join("")}</select>
            <input name="station" placeholder="สถานี/วัตถุดิบหลัก" value="${escapeHtml(item.station || "เส้นเล็ก")}" />
            <input name="tags" placeholder="แท็ก คั่นด้วย ," value="${escapeHtml((item.tags || []).join(", "))}" />
            <input class="span-4" name="img" placeholder="ลิงก์รูปเมนู (ถ้ามี)" value="${escapeHtml(editableImageValue(item))}" />
            <label class="image-picker span-4">
              <span>อัปโหลดรูปเมนู</span>
              <input name="imageFile" type="file" accept="image/*" />
              <small>รองรับไฟล์ภาพจากเครื่อง ระบบจะย่อรูปก่อนบันทึกให้อัตโนมัติ</small>
            </label>
            <div class="menu-image-preview span-4">
              <div class="admin-menu-thumb is-large">${adminImageMarkup(item, item.name || "ตัวอย่างรูปเมนู")}</div>
              <span>${item.img && item.img !== window.NoodleOS.IMAGE ? "รูปที่ใช้อยู่ตอนนี้" : "ถ้าไม่ใส่รูป จะใช้ภาพเริ่มต้นของร้าน"}</span>
            </div>
            <textarea class="span-4" name="desc" placeholder="รายละเอียดเมนู">${escapeHtml(item.desc || "")}</textarea>
            <div class="span-4 button-row">
              <button class="admin-action primary" type="submit">${editingMenuId ? "บันทึกเมนู" : "เพิ่มเมนู"}</button>
              <button class="admin-action" type="button" data-action="clear-menu-form">ล้างฟอร์ม</button>
            </div>
          </form>
        </section>
        <section class="data-table-wrap">
          <h2>รายการเมนูทั้งหมด</h2>
          <table class="data-table">
            <thead><tr><th>รูป</th><th>เมนู</th><th>หมวด</th><th>ราคา</th><th>ขายได้</th><th>สถานะ</th><th>จัดการ</th></tr></thead>
            <tbody>
              ${items.map((entry) => `
                <tr>
                  <td><div class="admin-menu-thumb">${adminImageMarkup(entry, entry.name)}</div></td>
                  <td><strong>${escapeHtml(entry.name)}</strong><br><span class="muted">${escapeHtml(entry.desc)}</span></td>
                  <td>${escapeHtml(entry.category)}</td>
                  <td>${window.NoodleOS.money(entry.price)}</td>
                  <td>${entry.stock}</td>
                  <td><span class="status-badge ${entry.available ? "status-ready" : "status-cancelled"}">${entry.available ? "เปิดขาย" : "ปิดขาย"}</span></td>
                  <td><div class="button-row"><button class="admin-action" data-action="edit-menu" data-id="${entry.id}">แก้</button><button class="admin-action" data-action="toggle-menu" data-id="${entry.id}">${entry.available ? "ปิด" : "เปิด"}</button><button class="admin-action danger" data-action="delete-menu" data-id="${entry.id}">ลบ</button></div></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </section>
      </div>
    `;
  }

  function renderTables() {
    content.innerHTML = `
      <div class="section-tools"><h2>โต๊ะและ QR สั่งอาหาร</h2><span class="muted">QR หนึ่งใบต่อหนึ่งโต๊ะ ลูกค้าสแกนแล้วเข้าเมนูสั่งอาหารของโต๊ะนั้นทันที</span></div>
      <section class="menu-editor" style="margin-bottom:14px;">
        <h2>สร้าง QR สำหรับโต๊ะ</h2>
        <form id="tableForm" class="form-grid">
          <input name="id" placeholder="เลขโต๊ะ เช่น 01 หรือ A1" required />
          <input name="seats" type="number" min="1" placeholder="จำนวนที่นั่ง" value="2" required />
          <input class="span-4" name="name" placeholder="ชื่อโต๊ะ เช่น โต๊ะ 01 / ห้อง VIP" />
          <button class="admin-action primary span-4" type="button" data-action="create-table-qr">สร้าง QR ให้ลูกค้าสแกนสั่งอาหาร</button>
        </form>
      </section>
      <div class="table-grid">
        ${db.tables.length ? db.tables.map((table) => `
          <article class="table-tile">
            <strong>${escapeHtml(table.name)}</strong>
            <span class="status-badge">${window.NoodleOS.tableText(table.status)} • ${table.seats} ที่นั่ง</span>
            <span class="muted">สแกน QR นี้เพื่อสั่งอาหารโต๊ะ ${escapeHtml(table.id)}</span>
            <div class="qr-preview qr-preview-box" data-qr-text="${escapeHtml(customerUrl(table))}" aria-label="QR ${escapeHtml(table.name)}">
              <span class="qr-loading">กำลังสร้าง QR</span>
            </div>
            <input class="admin-input" readonly value="${escapeHtml(customerUrl(table))}" />
            <div class="qr-actions">
              <a class="chip-button" href="${escapeHtml(customerUrl(table))}" target="_blank" rel="noreferrer">เปิดหน้าลูกค้า</a>
              <button class="chip-button" type="button" data-action="copy-qr" data-id="${table.id}">คัดลอกลิงก์</button>
              <button class="chip-button" type="button" data-action="download-qr" data-id="${table.id}">โหลด QR</button>
            </div>
            <div class="table-status-row">
              ${["available", "occupied", "reserved", "cleaning"].map((status) => `<button class="chip-button ${table.status === status ? "active" : ""}" data-action="set-table-status" data-id="${table.id}" data-status="${status}">${window.NoodleOS.tableText(status)}</button>`).join("")}
              <button class="chip-button" data-action="delete-table" data-id="${table.id}">ลบ QR</button>
            </div>
          </article>
        `).join("") : `<section class="admin-card"><strong>ยังไม่มี QR โต๊ะ</strong><p class="muted">กรอกเลขโต๊ะด้านบนแล้วกด “สร้าง QR ให้ลูกค้าสแกนสั่งอาหาร” เพื่อเริ่มใช้งาน</p></section>`}
      </div>
    `;
    hydrateQrPreviews();
  }

  function customerUrl(table) {
    const customerPath = window.location.pathname.includes("/DesignTool/") ? "./index.html" : "./DesignTool/index.html";
    const url = new URL(customerPath, window.location.href);
    url.search = "";
    url.hash = `table=${encodeURIComponent(table.id)}`;
    return url.href;
  }

  function hydrateQrPreviews() {
    content.querySelectorAll("[data-qr-text]").forEach((node) => {
      const text = node.dataset.qrText;
      if (!text) return;
      try {
        if (!window.QRCode) throw new Error("QRCode library is not ready");
        node.textContent = "";
        new window.QRCode(node, {
          text,
          width: 128,
          height: 128,
          correctLevel: window.QRCode.CorrectLevel.M,
        });
      } catch (error) {
        node.innerHTML = `<a class="qr-fallback-link" href="${escapeHtml(text)}" target="_blank" rel="noreferrer">เปิดลิงก์โต๊ะนี้</a>`;
      }
    });
  }

  function renderStock() {
    content.innerHTML = `
      <div class="section-tools"><h2>สต๊อก</h2><span class="muted">ปรับจำนวนคงเหลือและจุดเตือนขั้นต่ำ</span></div>
      <section class="menu-editor" style="margin-bottom:14px;">
        <form id="stockForm" class="form-grid">
          <input name="name" placeholder="ชื่อวัตถุดิบ" required />
          <input name="unit" placeholder="หน่วย เช่น kg, ใบ, ลูก" required />
          <input name="qty" type="number" step="0.1" placeholder="จำนวน" required />
          <input name="lowAt" type="number" step="0.1" placeholder="เตือนเมื่อเหลือ" required />
          <button class="admin-action primary span-4" type="submit">เพิ่มวัตถุดิบ</button>
        </form>
      </section>
      <section class="data-table-wrap">
        <table class="data-table">
          <thead><tr><th>วัตถุดิบ</th><th>คงเหลือ</th><th>เตือนขั้นต่ำ</th><th>สถานะ</th><th>ปรับสต๊อก</th></tr></thead>
          <tbody>${db.inventory.map((entry) => `
            <tr>
              <td><strong>${escapeHtml(entry.name)}</strong></td>
              <td>${entry.qty} ${escapeHtml(entry.unit)}</td>
              <td>${entry.lowAt} ${escapeHtml(entry.unit)}</td>
              <td><span class="status-badge ${Number(entry.qty) <= Number(entry.lowAt) ? "low" : "status-ready"}">${Number(entry.qty) <= Number(entry.lowAt) ? "ใกล้หมด" : "ปกติ"}</span></td>
              <td><div class="button-row"><button class="admin-action" data-action="adjust-stock" data-id="${entry.id}" data-step="-1">-1</button><button class="admin-action" data-action="adjust-stock" data-id="${entry.id}" data-step="1">+1</button><button class="admin-action danger" data-action="delete-stock" data-id="${entry.id}">ลบ</button></div></td>
            </tr>`).join("")}</tbody>
        </table>
      </section>
    `;
  }

  function renderPromo() {
    content.innerHTML = `
      <div class="section-tools"><h2>โปรโมชัน</h2><span class="muted">เปิด/ปิดแคมเปญหน้าร้าน</span></div>
      <section class="menu-editor" style="margin-bottom:14px;">
        <form id="promoForm" class="form-grid">
          <input name="name" placeholder="ชื่อโปรโมชัน" required />
          <input name="value" placeholder="รายละเอียด/สิทธิ์ที่ได้" required />
          <input name="starts" placeholder="เริ่ม" value="วันนี้" />
          <input name="ends" placeholder="สิ้นสุด" value="สิ้นเดือน" />
          <button class="admin-action primary span-4" type="submit">เพิ่มโปรโมชัน</button>
        </form>
      </section>
      <div class="mini-list">${db.promos.map((promo) => `<article class="promo-item"><strong>${escapeHtml(promo.name)}</strong><span>${escapeHtml(promo.value)} • ${escapeHtml(promo.starts)} ถึง ${escapeHtml(promo.ends)}</span><div class="button-row"><button class="chip-button ${promo.active ? "active" : ""}" data-action="toggle-promo" data-id="${promo.id}">${promo.active ? "เปิดใช้งาน" : "ปิดอยู่"}</button><button class="admin-action danger" data-action="delete-promo" data-id="${promo.id}">ลบ</button></div></article>`).join("")}</div>
    `;
  }

  function renderStaff() {
    content.innerHTML = `
      <div class="section-tools"><h2>พนักงาน</h2><span class="muted">จัดกะและบทบาทหลังร้าน</span></div>
      <section class="menu-editor" style="margin-bottom:14px;">
        <form id="staffForm" class="form-grid">
          <input name="name" placeholder="ชื่อพนักงาน" required />
          <input name="role" placeholder="ตำแหน่ง" required />
          <input name="shift" placeholder="กะ เช่น 10:00-20:00" required />
          <button class="admin-action primary" type="submit">เพิ่มพนักงาน</button>
        </form>
      </section>
      <div class="mini-list">${db.staff.map((staff) => `<article class="staff-item"><strong>${escapeHtml(staff.name)}</strong><span>${escapeHtml(staff.role)} • ${escapeHtml(staff.shift)}</span><div class="button-row"><button class="chip-button ${staff.active ? "active" : ""}" data-action="toggle-staff" data-id="${staff.id}">${staff.active ? "เข้างาน" : "พักงาน"}</button><button class="admin-action danger" data-action="delete-staff" data-id="${staff.id}">ลบ</button></div></article>`).join("")}</div>
    `;
  }

  function renderReports() {
    const active = db.orders.filter((order) => order.status !== "cancelled");
    const total = active.reduce((sum, order) => sum + orderTotal(order), 0);
    const avg = active.length ? total / active.length : 0;
    const top = topItems();
    const payments = ["cash", "promptpay", "card", "unpaid"].map((type) => ({
      type,
      total: active.filter((order) => order.payment === type).reduce((sum, order) => sum + orderTotal(order), 0),
    }));

    content.innerHTML = `
      <div class="kpi-grid">
        ${kpi("ยอดขายรวม", window.NoodleOS.money(total), "ไม่รวมออเดอร์ยกเลิก")}
        ${kpi("จำนวนออเดอร์", active.length, "ออเดอร์ในระบบ")}
        ${kpi("เฉลี่ยต่อบิล", window.NoodleOS.money(avg), "Average check")}
        ${kpi("เมนูขายดีที่สุด", top[0]?.name || "-", top[0] ? `${top[0].qty} ชิ้น` : "ยังไม่มีข้อมูล")}
      </div>
      <div class="admin-grid">
        <section class="admin-card"><h2>อันดับเมนู</h2>${top.map((entry) => bar(entry.name, entry.qty, top[0].qty)).join("") || `<div class="muted">ยังไม่มีข้อมูล</div>`}</section>
        <section class="admin-card"><h2>ช่องทางชำระเงิน</h2>${payments.map((entry) => bar(paymentName(entry.type), Math.round(entry.total), Math.max(...payments.map((p) => p.total), 1))).join("")}</section>
      </div>
    `;
  }

  function paymentName(type) {
    return { cash: "เงินสด", promptpay: "พร้อมเพย์", card: "บัตร", unpaid: "ยังไม่ชำระ" }[type] || type;
  }

  function renderSettings() {
    content.innerHTML = `
      <section class="menu-editor">
        <h2>ตั้งค่าร้าน</h2>
        <form id="settingsForm" class="settings-grid">
          <input name="name" placeholder="ชื่อร้าน" value="${escapeHtml(db.restaurant.name)}" />
          <input name="shortName" placeholder="ชื่อย่อ" value="${escapeHtml(db.restaurant.shortName)}" />
          <input name="logoText" placeholder="โลโก้ข้อความ" value="${escapeHtml(db.restaurant.logoText)}" />
          <input name="branch" placeholder="สาขา" value="${escapeHtml(db.restaurant.branch)}" />
          <input name="phone" placeholder="เบอร์โทร" value="${escapeHtml(db.restaurant.phone)}" />
          <input name="line" placeholder="LINE" value="${escapeHtml(db.restaurant.line)}" />
          <input name="serviceMode" placeholder="รูปแบบบริการ" value="${escapeHtml(db.restaurant.serviceMode)}" />
          <input name="serviceCharge" type="number" placeholder="Service charge %" value="${escapeHtml(db.restaurant.serviceCharge)}" />
          <textarea class="span-4" name="tagline" placeholder="คำโปรยร้าน">${escapeHtml(db.restaurant.tagline)}</textarea>
          <textarea class="span-4" name="terms" placeholder="หมายเหตุ/เงื่อนไข">${escapeHtml(db.restaurant.terms)}</textarea>
          <button class="admin-action primary span-4" type="submit">บันทึกการตั้งค่า</button>
        </form>
      </section>
    `;
  }

  function option(value, label, selected) {
    return `<option value="${escapeHtml(value)}" ${String(value) === String(selected) ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }

  function render() {
    reload();
    renderShell();
    if (view === "dashboard") renderDashboard();
    if (view === "orders") renderOrders();
    if (view === "menu") renderMenu();
    if (view === "tables") renderTables();
    if (view === "stock") renderStock();
    if (view === "promo") renderPromo();
    if (view === "staff") renderStaff();
    if (view === "reports") renderReports();
    if (view === "settings") renderSettings();
  }

  function createTableQr(form) {
    if (!form) return;
    const data = Object.fromEntries(new FormData(form).entries());
    const id = String(data.id || "").trim();
    if (!id) {
      toast("กรุณาใส่เลขโต๊ะก่อน");
      return;
    }
    const normalized = id.padStart(/^\d+$/.test(id) ? 2 : id.length, "0");
    const table = {
      id: normalized,
      name: data.name?.trim() || `โต๊ะ ${normalized}`,
      seats: Math.max(1, Number(data.seats || 1)),
      status: "available",
      qr: `DesignTool/index.html#table=${encodeURIComponent(normalized)}`,
    };
    const index = db.tables.findIndex((entry) => String(entry.id) === String(normalized));
    if (index >= 0) db.tables[index] = { ...db.tables[index], ...table };
    else db.tables.push(table);
    save();
    renderTables();
    toast(`สร้าง QR สั่งอาหารสำหรับโต๊ะ ${normalized} แล้ว`);
  }

  function safeFileName(value) {
    return String(value || "table").trim().replace(/[^a-z0-9ก-๙_-]+/gi, "-") || "table";
  }

  function triggerDownload(href, fileName) {
    const link = document.createElement("a");
    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function qrDownloadDataUrl(table) {
    if (!window.QRCode) throw new Error("QRCode library is not ready");
    const holder = document.createElement("div");
    holder.style.position = "fixed";
    holder.style.left = "-9999px";
    holder.style.top = "0";
    document.body.appendChild(holder);

    try {
      new window.QRCode(holder, {
        text: customerUrl(table),
        width: 512,
        height: 512,
        correctLevel: window.QRCode.CorrectLevel.M,
      });

      const qrCanvas = holder.querySelector("canvas");
      if (!qrCanvas) throw new Error("QR canvas is not ready");

      const canvas = document.createElement("canvas");
      canvas.width = 720;
      canvas.height = 900;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#15191d";
      ctx.textAlign = "center";
      ctx.font = "700 46px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
      ctx.fillText(db.restaurant.shortName || db.restaurant.name || "เฮียดี้", 360, 86, 620);
      ctx.font = "600 28px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
      ctx.fillStyle = "#59626b";
      ctx.fillText("สแกนเพื่อสั่งอาหารที่โต๊ะ", 360, 130, 620);

      ctx.fillStyle = "#f2f5f7";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(110, 166, 500, 500, 28);
      else ctx.rect(110, 166, 500, 500);
      ctx.fill();
      ctx.drawImage(qrCanvas, 140, 196, 440, 440);

      ctx.fillStyle = "#15191d";
      ctx.font = "800 44px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
      ctx.fillText(table.name || `โต๊ะ ${table.id}`, 360, 720, 620);
      ctx.fillStyle = "#7b848d";
      ctx.font = "500 22px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
      ctx.fillText(customerUrl(table), 360, 766, 640);
      ctx.fillStyle = "#0ea5d3";
      ctx.font = "800 24px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
      ctx.fillText("Powered by เฮียดี้ Noodle OS", 360, 826, 620);
      return canvas.toDataURL("image/png");
    } finally {
      holder.remove();
    }
  }

  function downloadQr(table) {
    try {
      const href = qrDownloadDataUrl(table);
      triggerDownload(href, `qr-${safeFileName(table.id)}.png`);
      toast(`ดาวน์โหลด QR ${table.name} แล้ว`);
    } catch (error) {
      window.open(customerUrl(table), "_blank", "noopener,noreferrer");
      toast("ยังสร้างไฟล์ QR ไม่สำเร็จ เปิดลิงก์โต๊ะแทน");
    }
  }

  function readImageFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.size) {
        resolve("");
        return;
      }
      if (!file.type.startsWith("image/")) {
        reject(new Error("กรุณาเลือกไฟล์รูปภาพเท่านั้น"));
        return;
      }
      if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
        reject(new Error("รูปใหญ่เกินไป กรุณาใช้ไฟล์ไม่เกิน 5MB"));
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error("อ่านไฟล์รูปไม่สำเร็จ"));
      reader.onload = () => {
        const source = String(reader.result || "");
        const image = new Image();
        image.onerror = () => {
          if (source.length > MAX_IMAGE_DATA_LENGTH) {
            reject(new Error("รูปใหญ่เกินไป กรุณาใช้รูปเล็กลงหรือใส่ลิงก์รูปแทน"));
            return;
          }
          resolve(source);
        };
        image.onload = () => {
          const maxSide = 900;
          const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          if (dataUrl.length > MAX_IMAGE_DATA_LENGTH) {
            reject(new Error("รูปยังใหญ่เกินไปหลังย่อ กรุณาใช้รูปเล็กลงหรือใส่ลิงก์รูปแทน"));
            return;
          }
          resolve(dataUrl);
        };
        image.src = source;
      };
      reader.readAsDataURL(file);
    });
  }

  document.addEventListener("click", (event) => {
    const nav = event.target.closest("[data-view]");
    if (nav) {
      view = nav.dataset.view;
      editingMenuId = "";
      render();
      setAdminMenu(false);
      return;
    }

    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id;

    if (action === "toggle-admin-menu") {
      setAdminMenu(!document.body.classList.contains("admin-menu-open"));
      return;
    }
    if (action === "close-admin-menu") {
      setAdminMenu(false);
      return;
    }
    if (action === "reset-demo") {
      db = window.NoodleOS.reset();
      editingMenuId = "";
      render();
      toast("รีเซ็ตข้อมูลเดโมแล้ว");
    }
    if (action === "rerender") render();
    if (action === "create-table-qr") {
      createTableQr(button.closest("form"));
      return;
    }
    if (action === "set-order-status") {
      const order = db.orders.find((entry) => entry.id === id);
      if (order) {
        order.status = button.dataset.status;
        order.updatedAt = Date.now();
        if (order.status === "served") order.paid = true;
        save();
        render();
        toast("อัปเดตสถานะออเดอร์แล้ว");
      }
    }
    if (action === "toggle-paid") {
      const order = db.orders.find((entry) => entry.id === id);
      if (order) {
        order.paid = !order.paid;
        order.payment = order.paid ? "cash" : "unpaid";
        save();
        render();
      }
    }
    if (action === "edit-menu") {
      editingMenuId = id;
      renderMenu();
    }
    if (action === "clear-menu-form") {
      editingMenuId = "";
      renderMenu();
    }
    if (action === "toggle-menu") {
      const item = db.menu.find((entry) => entry.id === id);
      if (item) {
        item.available = !item.available;
        save();
        renderMenu();
      }
    }
    if (action === "delete-menu") {
      db.menu = db.menu.filter((entry) => entry.id !== id);
      save();
      renderMenu();
    }
    if (action === "set-table-status") {
      const table = db.tables.find((entry) => entry.id === id);
      if (table) {
        table.status = button.dataset.status;
        save();
        renderTables();
      }
    }
    if (action === "delete-table") {
      db.tables = db.tables.filter((entry) => entry.id !== id);
      save();
      renderTables();
      toast("ลบ QR โต๊ะแล้ว");
    }
    if (action === "copy-qr") {
      const table = db.tables.find((entry) => entry.id === id);
      if (table) copyText(customerUrl(table));
    }
    if (action === "download-qr") {
      const table = db.tables.find((entry) => entry.id === id);
      if (table) downloadQr(table);
    }
    if (action === "adjust-stock") {
      const entry = db.inventory.find((stock) => stock.id === id);
      if (entry) {
        entry.qty = Math.max(0, Number(entry.qty) + Number(button.dataset.step));
        entry.updatedAt = Date.now();
        save();
        renderStock();
      }
    }
    if (action === "delete-stock") {
      db.inventory = db.inventory.filter((entry) => entry.id !== id);
      save();
      renderStock();
    }
    if (action === "toggle-promo") {
      const promo = db.promos.find((entry) => entry.id === id);
      if (promo) {
        promo.active = !promo.active;
        save();
        renderPromo();
      }
    }
    if (action === "delete-promo") {
      db.promos = db.promos.filter((entry) => entry.id !== id);
      save();
      renderPromo();
    }
    if (action === "toggle-staff") {
      const staff = db.staff.find((entry) => entry.id === id);
      if (staff) {
        staff.active = !staff.active;
        save();
        renderStaff();
      }
    }
    if (action === "delete-staff") {
      db.staff = db.staff.filter((entry) => entry.id !== id);
      save();
      renderStaff();
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.matches("#orderStatusFilter")) renderOrders();
  });

  function copyText(text) {
    const done = () => toast("คัดลอกลิงก์ QR แล้ว");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopyText(text, done));
      return;
    }
    fallbackCopyText(text, done);
  }

  function fallbackCopyText(text, done) {
    const input = document.createElement("input");
    input.value = text;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
    done();
  }

  document.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.target;
    const data = Object.fromEntries(new FormData(form).entries());

    if (form.id === "menuForm") {
      const mode = data.mode || "package";
      const previous = db.menu.find((entry) => entry.id === editingMenuId);
      const imageFile = form.elements.imageFile?.files?.[0];
      let img = String(data.img || "").trim();
      if (imageFile?.size) {
        try {
          img = await readImageFile(imageFile);
        } catch (error) {
          toast(error.message || "บันทึกรูปเมนูไม่สำเร็จ");
          return;
        }
      }
      const next = {
        id: editingMenuId || window.NoodleOS.uid("menu"),
        mode,
        category: data.category || (mode === "package" ? "best" : "topping"),
        name: data.name,
        en: data.en || data.name,
        price: Number(data.price || 0),
        stock: Number(data.stock || 0),
        station: data.station || "เส้นเล็ก",
        tags: String(data.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean),
        desc: data.desc || "",
        available: previous?.available ?? true,
        img: img || previous?.img || window.NoodleOS.IMAGE,
        accent: previous?.accent || "#b1452e",
        cost: Math.round(Number(data.price || 0) * 0.42),
        prepMinutes: Number(data.price || 0) > 100 ? 12 : 6,
      };
      const index = db.menu.findIndex((entry) => entry.id === editingMenuId);
      if (index >= 0) db.menu[index] = { ...db.menu[index], ...next };
      else db.menu.unshift(next);
      editingMenuId = "";
      save();
      renderMenu();
      toast("บันทึกเมนูแล้ว");
    }

    if (form.id === "stockForm") {
      db.inventory.unshift({ id: window.NoodleOS.uid("stock"), name: data.name, unit: data.unit, qty: Number(data.qty), lowAt: Number(data.lowAt), updatedAt: Date.now() });
      save();
      renderStock();
      toast("เพิ่มวัตถุดิบแล้ว");
    }

    if (form.id === "tableForm") {
      createTableQr(form);
    }

    if (form.id === "promoForm") {
      db.promos.unshift({ id: window.NoodleOS.uid("promo"), name: data.name, value: data.value, type: "custom", active: true, starts: data.starts, ends: data.ends });
      save();
      renderPromo();
      toast("เพิ่มโปรโมชันแล้ว");
    }

    if (form.id === "staffForm") {
      db.staff.unshift({ id: window.NoodleOS.uid("staff"), name: data.name, role: data.role, shift: data.shift, active: true });
      save();
      renderStaff();
      toast("เพิ่มพนักงานแล้ว");
    }

    if (form.id === "settingsForm") {
      db.restaurant = { ...db.restaurant, ...data, serviceCharge: Number(data.serviceCharge || 0) };
      save();
      render();
      toast("บันทึกการตั้งค่าร้านแล้ว");
    }
  });

  searchInput.addEventListener("input", () => {
    if (["orders", "menu"].includes(view)) render();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setAdminMenu(false);
  });

  render();
})();
