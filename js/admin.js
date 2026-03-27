// ============================================
// PEERAPONG SHOP - Admin Logic
// ============================================

let currentStockItemId = null;
let currentStockItemName = '';
let addImageBase64 = null;
let editImageBase64 = null;

// ============ PASSWORD CHECK (from Firestore) ============
function setupPassword() {
  const modal = document.getElementById('passwordModal');
  const input = document.getElementById('passwordInput');
  const btn = document.getElementById('passwordSubmit');
  const error = document.getElementById('passwordError');

  // ถ้าเคย login แล้วใน session นี้ ข้ามไปเลย
  if (sessionStorage.getItem('adminAuth') === 'true') {
    modal.classList.remove('active');
    document.getElementById('adminContent').style.display = 'block';
    loadOrders();
    loadProducts();
    return;
  }

  async function tryLogin() {
    btn.disabled = true;
    btn.textContent = 'กำลังตรวจสอบ...';
    error.style.display = 'none';

    try {
      const doc = await db.collection('settings').doc('admin').get();
      if (!doc.exists) {
        error.textContent = 'ยังไม่ได้ตั้งรหัสผ่าน กรุณาตั้งค่าใน Firestore (settings/admin)';
        error.style.display = 'block';
        return;
      }

      const adminPassword = doc.data().password;
      if (input.value === adminPassword) {
        sessionStorage.setItem('adminAuth', 'true');
        modal.classList.remove('active');
        document.getElementById('adminContent').style.display = 'block';
        loadOrders();
        loadProducts();
      } else {
        error.textContent = 'รหัสผ่านไม่ถูกต้อง';
        error.style.display = 'block';
        input.value = '';
        input.focus();
      }
    } catch (e) {
      error.textContent = 'เชื่อมต่อไม่ได้: ' + e.message;
      error.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'เข้าสู่ระบบ';
    }
  }

  btn.addEventListener('click', tryLogin);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') tryLogin();
  });
}

// ============ TABS ============
function setupTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
      document.getElementById(tab.dataset.tab + 'Section').classList.add('active');
    });
  });
}

// ============ LOAD ORDERS (Real-time) ============
let knownOrderIds = new Set();
let firstLoad = true;

function loadOrders() {
  const board = document.getElementById('orderBoard');

  db.collection('orders')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snapshot => {
      // นับสถานะ
      let pending = 0, completed = 0, cancelled = 0;
      snapshot.docs.forEach(doc => {
        const s = doc.data().status || 'pending';
        if (s === 'pending') pending++;
        else if (s === 'completed') completed++;
        else if (s === 'cancelled') cancelled++;
      });

      document.getElementById('pendingCounter').textContent = 'รอดำเนินการ: ' + pending;
      document.getElementById('completedCounter').textContent = 'เสร็จแล้ว: ' + completed;
      document.getElementById('cancelledCounter').textContent = 'ยกเลิก: ' + cancelled;

      // หา order ใหม่
      const newIds = new Set();
      if (!firstLoad) {
        snapshot.docs.forEach(doc => {
          if (!knownOrderIds.has(doc.id)) newIds.add(doc.id);
        });
        if (newIds.size > 0) {
          showToast('Order ใหม่ +' + newIds.size + ' | รอดำเนินการ: ' + pending);
        }
      }
      knownOrderIds = new Set(snapshot.docs.map(doc => doc.id));
      firstLoad = false;

      if (snapshot.empty) {
        board.innerHTML = '<p style="color:#aaa;text-align:center;">ยังไม่มี order</p>';
        return;
      }

      const total = snapshot.docs.length;
      board.innerHTML = snapshot.docs.map((doc, index) => {
        const order = doc.data();
        const date = order.createdAt ? order.createdAt.toDate().toLocaleString('th-TH') : '-';
        const items = Array.isArray(order.items) ? order.items : [];
        const itemsText = items.map(i => `${escapeHtml(i.name)} x${i.qty}`).join('<br>');
        const status = order.status || 'pending';
        const isNew = newIds.has(doc.id);
        const orderNum = total - index;

        return `
          <div class="admin-order-card ${isNew ? 'order-new' : ''}">
            ${isNew ? '<span class="new-badge">ใหม่</span>' : ''}
            <div class="admin-order-header">
              <span style="font-weight:600;color:#e0b0ff;">#${orderNum}</span>
              <span style="font-weight:600;">FB: ${escapeHtml(order.facebook)}</span>
              <span style="font-size:13px;color:#aaa;">${date}</span>
            </div>
            <div class="admin-order-info">
              <div>ตัวละคร: <strong>${escapeHtml(order.characterName)}</strong></div>
              <div style="margin-top:8px;">${itemsText}</div>
              <div style="color:#ff69b4;font-weight:600;margin-top:8px;">รวม ${order.totalPrice} บาท</div>
            </div>
            <div class="admin-order-actions">
              <select onchange="updateOrderStatus('${doc.id}', this.value)">
                <option value="pending" ${status === 'pending' ? 'selected' : ''}>รอดำเนินการ</option>
                <option value="completed" ${status === 'completed' ? 'selected' : ''}>เสร็จแล้ว</option>
                <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>ยกเลิก</option>
              </select>
              <select class="admin-handler-select" onchange="updateOrderHandler('${doc.id}', this.value)">
                <option value="" ${!order.handledBy ? 'selected' : ''}>ผู้ดูแล</option>
                <option value="พี" ${order.handledBy === 'พี' ? 'selected' : ''}>พี</option>
                <option value="เลย์" ${order.handledBy === 'เลย์' ? 'selected' : ''}>เลย์</option>
              </select>
            </div>
          </div>
        `;
      }).join('');
    }, e => {
      console.error(e);
      board.innerHTML = '<p style="color:#ff6b6b;text-align:center;">โหลด order ไม่ได้</p>';
    });
}

// ============ UPDATE ORDER STATUS ============
async function updateOrderStatus(orderId, newStatus) {
  try {
    await db.collection('orders').doc(orderId).update({ status: newStatus });
  } catch (e) {
    showAlert('อัพเดทสถานะไม่ได้: ' + e.message, 'ผิดพลาด');
  }
}

// ============ UPDATE ORDER HANDLER ============
async function updateOrderHandler(orderId, handler) {
  try {
    await db.collection('orders').doc(orderId).update({ handledBy: handler });
  } catch (e) {
    showAlert('อัพเดทผู้ดูแลไม่ได้: ' + e.message, 'ผิดพลาด');
  }
}

// ============ LOAD PRODUCTS ============
async function loadProducts() {
  const tbody = document.getElementById('productTableBody');

  try {
    const snapshot = await db.collection('items').get();

    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#aaa;">ยังไม่มีสินค้า</td></tr>';
      return;
    }

    tbody.innerHTML = snapshot.docs.map((doc, index) => {
      const item = doc.data();
      return `
        <tr>
          <td style="text-align:center;color:#e0b0ff;font-weight:600;">${index + 1}</td>
          <td><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22><rect fill=%22%23333%22 width=%2250%22 height=%2250%22/></svg>'"></td>
          <td>${escapeHtml(item.name)}</td>
          <td>${item.price} บาท</td>
          <td style="font-weight:600;text-align:center;">${item.stock}</td>
          <td style="text-align:center;"><button class="btn-icon" data-action="addStock" data-id="${doc.id}" data-name="${escapeHtml(item.name)}">+</button></td>
          <td style="text-align:center;"><button class="btn-icon" data-action="stockHistory" data-id="${doc.id}" data-name="${escapeHtml(item.name)}">&#128065;</button></td>
          <td style="text-align:center;white-space:nowrap;">
            <button class="btn-icon" data-action="edit" data-id="${doc.id}" data-name="${escapeHtml(item.name)}" data-price="${item.price}" data-image="${escapeHtml(item.image || '')}" title="แก้ไข"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>
            <button class="btn-icon btn-icon-danger" data-action="delete" data-id="${doc.id}" title="ลบ"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (e) {
    console.error(e);
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#ff6b6b;">โหลดสินค้าไม่ได้</td></tr>';
  }
}

// ============ FIELD ERROR HELPERS ============
function showFieldError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add('show');
}

function clearFieldErrors() {
  document.querySelectorAll('.field-error').forEach(el => {
    el.textContent = '';
    el.classList.remove('show');
  });
}

// ============ ADD STOCK MODAL ============
function openAddStockModal(itemId, itemName) {
  currentStockItemId = itemId;
  currentStockItemName = itemName;
  clearFieldErrors();
  document.getElementById('addStockItemName').textContent = itemName;
  document.getElementById('addStockQty').value = '';
  document.getElementById('addStockBy').value = '';
  document.getElementById('addStockModal').classList.add('active');
}

function closeAddStockModal() {
  document.getElementById('addStockModal').classList.remove('active');
  currentStockItemId = null;
}

async function confirmAddStock() {
  clearFieldErrors();
  const qty = parseInt(document.getElementById('addStockQty').value);
  const addedBy = document.getElementById('addStockBy').value.trim();

  let hasError = false;
  if (!qty || qty <= 0) { showFieldError('addStockQtyError', 'กรุณากรอกจำนวน'); hasError = true; }
  if (!addedBy) { showFieldError('addStockByError', 'กรุณากรอกชื่อคนเพิ่ม'); hasError = true; }
  if (hasError) return;

  const btn = document.getElementById('confirmAddStock');
  btn.disabled = true;
  btn.textContent = 'กำลังเพิ่ม...';

  try {
    // เพิ่ม stock + บันทึกประวัติ (atomic)
    const batch = db.batch();
    batch.update(db.collection('items').doc(currentStockItemId), {
      stock: firebase.firestore.FieldValue.increment(qty)
    });
    batch.set(db.collection('items').doc(currentStockItemId).collection('stockHistory').doc(), {
      qty,
      addedBy,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await batch.commit();

    closeAddStockModal();
    loadProducts();
  } catch (e) {
    showAlert('เพิ่ม stock ไม่ได้: ' + e.message, 'ผิดพลาด');
  } finally {
    btn.disabled = false;
    btn.textContent = 'เพิ่ม Stock';
  }
}

// ============ STOCK HISTORY MODAL ============
async function openStockHistory(itemId, itemName) {
  document.getElementById('stockHistoryItemName').textContent = itemName;
  const list = document.getElementById('stockHistoryList');
  list.innerHTML = '<p style="text-align:center;color:#aaa;">กำลังโหลด...</p>';
  document.getElementById('stockHistoryModal').classList.add('active');

  try {
    const snapshot = await db.collection('items').doc(itemId)
      .collection('stockHistory')
      .orderBy('createdAt', 'desc')
      .get();

    if (snapshot.empty) {
      list.innerHTML = '<p style="text-align:center;color:#aaa;">ยังไม่มีประวัติ</p>';
      return;
    }

    list.innerHTML = snapshot.docs.map(doc => {
      const h = doc.data();
      const date = h.createdAt ? h.createdAt.toDate().toLocaleString('th-TH') : '-';
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
          <div>
            <div style="font-weight:600;">${escapeHtml(h.addedBy)}</div>
            <div style="font-size:12px;color:#aaa;">${date}</div>
          </div>
          <div style="color:#4caf50;font-weight:600;font-size:16px;">+${h.qty}</div>
        </div>
      `;
    }).join('');

  } catch (e) {
    console.error(e);
    list.innerHTML = '<p style="text-align:center;color:#ff6b6b;">โหลดประวัติไม่ได้</p>';
  }
}

function closeStockHistory() {
  document.getElementById('stockHistoryModal').classList.remove('active');
}

// ============ IMAGE UPLOAD HELPERS ============
function fileToBase64(file, maxWidth) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // resize ถ้าใหญ่เกิน
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round(h * maxWidth / w);
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/webp', 0.8));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setupImageUploadArea(areaId, inputId, previewId, textId, onSelect) {
  const area = document.getElementById(areaId);
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const text = document.getElementById(textId);

  area.addEventListener('click', () => input.click());
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await fileToBase64(file, 300);
    preview.src = base64;
    preview.style.display = 'block';
    text.textContent = file.name;
    onSelect(base64);
  });

  // Drag & drop
  area.addEventListener('dragover', (e) => { e.preventDefault(); area.style.borderColor = '#ff69b4'; });
  area.addEventListener('dragleave', () => { area.style.borderColor = ''; });
  area.addEventListener('drop', async (e) => {
    e.preventDefault();
    area.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const base64 = await fileToBase64(file, 300);
      preview.src = base64;
      preview.style.display = 'block';
      text.textContent = file.name;
      onSelect(base64);
    }
  });
}

// ============ ADD PRODUCT ============
async function addProduct() {
  clearFieldErrors();
  const name = document.getElementById('pName').value.trim();
  const price = parseInt(document.getElementById('pPrice').value);
  const stock = parseInt(document.getElementById('pStock').value);
  const addedBy = document.getElementById('pAddedBy').value.trim();

  let hasError = false;
  if (!name) { showFieldError('pNameError', 'กรุณากรอกชื่อสินค้า'); hasError = true; }
  if (!price || price <= 0) { showFieldError('pPriceError', 'กรุณากรอกราคา'); hasError = true; }
  if (isNaN(stock) || stock < 0) { showFieldError('pStockError', 'กรุณากรอกจำนวน stock'); hasError = true; }
  if (!addImageBase64) { showFieldError('pImageError', 'กรุณาเลือกรูปสินค้า'); hasError = true; }
  if (!addedBy) { showFieldError('pAddedByError', 'กรุณากรอกชื่อคนเพิ่ม'); hasError = true; }
  if (hasError) return;

  const btn = document.getElementById('addProductBtn');
  btn.disabled = true;
  btn.textContent = 'กำลังเพิ่ม...';

  try {
    const docRef = await db.collection('items').add({
      name,
      price,
      stock,
      image: addImageBase64,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // บันทึกประวัติ stock ครั้งแรก
    if (stock > 0) {
      await docRef.collection('stockHistory').add({
        qty: stock,
        addedBy: addedBy,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    closeAddProductModal();
    loadProducts();
  } catch (e) {
    showAlert('เพิ่มสินค้าไม่ได้: ' + e.message, 'ผิดพลาด');
  } finally {
    btn.disabled = false;
    btn.textContent = 'เพิ่มสินค้า';
  }
}

// ============ ADD PRODUCT MODAL ============
function openAddProductModal() {
  clearFieldErrors();
  addImageBase64 = null;
  document.getElementById('pName').value = '';
  document.getElementById('pPrice').value = '';
  document.getElementById('pStock').value = '';
  document.getElementById('pImage').value = '';
  document.getElementById('pAddedBy').value = '';
  document.getElementById('addImagePreview').style.display = 'none';
  document.getElementById('addImageUploadText').textContent = 'คลิกเพื่อเลือกรูป';
  document.getElementById('addProductModal').classList.add('active');
}

function closeAddProductModal() {
  document.getElementById('addProductModal').classList.remove('active');
}

// ============ EDIT PRODUCT MODAL ============
let editingProductId = null;
let editOriginalImage = null;

function openEditProductModal(itemId, name, price, currentImage) {
  editingProductId = itemId;
  editOriginalImage = currentImage;
  editImageBase64 = null;
  clearFieldErrors();
  document.getElementById('editName').value = name;
  document.getElementById('editPrice').value = price;
  document.getElementById('editImage').value = '';

  const preview = document.getElementById('editImagePreview');
  if (currentImage) {
    preview.src = currentImage;
    preview.style.display = 'block';
    document.getElementById('editImageUploadText').textContent = 'คลิกเพื่อเปลี่ยนรูป';
  } else {
    preview.style.display = 'none';
    document.getElementById('editImageUploadText').textContent = 'คลิกเพื่อเลือกรูป';
  }

  document.getElementById('editProductModal').classList.add('active');
}

function closeEditProductModal() {
  document.getElementById('editProductModal').classList.remove('active');
  editingProductId = null;
}

async function confirmEditProduct() {
  clearFieldErrors();
  const name = document.getElementById('editName').value.trim();
  const price = parseInt(document.getElementById('editPrice').value);

  let hasError = false;
  if (!name) { showFieldError('editNameError', 'กรุณากรอกชื่อสินค้า'); hasError = true; }
  if (!price || price <= 0) { showFieldError('editPriceError', 'กรุณากรอกราคา'); hasError = true; }
  if (!editImageBase64 && !editOriginalImage) { showFieldError('editImageError', 'กรุณาเลือกรูปสินค้า'); hasError = true; }
  if (hasError) return;

  const btn = document.getElementById('confirmEditProduct');
  btn.disabled = true;
  btn.textContent = 'กำลังบันทึก...';

  try {
    const updateData = { name, price };
    if (editImageBase64) {
      updateData.image = editImageBase64;
    }

    await db.collection('items').doc(editingProductId).update(updateData);

    closeEditProductModal();
    loadProducts();
  } catch (e) {
    showAlert('แก้ไขไม่ได้: ' + e.message, 'ผิดพลาด');
  } finally {
    btn.disabled = false;
    btn.textContent = 'บันทึก';
  }
}

// ============ DELETE PRODUCT ============
async function deleteProduct(itemId) {
  const yes = await showConfirm('ต้องการลบสินค้านี้?', 'ยืนยันการลบ');
  if (!yes) return;

  try {
    await db.collection('items').doc(itemId).delete();
    loadProducts();
  } catch (e) {
    showAlert('ลบไม่ได้: ' + e.message, 'ผิดพลาด');
  }
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  setupPassword();
  setupTabs();

  // Image upload areas
  setupImageUploadArea('addImageUploadArea', 'pImage', 'addImagePreview', 'addImageUploadText', (b64) => { addImageBase64 = b64; });
  setupImageUploadArea('editImageUploadArea', 'editImage', 'editImagePreview', 'editImageUploadText', (b64) => { editImageBase64 = b64; });

  document.getElementById('addProductBtn').addEventListener('click', addProduct);
  document.getElementById('openAddProductBtn').addEventListener('click', openAddProductModal);
  document.getElementById('cancelAddProduct').addEventListener('click', closeAddProductModal);

  document.getElementById('confirmAddStock').addEventListener('click', confirmAddStock);
  document.getElementById('cancelAddStock').addEventListener('click', closeAddStockModal);
  document.getElementById('closeStockHistory').addEventListener('click', closeStockHistory);

  document.getElementById('confirmEditProduct').addEventListener('click', confirmEditProduct);
  document.getElementById('cancelEditProduct').addEventListener('click', closeEditProductModal);

  // Event delegation สำหรับปุ่มในตารางสินค้า
  document.getElementById('productTableBody').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id, name, price, image } = btn.dataset;
    if (action === 'addStock') openAddStockModal(id, name);
    else if (action === 'stockHistory') openStockHistory(id, name);
    else if (action === 'edit') openEditProductModal(id, name, Number(price), image);
    else if (action === 'delete') deleteProduct(id);
  });

  // ปิด modal เมื่อกดพื้นหลัง
  ['addProductModal', 'addStockModal', 'stockHistoryModal', 'editProductModal'].forEach(id => {
    document.getElementById(id).addEventListener('click', (e) => {
      if (e.target.id === id) {
        document.getElementById(id).classList.remove('active');
      }
    });
  });
});
