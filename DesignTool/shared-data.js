(function () {
  const STORAGE_KEY = "hiadee-noodle-os-v2";
  const IMAGE = "./assets/noodle-collage.png";

  const categories = {
    package: [
      { id: "best", name: "เมนูขายดี", en: "Best sellers" },
      { id: "boat", name: "ก๋วยเตี๋ยวเรือ", en: "Boat noodles" },
      { id: "tomyum", name: "ต้มยำ", en: "Tom yum" },
      { id: "clear", name: "น้ำใส", en: "Clear soup" },
      { id: "dry", name: "แห้ง/บะหมี่", en: "Dry noodles" },
      { id: "rice", name: "ข้าว/เกาเหลา", en: "Rice & soup bowls" },
    ],
    alaCarte: [
      { id: "topping", name: "เพิ่มท็อปปิ้ง", en: "Toppings" },
      { id: "side", name: "ของกินเล่น", en: "Sides" },
      { id: "drink", name: "เครื่องดื่ม", en: "Drinks" },
      { id: "dessert", name: "ของหวาน", en: "Desserts" },
    ],
  };

  const menu = [
    item("boat-pork", "package", "boat", "ก๋วยเตี๋ยวเรือน้ำตกหมู", "Pork boat noodles", 59, "น้ำตกเข้มข้น หมูตุ๋น หมูสด ลูกชิ้น และผักบุ้งลวก", ["ขายดี", "เผ็ดกลาง"], 42, "เส้นเล็ก"),
    item("boat-beef", "package", "boat", "ก๋วยเตี๋ยวเรือน้ำตกเนื้อ", "Beef boat noodles", 75, "น้ำตกเนื้อหอมเครื่องเทศ เนื้อเปื่อย ลูกชิ้นเอ็น และตับ", ["แนะนำ", "เนื้อ"], 31, "เส้นเล็ก"),
    item("tomyum-minced", "package", "tomyum", "ก๋วยเตี๋ยวต้มยำหมูเด้ง", "Tom yum pork noodles", 69, "ต้มยำถั่วคั่วมะนาวสด หมูเด้ง ไข่ยางมะตูม", ["เปรี้ยวเผ็ด", "ยอดนิยม"], 36, "เส้นบะหมี่"),
    item("yen-ta-fo", "package", "tomyum", "เย็นตาโฟทะเล", "Seafood yen ta fo", 89, "ซอสเย็นตาโฟสูตรร้าน ปลาหมึก กุ้ง ลูกชิ้นปลา และผักบุ้ง", ["ทะเล"], 24, "เส้นใหญ่"),
    item("clear-wonton", "package", "clear", "บะหมี่เกี๊ยวน้ำหมูแดง", "Wonton egg noodles", 72, "บะหมี่ไข่ เกี๊ยวหมู น้ำซุปใส และหมูแดงย่าง", ["น้ำใส"], 27, "บะหมี่"),
    item("clear-fishball", "package", "clear", "เส้นหมี่ลูกชิ้นปลา", "Fish ball rice noodles", 62, "น้ำซุปใส ลูกชิ้นปลา ฮือก้วย และขึ้นฉ่าย", ["เบา", "เด็กกินได้"], 18, "เส้นหมี่"),
    item("dry-crispy-pork", "package", "dry", "บะหมี่แห้งหมูกรอบ", "Dry noodles with crispy pork", 79, "บะหมี่คลุกซอสกระเทียมเจียว หมูกรอบ และน้ำซุปแยก", ["กรอบ", "ขายดี"], 29, "บะหมี่"),
    item("dry-spicy", "package", "dry", "ก๋วยเตี๋ยวแห้งยำโบราณ", "Classic spicy dry noodles", 65, "ซอสยำโบราณ ถั่วคั่ว กุ้งแห้ง และหมูสับ", ["เข้มข้น"], 21, "เส้นเล็ก"),
    item("kaolao-hotpot", "package", "rice", "เกาเหลาหม้อไฟหมูตุ๋น", "Pork hotpot soup bowl", 159, "หม้อไฟหมูตุ๋น ลูกชิ้น ตับ ผักบุ้ง และน้ำซุปเติมได้", ["แชร์ได้"], 15, "เกาเหลา"),
    item("rice-braised-pork", "package", "rice", "ข้าวกะเพราหมูตุ๋น", "Braised pork basil rice", 89, "หมูตุ๋นผัดกะเพรา ไข่ดาว และน้ำซุปถ้วยเล็ก", ["จานเดียว"], 19, "ข้าว"),
    item("extra-pork", "alaCarte", "topping", "หมูตุ๋นเพิ่ม", "Extra braised pork", 35, "หมูตุ๋นนุ่มสำหรับเพิ่มในชาม", ["เพิ่มเนื้อ"], 54, "หมูตุ๋น"),
    item("extra-beef", "alaCarte", "topping", "เนื้อเปื่อยเพิ่ม", "Extra braised beef", 45, "เนื้อเปื่อยนุ่ม หอมเครื่องเทศ", ["เพิ่มเนื้อ"], 28, "เนื้อเปื่อย"),
    item("extra-egg", "alaCarte", "topping", "ไข่ออนเซ็น", "Onsen egg", 15, "ไข่ออนเซ็นเพิ่มความนัว", ["ท็อปปิ้ง"], 66, "ไข่"),
    item("extra-noodle", "alaCarte", "topping", "เส้นลวกเพิ่ม", "Extra noodles", 12, "เลือกเส้นได้ เสิร์ฟแยกถ้วย", ["เส้น"], 80, "เส้น"),
    item("wonton-fried", "alaCarte", "side", "เกี๊ยวทอด", "Fried wontons", 35, "เกี๊ยวทอดกรอบ เสิร์ฟพร้อมน้ำจิ้มบ๊วย", ["กรอบ"], 44, "เกี๊ยว"),
    item("pork-balls", "alaCarte", "side", "ลูกชิ้นหมูปิ้ง 4 ไม้", "Grilled pork balls", 49, "ลูกชิ้นปิ้งราดน้ำจิ้มสูตรร้าน", ["ปิ้ง"], 37, "ลูกชิ้น"),
    item("pork-crackle", "alaCarte", "side", "แคบหมู", "Pork crackling", 25, "แคบหมูกรอบ กินคู่ก๋วยเตี๋ยว", ["ขายดี"], 58, "แคบหมู"),
    item("chrysanthemum", "alaCarte", "drink", "น้ำเก๊กฮวย", "Chrysanthemum tea", 25, "หวานน้อย แช่เย็น", ["เย็น"], 72, "เครื่องดื่ม"),
    item("longan", "alaCarte", "drink", "น้ำลำไย", "Longan drink", 25, "ลำไยหอมหวาน เสิร์ฟเย็น", ["เย็น"], 61, "เครื่องดื่ม"),
    item("thai-tea", "alaCarte", "drink", "ชาไทย", "Thai tea", 35, "ชาไทยเข้มข้น นมสด", ["เย็น"], 49, "เครื่องดื่ม"),
    item("water", "alaCarte", "drink", "น้ำเปล่า", "Water", 15, "น้ำดื่มแช่เย็น", ["พื้นฐาน"], 120, "เครื่องดื่ม"),
    item("coconut-pudding", "alaCarte", "dessert", "วุ้นมะพร้าวนมสด", "Coconut milk jelly", 39, "ของหวานเย็น หอมมะพร้าว", ["หวาน"], 22, "ของหวาน"),
  ];

  function item(id, mode, category, name, en, price, desc, tags, stock, station) {
    return {
      id,
      mode,
      category,
      name,
      en,
      price,
      desc,
      tags,
      stock,
      station,
      available: true,
      img: IMAGE,
      accent: "#b1452e",
      cost: Math.round(price * 0.42),
      prepMinutes: price > 100 ? 12 : 6,
    };
  }

  function makeOrders() {
    return [
      order("ORD-1028", "12", "A", "preparing", [
        line("boat-pork", 2, "เส้นเล็ก • เผ็ดกลาง", ["ไม่ใส่ตับ"]),
        line("wonton-fried", 1, "", []),
      ], "promptpay"),
      order("ORD-1027", "08", "B", "ready", [
        line("tomyum-minced", 1, "บะหมี่ • เผ็ดมาก", ["แยกพริก"]),
        line("chrysanthemum", 2, "", []),
      ], "cash"),
      order("ORD-1026", "04", "C", "served", [
        line("dry-crispy-pork", 1, "บะหมี่ • ไม่เผ็ด", []),
        line("water", 1, "", []),
      ], "card"),
    ];
  }

  function line(itemId, qty, optionText, notes) {
    const found = menu.find((entry) => entry.id === itemId);
    return {
      id: uid("line"),
      itemId,
      name: found.name,
      en: found.en,
      price: found.price,
      qty,
      optionText,
      options: optionText ? [optionText] : [],
      note: notes.join(", "),
      img: found.img,
      accent: found.accent,
    };
  }

  function order(id, table, customer, status, lines, payment) {
    const createdAt = Date.now() - Math.floor(Math.random() * 42 + 8) * 60000;
    return {
      id,
      table,
      customer,
      status,
      lines,
      payment,
      paid: status === "served",
      source: "QR",
      createdAt,
      updatedAt: createdAt + 5 * 60000,
    };
  }

  const seed = {
    restaurant: {
      name: "เฮียดี้ ก๋วยเตี๋ยวเรือ",
      shortName: "เฮียดี้",
      logoText: "ดี้",
      branch: "สาขาตลาดกลาง",
      phone: "02-118-2468",
      line: "@hiateknoodle",
      tagline: "ก๋วยเตี๋ยวเรือเข้มข้น เสิร์ฟไว จัดการง่าย",
      serviceMode: "Dine-in",
      serviceCharge: 0,
      vat: 0,
      currency: "฿",
      terms: "กรุณาตรวจรายการก่อนส่งเข้าครัว หากต้องการเปลี่ยนเส้นหรือระดับความเผ็ด ให้ระบุในหมายเหตุ",
    },
    categories,
    menu,
    noodleTypes: ["เส้นเล็ก", "เส้นหมี่", "เส้นใหญ่", "บะหมี่", "วุ้นเส้น", "เกาเหลา"],
    spiceLevels: ["ไม่เผ็ด", "เผ็ดน้อย", "เผ็ดกลาง", "เผ็ดมาก", "เผ็ดร้าน"],
    tables: Array.from({ length: 24 }, (_, index) => {
      const id = String(index + 1).padStart(2, "0");
      return {
        id,
        name: `โต๊ะ ${id}`,
        seats: index % 4 === 0 ? 4 : index % 3 === 0 ? 6 : 2,
        status: index < 6 ? "occupied" : index === 8 ? "reserved" : index === 10 ? "cleaning" : "available",
        qr: `index.html#table=${id}`,
      };
    }),
    inventory: [
      stock("เส้นเล็ก", "kg", 34, 12),
      stock("เส้นหมี่", "kg", 18, 8),
      stock("บะหมี่ไข่", "kg", 16, 7),
      stock("น้ำซุปเรือ", "หม้อ", 9, 4),
      stock("หมูตุ๋น", "kg", 4.2, 5),
      stock("เนื้อเปื่อย", "kg", 3.8, 4),
      stock("ลูกชิ้นหมู", "ลูก", 320, 120),
      stock("เกี๊ยวทอด", "ถุง", 11, 5),
      stock("ผักบุ้ง", "kg", 6.5, 4),
      stock("ถ้วยกลับบ้าน", "ใบ", 78, 100),
    ],
    promos: [
      { id: uid("promo"), name: "ครบ 250 ฟรีเกี๊ยวทอด", type: "gift", value: "เกี๊ยวทอด 1 ที่", active: true, starts: "วันนี้", ends: "สิ้นเดือน" },
      { id: uid("promo"), name: "ชุดกลางวัน 99", type: "bundle", value: "ก๋วยเตี๋ยว + น้ำเก๊กฮวย", active: true, starts: "11:00", ends: "14:00" },
    ],
    staff: [
      { id: uid("staff"), name: "เมย์", role: "แคชเชียร์", shift: "09:00-17:00", active: true },
      { id: uid("staff"), name: "เชฟตี๋", role: "ครัวก๋วยเตี๋ยว", shift: "10:00-20:00", active: true },
      { id: uid("staff"), name: "บอล", role: "เสิร์ฟ/วิ่งอาหาร", shift: "12:00-22:00", active: true },
    ],
    orders: makeOrders(),
    session: {
      table: "12",
      name: "A",
      diners: 2,
      startedAt: Date.now(),
      lang: "th",
      mode: "package",
      categoryByMode: { package: "best", alaCarte: "topping" },
      cart: [],
      hasNewOrders: true,
    },
  };

  Object.assign(seed.restaurant, {
    name: "\u0e40\u0e2e\u0e35\u0e22\u0e14\u0e35\u0e49 \u0e01\u0e4b\u0e27\u0e22\u0e40\u0e15\u0e35\u0e4b\u0e22\u0e27\u0e40\u0e23\u0e37\u0e2d",
    shortName: "\u0e40\u0e2e\u0e35\u0e22\u0e14\u0e35\u0e49",
    logoText: "\u0e14\u0e35\u0e49",
    line: "@hiadeenoodle",
  });
  seed.menu = [];
  seed.orders = [];
  seed.tables = [];

  function stock(name, unit, qty, lowAt) {
    return { id: uid("stock"), name, unit, qty, lowAt, updatedAt: Date.now() };
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  const API_STATE_PATH = "/api/state";

  function canUseApi() {
    return /^https?:$/.test(window.location.protocol);
  }

  function apiRequest(method, payload) {
    if (!canUseApi()) return null;
    const request = new XMLHttpRequest();
    request.open(method, `${window.location.origin}${API_STATE_PATH}`, false);
    request.setRequestHeader("Accept", "application/json");
    if (payload) request.setRequestHeader("Content-Type", "application/json");
    request.send(payload ? JSON.stringify(payload) : null);
    if (request.status < 200 || request.status >= 300) return null;
    return request.responseText ? JSON.parse(request.responseText) : null;
  }

  function readLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function writeLocal(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function remotePayload(data) {
    const next = clone(data);
    delete next.session;
    return next;
  }

  function load() {
    const local = readLocal();
    try {
      const remote = apiRequest("GET");
      if (remote && typeof remote === "object") {
        const next = normalize({ ...remote, session: local?.session || remote.session }, { persist: false });
        writeLocal(next);
        return next;
      }
    } catch (error) {
      // Fall back to local state when the API is unavailable.
    }

    try {
      if (!local) {
        const next = clone(seed);
        writeLocal(next);
        return next;
      }
      return normalize(local);
    } catch (error) {
      return clone(seed);
    }
  }

  function normalize(data, options = {}) {
    const shouldPersist = options.persist !== false;
    const next = { ...clone(seed), ...data };
    next.restaurant = { ...clone(seed).restaurant, ...(data.restaurant || {}) };
    next.categories = data.categories || clone(seed).categories;
    next.menu = Array.isArray(data.menu) ? data.menu : clone(seed).menu;
    next.orders = Array.isArray(data.orders) ? data.orders : clone(seed).orders;
    next.tables = Array.isArray(data.tables) ? data.tables : clone(seed).tables;
    next.inventory = Array.isArray(data.inventory) ? data.inventory : clone(seed).inventory;
    next.promos = Array.isArray(data.promos) ? data.promos : clone(seed).promos;
    next.staff = Array.isArray(data.staff) ? data.staff : clone(seed).staff;
    next.session = { ...clone(seed).session, ...(data.session || {}) };
    if (shouldPersist) save(next);
    return next;
  }

  function save(data) {
    writeLocal(data);
    try {
      apiRequest("POST", remotePayload(data));
    } catch (error) {
      // Local state is already saved; the next successful API call will resync.
    }
  }

  function reset() {
    const next = clone(seed);
    next.session.startedAt = Date.now();
    save(next);
    return next;
  }

  function money(value) {
    return `฿${Number(value || 0).toFixed(2)}`;
  }

  function orderTotal(order) {
    return (order.lines || []).reduce((sum, entry) => sum + Number(entry.price || 0) * Number(entry.qty || 0), 0);
  }

  function cartTotal(cart) {
    return (cart || []).reduce((sum, entry) => sum + Number(entry.price || 0) * Number(entry.qty || 0), 0);
  }

  function statusText(status) {
    return {
      new: "รอรับออเดอร์",
      preparing: "กำลังทำ",
      ready: "พร้อมเสิร์ฟ",
      served: "เสิร์ฟแล้ว",
      cancelled: "ยกเลิก",
    }[status] || status;
  }

  function tableText(status) {
    return {
      available: "ว่าง",
      occupied: "มีลูกค้า",
      reserved: "จอง",
      cleaning: "รอเก็บโต๊ะ",
    }[status] || status;
  }

  function nowText() {
    return new Intl.DateTimeFormat("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
  }

  window.NoodleOS = {
    STORAGE_KEY,
    IMAGE,
    seed,
    load,
    save,
    reset,
    uid,
    money,
    orderTotal,
    cartTotal,
    statusText,
    tableText,
    nowText,
    clone,
  };
})();
