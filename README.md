# เฮียดี้ ก๋วยเตี๋ยวเรือ

เว็บสั่งอาหารผ่าน QR สำหรับร้านก๋วยเตี๋ยว พร้อมหน้าแอดมินสำหรับจัดการร้าน

## Pages

- ลูกค้า: `DesignTool/index.html`
- แอดมิน: `DesignTool/admin.html`
- จัดการเมนู: `DesignTool/admin.html?view=menu`
- สร้างโต๊ะและ QR: `DesignTool/admin.html?view=tables`

## ระบบหลัก

- ลูกค้าสั่งอาหารจาก QR โต๊ะ
- แอดมินเพิ่ม แก้ไข ลบเมนู และกำหนดราคา
- แอดมินสร้างโต๊ะและ QR เอง
- แอดมินดูออเดอร์สด เปลี่ยนสถานะออเดอร์ และดูบิล
- จัดการสต็อก โปรโมชัน พนักงาน รายงาน และตั้งค่าร้าน

## Deploy on Render

โปรเจกต์นี้เป็น static site และมี `render.yaml` แล้ว เมื่อนำ repo ไปเชื่อมกับ Render ให้เลือก Blueprint หรือ Static Site โดย publish path คือ `./DesignTool`

Render docs ระบุว่า static site ใช้ `runtime: static` และต้องมี `staticPublishPath` ชี้ไปยังโฟลเดอร์ไฟล์ static ใน repo

