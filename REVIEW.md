# Security & Code Review — PEERAPONG SHOP

รีวิวครั้งที่ 2 (2026-03-28) — แก้ไขทั้งหมดแล้ว

---

## 1. Authentication & Authorization

| ปัญหา | ก่อนแก้ | หลังแก้ |
|--------|---------|---------|
| Admin password เก็บใน Firestore อ่านได้จาก client | `db.collection('settings').doc('admin').get()` → เห็น password เลย | ใช้ **Firebase Authentication** (email/password) — ไม่มี password ใน Firestore |
| sessionStorage bypass | พิมพ์ `sessionStorage.setItem('adminAuth','true')` = เข้า admin | ใช้ `auth.onAuthStateChanged()` ตรวจ token จาก Firebase Auth |
| Firestore rules เปิด write ทั้งหมด | `allow write: if true` ทุก collection | items write = auth only (ลูกค้าหัก stock ลงได้อย่างเดียว), settings = auth only, orders update = auth only |

### สิ่งที่ต้องทำใน Firebase Console:
1. เปิด Authentication > Sign-in method > Email/Password
2. สร้าง admin user ใน Authentication > Users

---

## 2. XSS Prevention

| ปัญหา | ก่อนแก้ | หลังแก้ |
|--------|---------|---------|
| `escapeHtml()` ไม่ escape single quote `'` | `onclick="fn('${escapeHtml(val)}')"` → XSS ด้วย `');alert(1);//` | เพิ่ม `.replace(/'/g, '&#39;')` |
| Inline onclick ใน order cards | `onclick="updateOrderStatus('${doc.id}', this.value)"` | ใช้ **event delegation** + `data-*` attributes ทั้งหมด |
| Inline onclick ใน cart buttons | `onclick="changeCartQty('${id}', -1)"` | ใช้ event delegation + `data-cart-action` |
| Inline onclick ใน item grid | `onclick="openItemModal('${item.id}')"` | ใช้ event delegation บน `#itemGrid` |
| `onerror` infinite loop | `onerror="this.src='...'"` วนซ้ำถ้า fallback fail | เพิ่ม `this.onerror=null` ก่อน set src |

---

## 3. Race Conditions & Data Integrity

| ปัญหา | ก่อนแก้ | หลังแก้ |
|--------|---------|---------|
| Cancel order คืน stock 2 เท่า | 2 admin กด cancel พร้อมกัน → read-then-batch = stock คืนซ้ำ | ใช้ **Firestore transaction** อ่าน + เขียนใน atomic operation |
| ราคาจาก client ไม่ตรง server | `item.price` จาก cart object → แก้ใน console = สั่งราคา 0 | Transaction **อ่านราคาจาก Firestore** แล้วคำนวณ totalPrice ใหม่ |
| Un-cancel ไม่เช็ค stock | เปลี่ยนจากยกเลิกกลับ → หัก stock โดยไม่เช็คว่ามีพอ | Transaction เช็ค stock ก่อนหัก ถ้าไม่พอ throw error |
| Duplicate onSnapshot listeners | `loadOrders()` สร้าง listener ใหม่ทุกครั้ง → memory leak | เก็บ `unsubOrders` แล้ว unsubscribe ก่อนสร้างใหม่ |

---

## 4. Anti-Spam (ฝั่งลูกค้า)

| มาตรการ | รายละเอียด | ข้อจำกัด |
|---------|-----------|----------|
| Honeypot | ช่อง hidden ที่ bot กรอก → สั่งไม่สำเร็จ | Smart bot ข้ามได้ |
| Cooldown 3 นาที | `localStorage` — สั่งซ้ำเร็วไม่ได้ | Incognito/clear storage bypass ได้ |
| Captcha 4 หลัก | Random number ต้องพิมพ์ให้ตรง | Bot อ่าน DOM ได้ (ไม่ใช่ image captcha) |
| Blocklist | โหลดจาก `settings/spam` — FB ที่โดน BAN สั่งไม่ได้ | Server-side enforced via rules |
| Duplicate pending check | มี order pending = สั่งซ้ำไม่ได้ | TOCTOU race (best-effort) |
| Field validation | FB >= 3, charName >= 2, max 100 | ทั้ง client + Firestore rules |
| Firestore rules | `_hp == ''`, field types, sizes, status == 'pending' | Server-side enforced |

---

## 5. Firestore Rules (ก่อน vs หลัง)

### ก่อนแก้:
```
items:    allow write: if true          ← ใครก็แก้ได้
settings: allow write: if true          ← ใครก็แก้ password ได้
orders:   allow update: if status valid  ← ใครก็เปลี่ยนสถานะได้
```

### หลังแก้:
```
items:    allow create/delete: if isAdmin()
          allow update: if isAdmin() OR (แก้แค่ field stock && stock >= 0)
settings: allow write: if isAdmin()
orders:   allow create: if validation ครบ (ลูกค้า)
          allow update: if isAdmin() OR (ลูกค้าเปลี่ยน pending → cancelled เท่านั้น)
          allow delete: if false
stockHistory: allow create: if isAdmin()
```

`isAdmin()` = `request.auth.uid == 'TUts68ApuzUR5Z6qLunSWvvJSIJ2'`

---

## 6. File & Deployment Security

| ปัญหา | ก่อนแก้ | หลังแก้ |
|--------|---------|---------|
| `public: "."` deploy ทั้ง root | อาจ expose ไฟล์ที่ไม่ต้องการ | เพิ่ม ignore: REVIEW.md, MEMORY.md, package.json |
| test-order.html deploy ขึ้น prod | อยู่ใน prod | เพิ่มใน ignore list |
| Catch-all rewrite | ทุก URL → index.html (ไม่มี 404) | ลบ rewrite ออก |
| firebase-config.js ไม่มี cache-bust | เปลี่ยน config แล้ว browser cache | เพิ่ม `?v=5` |
| Image upload ไม่จำกัดขนาด | Upload 50MB → Firestore 1MB limit crash | จำกัด **2MB** ก่อน process |

---

## 7. Code Quality & UX

| ปัญหา | ก่อนแก้ | หลังแก้ |
|--------|---------|---------|
| ไม่มี loading state | Grid ว่างเปล่าตอนโหลด | แสดง "กำลังโหลดสินค้า..." |
| `parseInt` ไม่มี radix | `parseInt(value)` → อาจ parse ผิด | `parseInt(value, 10)` ทุกที่ |
| History search ไม่มี debounce | Spam ปุ่มได้ไม่จำกัด | เพิ่ม debounce 500ms |
| Modal ไม่มี Escape key | ปิดได้แค่กดปุ่มหรือ overlay | เพิ่ม Escape key handler |
| `<label>` ไม่มี `for` | กดที่ label ไม่ focus input | เพิ่ม `for` attribute ทุก label |
| ไม่มี `aria-label` | ปุ่ม +/- ไม่มี label สำหรับ screen reader | เพิ่ม aria-label |
| Add product ไม่ atomic | `add()` แล้ว `add()` stockHistory แยก → อาจ fail ครึ่งเดียว | ใช้ batch write เป็น atomic |
| Delete product ไม่ลบ subcollection | stockHistory กลายเป็น orphan data | ลบ stockHistory ก่อนลบ item |
| Batch > 500 ใน blockFacebook | BAN คนที่มี order เยอะ → batch fail | แบ่ง chunk ทีละ 499 ops |
| Number type safety | `item.price`, `item.stock` ไม่เช็ค type | ใช้ `Number() || 0` ทุกที่ที่ render |

---

## 8. ข้อจำกัดที่ยังมี (Known Limitations)

| รายการ | เหตุผล |
|--------|--------|
| Orders `allow read: if true` | ลูกค้าต้องดูประวัติตัวเอง แต่ไม่มี auth ฝั่งลูกค้า → ใครก็ query ได้ |
| Captcha เป็น plain text | ไม่ใช่ image captcha → bot อ่าน DOM ได้ ต้องใช้ reCAPTCHA ถ้าจะป้อง bot จริงจัง |
| Cooldown แค่ localStorage | Bypass ได้ด้วย incognito — ต้องทำ server-side rate limit (Cloud Functions) |
| hasPendingOrder อยู่นอก transaction | Firestore transaction ไม่รองรับ query → เป็น best-effort check |
| Global variables | `items`, `cart` อยู่บน window scope → แก้ได้จาก console (แต่ rules ป้องกันแล้ว) |
| ไม่มี pagination | Order/product โหลดทั้งหมด — ถ้าข้อมูลเยอะจะช้า |

---

## สรุป

| ความรุนแรง | แก้แล้ว | เหลือ (known) |
|------------|---------|---------------|
| Critical | 4/4 | 0 |
| High | 6/6 | 0 |
| Medium | 7/7 | 4 (ต้อง Cloud Functions / reCAPTCHA) |
| Low | 9/9 | 2 (pagination, global vars) |
