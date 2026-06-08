(function () {
  let db = window.NoodleOS.load();
  let view = new URLSearchParams(window.location.search).get("view") || "dashboard";
  let editingMenuId = "";
  let toastTimer = null;

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
            <thead><tr><th>เมนู</th><th>หมวด</th><th>ราคา</th><th>ขายได้</th><th>สถานะ</th><th>จัดการ</th></tr></thead>
            <tbody>
              ${items.map((entry) => `
                <tr>
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
      <div class="section-tools"><h2>โต๊ะและ QR</h2><span class="muted">แอดมินสร้าง QR โต๊ะเอง แล้วนำลิงก์/QR ไปพิมพ์ติดโต๊ะ</span></div>
      <section class="menu-editor" style="margin-bottom:14px;">
        <h2>สร้าง QR โต๊ะใหม่</h2>
        <form id="tableForm" class="form-grid">
          <input name="id" placeholder="เลขโต๊ะ เช่น 01 หรือ A1" required />
          <input name="seats" type="number" min="1" placeholder="จำนวนที่นั่ง" value="2" required />
          <input class="span-4" name="name" placeholder="ชื่อโต๊ะ เช่น โต๊ะ 01 / ห้อง VIP" />
          <button class="admin-action primary span-4" type="submit">สร้าง QR โต๊ะ</button>
        </form>
      </section>
      <div class="table-grid">
        ${db.tables.length ? db.tables.map((table) => `
          <article class="table-tile">
            <strong>${escapeHtml(table.name)}</strong>
            <span class="status-badge">${window.NoodleOS.tableText(table.status)} • ${table.seats} ที่นั่ง</span>
            <img class="qr-preview" src="${escapeHtml(qrImageUrl(table))}" alt="QR ${escapeHtml(table.name)}" />
            <input class="admin-input" readonly value="${escapeHtml(customerUrl(table))}" />
            <div class="qr-actions">
              <a class="chip-button" href="${escapeHtml(customerUrl(table))}" target="_blank" rel="noreferrer">เปิดหน้าลูกค้า</a>
              <button class="chip-button" type="button" data-action="copy-qr" data-id="${table.id}">คัดลอกลิงก์</button>
            </div>
            <div class="table-status-row">
              ${["available", "occupied", "reserved", "cleaning"].map((status) => `<button class="chip-button ${table.status === status ? "active" : ""}" data-action="set-table-status" data-id="${table.id}" data-status="${status}">${window.NoodleOS.tableText(status)}</button>`).join("")}
              <button class="chip-button" data-action="delete-table" data-id="${table.id}">ลบ QR</button>
            </div>
          </article>
        `).join("") : `<section class="admin-card"><strong>ยังไม่มี QR โต๊ะ</strong><p class="muted">กรอกเลขโต๊ะด้านบนแล้วกด “สร้าง QR โต๊ะ” เพื่อเริ่มใช้งาน</p></section>`}
      </div>
    `;
  }

  function customerUrl(table) {
    const url = new URL("./index.html", window.location.href);
    url.hash = `table=${encodeURIComponent(table.id)}`;
    return url.href;
  }

  function qrImageUrl(table) {
    return qrSvgDataUrl(customerUrl(table));
  }

  function qrSvgDataUrl(text) {
    const modules = makeQrMatrix(text);
    const quiet = 4;
    const size = modules.length + quiet * 2;
    const path = [];
    for (let y = 0; y < modules.length; y += 1) {
      for (let x = 0; x < modules.length; x += 1) {
        if (!modules[y][x]) continue;
        let run = 1;
        while (x + run < modules.length && modules[y][x + run]) run += 1;
        path.push(`M${x + quiet} ${y + quiet}h${run}v1H${x + quiet}z`);
        x += run - 1;
      }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><path fill="#fff" d="M0 0h${size}v${size}H0z"/><path fill="#111" d="${path.join("")}"/></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function makeQrMatrix(text) {
    const version = 5;
    const size = version * 4 + 17;
    const dataCodewords = 108;
    const eccCodewords = 26;
    const mask = 0;
    const data = encodeQrPayload(text, dataCodewords);
    const codewords = data.concat(reedSolomonRemainder(data, eccCodewords));
    const modules = Array.from({ length: size }, () => Array(size).fill(false));
    const reserved = Array.from({ length: size }, () => Array(size).fill(false));

    drawFunctionPatterns(modules, reserved, version);
    drawCodewords(modules, reserved, codewords, mask);
    drawFormatBits(modules, reserved, mask);
    return modules;
  }

  function encodeQrPayload(text, dataCodewords) {
    const bytes = Array.from(new TextEncoder().encode(text));
    if (bytes.length > 106) throw new Error("QR text is too long");
    const bits = [];
    appendBits(bits, 0b0100, 4);
    appendBits(bits, bytes.length, 8);
    bytes.forEach((byte) => appendBits(bits, byte, 8));
    const capacityBits = dataCodewords * 8;
    appendBits(bits, 0, Math.min(4, capacityBits - bits.length));
    while (bits.length % 8) bits.push(0);

    const data = [];
    for (let i = 0; i < bits.length; i += 8) {
      let value = 0;
      for (let bit = 0; bit < 8; bit += 1) value = (value << 1) | bits[i + bit];
      data.push(value);
    }
    for (let pad = 0; data.length < dataCodewords; pad += 1) data.push(pad % 2 ? 0x11 : 0xec);
    return data;
  }

  function appendBits(bits, value, length) {
    for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
  }

  function drawFunctionPatterns(modules, reserved, version) {
    const size = modules.length;
    drawFinder(modules, reserved, 0, 0);
    drawFinder(modules, reserved, size - 7, 0);
    drawFinder(modules, reserved, 0, size - 7);

    for (let i = 0; i < size; i += 1) {
      if (!reserved[6][i]) setModule(modules, reserved, i, 6, i % 2 === 0);
      if (!reserved[i][6]) setModule(modules, reserved, 6, i, i % 2 === 0);
    }

    [6, 30].forEach((x) => {
      [6, 30].forEach((y) => {
        if (!reserved[y][x]) drawAlignment(modules, reserved, x, y);
      });
    });

    for (let i = 0; i <= 8; i += 1) {
      if (i !== 6) {
        reserveModule(reserved, 8, i);
        reserveModule(reserved, i, 8);
      }
    }
    for (let i = size - 8; i < size; i += 1) {
      reserveModule(reserved, 8, i);
      reserveModule(reserved, i, 8);
    }
    setModule(modules, reserved, 8, version * 4 + 9, true);
  }

  function drawFinder(modules, reserved, left, top) {
    for (let y = -1; y <= 7; y += 1) {
      for (let x = -1; x <= 7; x += 1) {
        const xx = left + x;
        const yy = top + y;
        if (xx < 0 || yy < 0 || yy >= modules.length || xx >= modules.length) continue;
        const black = x >= 0 && x <= 6 && y >= 0 && y <= 6 && (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4));
        setModule(modules, reserved, xx, yy, black);
      }
    }
  }

  function drawAlignment(modules, reserved, cx, cy) {
    for (let y = -2; y <= 2; y += 1) {
      for (let x = -2; x <= 2; x += 1) {
        const black = Math.max(Math.abs(x), Math.abs(y)) === 2 || (x === 0 && y === 0);
        setModule(modules, reserved, cx + x, cy + y, black);
      }
    }
  }

  function drawCodewords(modules, reserved, codewords, mask) {
    const size = modules.length;
    let bitIndex = 0;
    const totalBits = codewords.length * 8;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right -= 1;
      for (let vert = 0; vert < size; vert += 1) {
        const y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
        for (let dx = 0; dx < 2; dx += 1) {
          const x = right - dx;
          if (reserved[y][x]) continue;
          let black = false;
          if (bitIndex < totalBits) {
            black = ((codewords[Math.floor(bitIndex / 8)] >>> (7 - (bitIndex % 8))) & 1) === 1;
            bitIndex += 1;
          }
          if (maskCondition(mask, x, y)) black = !black;
          modules[y][x] = black;
        }
      }
    }
  }

  function maskCondition(mask, x, y) {
    if (mask === 0) return (x + y) % 2 === 0;
    return false;
  }

  function drawFormatBits(modules, reserved, mask) {
    const size = modules.length;
    const bits = getFormatBits(mask);
    const bit = (index) => ((bits >>> index) & 1) === 1;
    for (let i = 0; i <= 5; i += 1) setModule(modules, reserved, 8, i, bit(i));
    setModule(modules, reserved, 8, 7, bit(6));
    setModule(modules, reserved, 8, 8, bit(7));
    setModule(modules, reserved, 7, 8, bit(8));
    for (let i = 9; i < 15; i += 1) setModule(modules, reserved, 14 - i, 8, bit(i));
    for (let i = 0; i < 8; i += 1) setModule(modules, reserved, size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i += 1) setModule(modules, reserved, 8, size - 15 + i, bit(i));
    setModule(modules, reserved, 8, size - 8, true);
  }

  function getFormatBits(mask) {
    const data = (1 << 3) | mask;
    let remainder = data << 10;
    for (let i = 14; i >= 10; i -= 1) {
      if (((remainder >>> i) & 1) !== 0) remainder ^= 0x537 << (i - 10);
    }
    return ((data << 10) | remainder) ^ 0x5412;
  }

  function setModule(modules, reserved, x, y, black) {
    modules[y][x] = black;
    reserved[y][x] = true;
  }

  function reserveModule(reserved, x, y) {
    reserved[y][x] = true;
  }

  function reedSolomonRemainder(data, degree) {
    const gen = reedSolomonGenerator(degree);
    const result = data.concat(Array(degree).fill(0));
    data.forEach((_, i) => {
      const factor = result[i];
      if (!factor) return;
      gen.forEach((coef, j) => {
        result[i + j] ^= gfMultiply(coef, factor);
      });
    });
    return result.slice(data.length);
  }

  function reedSolomonGenerator(degree) {
    let result = [1];
    for (let i = 0; i < degree; i += 1) {
      const next = Array(result.length + 1).fill(0);
      result.forEach((coef, j) => {
        next[j] ^= coef;
        next[j + 1] ^= gfMultiply(coef, gfPow(i));
      });
      result = next;
    }
    return result;
  }

  function gfPow(power) {
    let value = 1;
    for (let i = 0; i < power; i += 1) value = gfMultiply(value, 2);
    return value;
  }

  function gfMultiply(left, right) {
    let result = 0;
    let a = left;
    let b = right;
    while (b > 0) {
      if (b & 1) result ^= a;
      a <<= 1;
      if (a & 0x100) a ^= 0x11d;
      b >>>= 1;
    }
    return result;
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

  function seedOrder() {
    const candidates = db.menu.filter((item) => item.available !== false);
    if (!candidates.length) {
      toast("ยังไม่มีเมนู กรุณาเพิ่มเมนูก่อนสร้างออเดอร์");
      view = "menu";
      render();
      return;
    }
    if (!db.tables.length) {
      toast("ยังไม่มี QR โต๊ะ กรุณาสร้างโต๊ะก่อน");
      view = "tables";
      render();
      return;
    }
    const first = candidates[Math.floor(Math.random() * candidates.length)];
    const second = candidates[Math.floor(Math.random() * candidates.length)];
    const table = db.tables.find((entry) => entry.status !== "available") || db.tables[0];
    const order = {
      id: `ORD-${String(Date.now()).slice(-6)}`,
      table: table.id,
      customer: "Walk-in",
      status: "new",
      payment: "unpaid",
      paid: false,
      source: "Admin",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lines: [first, second].map((item) => ({
        id: window.NoodleOS.uid("line"),
        itemId: item.id,
        name: item.name,
        en: item.en,
        price: item.price,
        qty: 1,
        optionText: item.mode === "package" ? "เส้นเล็ก • เผ็ดกลาง" : "",
        note: "",
        img: item.img,
        accent: item.accent,
      })),
    };
    db.orders.unshift(order);
    table.status = "occupied";
    save();
    render();
    toast("สร้างออเดอร์ทดสอบแล้ว");
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
    if (action === "seed-order") seedOrder();
    if (action === "reset-demo") {
      db = window.NoodleOS.reset();
      editingMenuId = "";
      render();
      toast("รีเซ็ตข้อมูลเดโมแล้ว");
    }
    if (action === "rerender") render();
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

  document.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target;
    const data = Object.fromEntries(new FormData(form).entries());

    if (form.id === "menuForm") {
      const mode = data.mode || "package";
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
        available: true,
        img: window.NoodleOS.IMAGE,
        accent: "#b1452e",
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
      const id = String(data.id || "").trim();
      if (!id) return;
      const normalized = id.padStart(/^\d+$/.test(id) ? 2 : id.length, "0");
      const table = {
        id: normalized,
        name: data.name?.trim() || `โต๊ะ ${normalized}`,
        seats: Math.max(1, Number(data.seats || 1)),
        status: "available",
        qr: `index.html#table=${encodeURIComponent(normalized)}`,
      };
      const index = db.tables.findIndex((entry) => String(entry.id) === String(normalized));
      if (index >= 0) db.tables[index] = { ...db.tables[index], ...table };
      else db.tables.push(table);
      save();
      renderTables();
      toast("สร้าง QR โต๊ะแล้ว");
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
