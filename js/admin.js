// ============================================
// PEERAPONG SHOP - Admin Logic
// ============================================

const ADMIN_PASSWORD = 'peerapong';
let currentStockItemId = null;
let currentStockItemName = '';

// ============ PASSWORD CHECK ============
function setupPassword() {
  const modal = document.getElementById('passwordModal');
  const input = document.getElementById('passwordInput');
  const btn = document.getElementById('passwordSubmit');
  const error = document.getElementById('passwordError');

  function tryLogin() {
    if (input.value === ADMIN_PASSWORD) {
      modal.classList.remove('active');
      document.getElementById('adminContent').style.display = 'block';
      loadOrders();
      loadProducts();
    } else {
      error.style.display = 'block';
      input.value = '';
      input.focus();
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

// ============ LOAD ORDERS ============
async function loadOrders() {
  const board = document.getElementById('orderBoard');

  try {
    const snapshot = await db.collection('orders')
      .orderBy('createdAt', 'desc')
      .get();

    if (snapshot.empty) {
      board.innerHTML = '<p style="color:#aaa;text-align:center;">ยังไม่มี order</p>';
      return;
    }

    board.innerHTML = snapshot.docs.map(doc => {
      const order = doc.data();
      const date = order.createdAt ? order.createdAt.toDate().toLocaleString('th-TH') : '-';
      const itemsText = order.items.map(i => `${i.name} x${i.qty} = ${i.subtotal}฿`).join('<br>');
      const status = order.status || 'pending';

      return `
        <div class="admin-order-card">
          <div class="admin-order-header">
            <span style="font-weight:600;">FB: ${order.facebook}</span>
            <span style="font-size:13px;color:#aaa;">${date}</span>
          </div>
          <div class="admin-order-info">
            <div>ตัวละคร: <strong>${order.characterName}</strong></div>
            <div style="margin-top:8px;">${itemsText}</div>
            <div style="color:#ff69b4;font-weight:600;margin-top:8px;">รวม ${order.totalPrice} บาท</div>
          </div>
          <div class="admin-order-actions">
            <select onchange="updateOrderStatus('${doc.id}', this.value)">
              <option value="pending" ${status === 'pending' ? 'selected' : ''}>รอดำเนินการ</option>
              <option value="completed" ${status === 'completed' ? 'selected' : ''}>เสร็จแล้ว</option>
              <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>ยกเลิก</option>
            </select>
          </div>
        </div>
      `;
    }).join('');

  } catch (e) {
    console.error(e);
    board.innerHTML = '<p style="color:#ff6b6b;text-align:center;">โหลด order ไม่ได้</p>';
  }
}

// ============ UPDATE ORDER STATUS ============
async function updateOrderStatus(orderId, newStatus) {
  try {
    await db.collection('orders').doc(orderId).update({ status: newStatus });
  } catch (e) {
    alert('อัพเดทสถานะไม่ได้: ' + e.message);
  }
}

// ============ LOAD PRODUCTS ============
async function loadProducts() {
  const tbody = document.getElementById('productTableBody');

  try {
    const snapshot = await db.collection('items').orderBy('createdAt', 'asc').get();

    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#aaa;">ยังไม่มีสินค้า</td></tr>';
      return;
    }

    tbody.innerHTML = snapshot.docs.map(doc => {
      const item = doc.data();
      return `
        <tr>
          <td><img src="${item.image}" alt="${item.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22><rect fill=%22%23333%22 width=%2250%22 height=%2250%22/></svg>'"></td>
          <td>${item.name}</td>
          <td>${item.price} บาท</td>
          <td>
            <span style="font-weight:600;margin-right:8px;">${item.stock}</span>
            <button class="btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="openAddStockModal('${doc.id}', '${item.name.replace(/'/g, "\\'")}')">+ เพิ่ม</button>
            <button style="background:none;border:none;color:#aaa;cursor:pointer;font-size:16px;margin-left:4px;" onclick="openStockHistory('${doc.id}', '${item.name.replace(/'/g, "\\'")}')">&#128065;</button>
          </td>
          <td>
            <button class="btn-secondary" style="padding:4px 10px;font-size:12px;margin-right:6px;" onclick="openEditProductModal('${doc.id}', '${item.name.replace(/'/g, "\\'")}', ${item.price}, '${(item.image || '').replace('assets/', '').replace(/'/g, "\\'")}')">แก้ไข</button>
            <button class="btn-danger" onclick="deleteProduct('${doc.id}')">ลบ</button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (e) {
    console.error(e);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#ff6b6b;">โหลดสินค้าไม่ได้</td></tr>';
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
    // เพิ่ม stock
    await db.collection('items').doc(currentStockItemId).update({
      stock: firebase.firestore.FieldValue.increment(qty)
    });

    // บันทึกประวัติ
    await db.collection('items').doc(currentStockItemId)
      .collection('stockHistory').add({
        qty,
        addedBy,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

    closeAddStockModal();
    loadProducts();
  } catch (e) {
    alert('เพิ่ม stock ไม่ได้: ' + e.message);
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
            <div style="font-weight:600;">${h.addedBy}</div>
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

// ============ ADD PRODUCT ============
async function addProduct() {
  clearFieldErrors();
  const name = document.getElementById('pName').value.trim();
  const price = parseInt(document.getElementById('pPrice').value);
  const stock = parseInt(document.getElementById('pStock').value);
  const imageFile = document.getElementById('pImage').value.trim();

  let hasError = false;
  if (!name) { showFieldError('pNameError', 'กรุณากรอกชื่อสินค้า'); hasError = true; }
  if (!price || price <= 0) { showFieldError('pPriceError', 'กรุณากรอกราคา'); hasError = true; }
  if (isNaN(stock) || stock < 0) { showFieldError('pStockError', 'กรุณากรอกจำนวน stock'); hasError = true; }
  if (!imageFile) { showFieldError('pImageError', 'กรุณากรอกชื่อไฟล์รูป'); hasError = true; }
  if (hasError) return;

  const btn = document.getElementById('addProductBtn');
  btn.disabled = true;
  btn.textContent = 'กำลังเพิ่ม...';

  try {
    await db.collection('items').add({
      name,
      price,
      stock,
      image: `assets/${imageFile}`,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    closeAddProductModal();
    loadProducts();
  } catch (e) {
    alert('เพิ่มสินค้าไม่ได้: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'เพิ่มสินค้า';
  }
}

// ============ ADD PRODUCT MODAL ============
function openAddProductModal() {
  clearFieldErrors();
  document.getElementById('pName').value = '';
  document.getElementById('pPrice').value = '';
  document.getElementById('pStock').value = '';
  document.getElementById('pImage').value = '';
  document.getElementById('addProductModal').classList.add('active');
}

function closeAddProductModal() {
  document.getElementById('addProductModal').classList.remove('active');
}

// ============ EDIT PRODUCT MODAL ============
let editingProductId = null;

function openEditProductModal(itemId, name, price, imageFile) {
  editingProductId = itemId;
  clearFieldErrors();
  document.getElementById('editName').value = name;
  document.getElementById('editPrice').value = price;
  document.getElementById('editImage').value = imageFile;
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
  const imageFile = document.getElementById('editImage').value.trim();

  let hasError = false;
  if (!name) { showFieldError('editNameError', 'กรุณากรอกชื่อสินค้า'); hasError = true; }
  if (!price || price <= 0) { showFieldError('editPriceError', 'กรุณากรอกราคา'); hasError = true; }
  if (!imageFile) { showFieldError('editImageError', 'กรุณากรอกชื่อไฟล์รูป'); hasError = true; }
  if (hasError) return;

  const btn = document.getElementById('confirmEditProduct');
  btn.disabled = true;
  btn.textContent = 'กำลังบันทึก...';

  try {
    await db.collection('items').doc(editingProductId).update({
      name,
      price,
      image: `assets/${imageFile}`
    });

    closeEditProductModal();
    loadProducts();
  } catch (e) {
    alert('แก้ไขไม่ได้: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'บันทึก';
  }
}

// ============ DELETE PRODUCT ============
async function deleteProduct(itemId) {
  if (!confirm('ต้องการลบสินค้านี้?')) return;

  try {
    await db.collection('items').doc(itemId).delete();
    loadProducts();
  } catch (e) {
    alert('ลบไม่ได้: ' + e.message);
  }
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  setupPassword();
  setupTabs();

  document.getElementById('addProductBtn').addEventListener('click', addProduct);
  document.getElementById('openAddProductBtn').addEventListener('click', openAddProductModal);
  document.getElementById('cancelAddProduct').addEventListener('click', closeAddProductModal);

  document.getElementById('confirmAddStock').addEventListener('click', confirmAddStock);
  document.getElementById('cancelAddStock').addEventListener('click', closeAddStockModal);
  document.getElementById('closeStockHistory').addEventListener('click', closeStockHistory);

  document.getElementById('confirmEditProduct').addEventListener('click', confirmEditProduct);
  document.getElementById('cancelEditProduct').addEventListener('click', closeEditProductModal);

  // ปิด modal เมื่อกดพื้นหลัง
  ['addProductModal', 'addStockModal', 'stockHistoryModal', 'editProductModal'].forEach(id => {
    document.getElementById(id).addEventListener('click', (e) => {
      if (e.target.id === id) {
        document.getElementById(id).classList.remove('active');
      }
    });
  });
});
