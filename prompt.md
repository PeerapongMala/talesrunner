# TalesRunner Shop - แพลน

## เทคโนโลยี

- **Frontend + Backoffice:** HTML + CSS + JavaScript (one page each)
- **Database:** Firebase Firestore
- **Hosting:** Firebase Hosting (ฟรี)
- **Theme:** สีม่วง-ชมพู สไตล์เกม TalesRunner

---

## Frontend (หน้าร้าน) — index.html

### Layout

- **Header:** PEERAPONG SHOP + TOTAL X ITEMS
- **Main:** Grid ไอเทม (รูป, ชื่อ, ราคา/ชิ้น)
- **Side Panel:** รายการที่เลือกแล้ว + ปุ่ม "สรุปสินค้า"

### Flow ลูกค้า

1. กดไอเทม → **Modal** ขึ้น มีปุ่ม +/- จำนวน ราคา realtime
2. กดตกลง → ไอเทมเข้า side panel (เช่น "ไอเทม1 x5 = 25 บาท")
3. เลือกหลายไอเทมได้
4. กด **"สรุปสินค้า"** → Modal สรุป:
   - รายการทั้งหมด + ราคารวม
   - Input: Facebook (เช่น P'Peerapong)
   - Input: ชื่อตัวละคร
   - คำเตือน: "หากกรอกผิดและไม่แจ้ง fb: P'Peerapong จะถือว่าไม่รับผิดชอบ"
   - ปุ่มยืนยัน → ส่ง order เข้า Firebase → แสดง "รอแอดมินทักไปหา"

### หน้าประวัติการสั่ง

- ลูกค้ากรอก Facebook ค้นหา → แสดง order ทั้งหมดของตัวเอง (รายการ, ราคา, สถานะ)
- อยู่ใน index.html เป็น section/tab เดียวกัน (one page)

---

## Backoffice (หน้าแอดมิน) — admin.html

### ฟีเจอร์

1. **Order Board** — แสดง order ทั้งหมด (FB, ชื่อตัวละคร, รายการ, ราคารวม, สถานะ)
2. **จัดการสินค้า** — เพิ่ม/ลบ ไอเทม (รูป, ชื่อ, ราคา, **จำนวน stock**)

### ระบบ Stock

- แอดมินกำหนด stock แต่ละไอเทมได้
- ลูกค้ากด +/- ได้ไม่เกิน stock ที่เหลือ
- เมื่อ order ยืนยัน → หัก stock ทันที (ใช้ Firestore transaction กัน race condition)
- ถ้า stock หมด → แสดง "สินค้าหมด" ที่ไอเทม, กดไม่ได้

---

## โครงสร้างไฟล์

```
talesrunnerShop/
  index.html        ← หน้าร้าน
  admin.html         ← backoffice
  css/
    style.css        ← ธีม TalesRunner
  js/
    firebase-config.js
    shop.js          ← logic หน้าร้าน
    admin.js         ← logic backoffice
  assets/            ← รูปไอเทม
```

---

## ลำดับการทำ

1. ~~ตั้ง Firebase config~~ ✅
2. ~~สร้าง HTML + CSS ธีม TalesRunner (Frontend)~~ ✅
3. ~~สร้าง shop.js (modal, +/-, side panel, สรุป, ส่ง order)~~ ✅
4. ~~สร้าง admin.html + admin.js (order board + จัดการสินค้า)~~ ✅
5. ทดสอบ ← **อยู่ตรงนี้**
6. ~~Deploy~~ ✅

---

## Deploy สำเร็จแล้ว

| หน้า | URL |
|------|-----|
| หน้าร้าน | https://telesrunner-peerapong.web.app |
| หน้าแอดมิน | https://telesrunner-peerapong.web.app/admin.html |

- **รหัสแอดมิน:** `peerapong`

### วิธีทดสอบ

1. เข้า **admin.html** → ใส่รหัส `peerapong`
2. เพิ่มสินค้า 1-2 ตัว (ใส่ชื่อ, ราคา, stock, ชื่อไฟล์รูปใน assets/)
3. เข้า **หน้าร้าน** → ลองกดซื้อ → กรอก FB + ชื่อตัวละคร → ยืนยัน
4. กลับ **admin.html** → ดู order board ว่า order เข้ามั้ย
