// ============================================
// PEERAPONG SHOP - Frontend Logic
// ============================================

// State
let items = [];
let cart = {};        // { itemId: { item, qty } }
let currentItem = null;
let currentQty = 1;

// ============ LOAD ITEMS ============
async function loadItems() {
  try {
    const snapshot = await db.collection('items').orderBy('createdAt', 'asc').get();
    items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderItems();
  } catch (e) {
    console.error('โหลดสินค้าไม่ได้:', e);
    document.getElementById('itemGrid').innerHTML =
      '<p style="color:#ff6b6b;grid-column:1/-1;text-align:center;">ไม่สามารถโหลดสินค้าได้ กรุณาลองใหม่</p>';
  }
}

// ============ RENDER ITEMS ============
function renderItems() {
  const grid = document.getElementById('itemGrid');
  const totalEl = document.getElementById('totalItems');
  totalEl.textContent = `TOTAL ${items.length} ITEMS`;

  if (items.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#aaa;">ยังไม่มีสินค้า</p>';
    return;
  }

  grid.innerHTML = items.map(item => {
    const outOfStock = item.stock <= 0;
    return `
      <div class="item-card ${outOfStock ? 'out-of-stock' : ''}"
           data-id="${item.id}" ${outOfStock ? '' : `onclick="openItemModal('${item.id}')"`}>
        <div class="stock-badge">x${item.stock}</div>
        <img src="${item.image}" alt="${item.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect fill=%22%23333%22 width=%22100%22 height=%22100%22/><text fill=%22%23999%22 x=%2250%22 y=%2255%22 text-anchor=%22middle%22 font-size=%2212%22>No Image</text></svg>'">
        <div class="item-name">${item.name}</div>
        <div class="item-price">ชิ้นละ ${item.price} บาท</div>
      </div>
    `;
  }).join('');
}

// ============ ITEM MODAL ============
function openItemModal(itemId) {
  currentItem = items.find(i => i.id === itemId);
  if (!currentItem || currentItem.stock <= 0) return;

  // ดูว่าในตะกร้ามีอยู่แล้วกี่ชิ้น
  const inCart = cart[itemId] ? cart[itemId].qty : 0;
  const available = currentItem.stock - inCart;

  if (available <= 0) {
    alert('สินค้านี้เลือกครบจำนวน stock แล้ว');
    return;
  }

  currentQty = 1;
  document.getElementById('modalItemImg').src = currentItem.image;
  document.getElementById('modalItemName').textContent = currentItem.name;
  document.getElementById('modalItemPriceUnit').textContent = `ชิ้นละ ${currentItem.price} บาท`;
  document.getElementById('modalStockInfo').textContent = `เหลือ ${available} ชิ้น`;
  updateQtyDisplay(available);
  document.getElementById('itemModal').classList.add('active');
}

function updateQtyDisplay(maxQty) {
  document.getElementById('qtyDisplay').textContent = currentQty;
  document.getElementById('modalTotalPrice').textContent =
    `${currentQty * currentItem.price} บาท`;
  document.getElementById('qtyMinus').disabled = currentQty <= 1;
  document.getElementById('qtyPlus').disabled = currentQty >= maxQty;
}

function closeItemModal() {
  document.getElementById('itemModal').classList.remove('active');
  currentItem = null;
}

// ============ CART ============
function addToCart() {
  if (!currentItem) return;

  if (cart[currentItem.id]) {
    cart[currentItem.id].qty += currentQty;
  } else {
    cart[currentItem.id] = {
      item: { ...currentItem },
      qty: currentQty
    };
  }

  closeItemModal();
  renderCart();
}

function removeFromCart(itemId) {
  delete cart[itemId];
  renderCart();
}

function renderCart() {
  const cartList = document.getElementById('cartList');
  const cartTotal = document.getElementById('cartTotal');
  const cartTotalPrice = document.getElementById('cartTotalPrice');
  const summaryBtn = document.getElementById('summaryBtn');
  const entries = Object.entries(cart);

  if (entries.length === 0) {
    cartList.innerHTML = '<div class="cart-empty">ยังไม่ได้เลือกสินค้า</div>';
    cartTotal.style.display = 'none';
    summaryBtn.disabled = true;
    return;
  }

  let total = 0;
  cartList.innerHTML = entries.map(([id, { item, qty }]) => {
    const subtotal = item.price * qty;
    total += subtotal;
    return `
      <div class="cart-item">
        <span class="cart-item-name">${item.name}</span>
        <span class="cart-item-qty">x${qty}</span>
        <span class="cart-item-price">${subtotal}฿</span>
        <button class="cart-item-remove" onclick="removeFromCart('${id}')">&times;</button>
      </div>
    `;
  }).join('');

  cartTotal.style.display = 'block';
  cartTotalPrice.textContent = total;
  summaryBtn.disabled = false;
}

// ============ SUMMARY MODAL ============
function openSummaryModal() {
  const entries = Object.entries(cart);
  if (entries.length === 0) return;

  let total = 0;
  const summaryList = document.getElementById('summaryList');
  summaryList.innerHTML = entries.map(([id, { item, qty }]) => {
    const subtotal = item.price * qty;
    total += subtotal;
    return `
      <div class="summary-item">
        <span>${item.name} x${qty}</span>
        <span>${subtotal} บาท</span>
      </div>
    `;
  }).join('');

  document.getElementById('summaryTotalPrice').textContent = `${total} บาท`;
  document.getElementById('inputFb').value = '';
  document.getElementById('inputCharName').value = '';
  document.getElementById('summaryModal').classList.add('active');
}

function closeSummaryModal() {
  document.getElementById('summaryModal').classList.remove('active');
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

// ============ SUBMIT ORDER ============
async function submitOrder() {
  clearFieldErrors();
  const fb = document.getElementById('inputFb').value.trim();
  const charName = document.getElementById('inputCharName').value.trim();

  let hasError = false;
  if (!fb) { showFieldError('inputFbError', 'กรุณากรอก Facebook'); hasError = true; }
  if (!charName) { showFieldError('inputCharNameError', 'กรุณากรอกชื่อตัวละคร'); hasError = true; }
  if (hasError) return;

  const entries = Object.entries(cart);
  let totalPrice = 0;
  const orderItems = entries.map(([id, { item, qty }]) => {
    const subtotal = item.price * qty;
    totalPrice += subtotal;
    return { itemId: id, name: item.name, price: item.price, qty, subtotal };
  });

  // ปิดปุ่มกันกดซ้ำ
  const confirmBtn = document.getElementById('summaryConfirm');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'กำลังส่ง...';

  try {
    // ใช้ transaction หัก stock
    await db.runTransaction(async (transaction) => {
      // อ่าน stock ทุกไอเทม
      const itemRefs = orderItems.map(oi => db.collection('items').doc(oi.itemId));
      const itemDocs = await Promise.all(itemRefs.map(ref => transaction.get(ref)));

      // ตรวจสอบ stock
      for (let i = 0; i < itemDocs.length; i++) {
        const doc = itemDocs[i];
        if (!doc.exists) throw new Error(`ไม่พบสินค้า ${orderItems[i].name}`);
        const currentStock = doc.data().stock;
        if (currentStock < orderItems[i].qty) {
          throw new Error(`${orderItems[i].name} เหลือแค่ ${currentStock} ชิ้น`);
        }
      }

      // หัก stock
      for (let i = 0; i < itemDocs.length; i++) {
        transaction.update(itemRefs[i], {
          stock: firebase.firestore.FieldValue.increment(-orderItems[i].qty)
        });
      }

      // สร้าง order
      const orderRef = db.collection('orders').doc();
      transaction.set(orderRef, {
        facebook: fb,
        characterName: charName,
        items: orderItems,
        totalPrice,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    // สำเร็จ
    closeSummaryModal();
    cart = {};
    renderCart();
    loadItems(); // reload stock
    document.getElementById('successModal').classList.add('active');

  } catch (e) {
    alert('เกิดข้อผิดพลาด: ' + e.message);
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'ยืนยันสั่งซื้อ';
  }
}

// ============ ORDER HISTORY ============
async function searchHistory() {
  const fb = document.getElementById('historyFbInput').value.trim();
  if (!fb) {
    alert('กรุณากรอก Facebook');
    return;
  }

  const historyList = document.getElementById('historyList');
  historyList.innerHTML = '<p style="text-align:center;color:#aaa;">กำลังค้นหา...</p>';

  try {
    const snapshot = await db.collection('orders')
      .where('facebook', '==', fb)
      .orderBy('createdAt', 'desc')
      .get();

    if (snapshot.empty) {
      historyList.innerHTML = '<p style="text-align:center;color:#aaa;">ไม่พบประวัติการสั่ง</p>';
      return;
    }

    historyList.innerHTML = snapshot.docs.map(doc => {
      const order = doc.data();
      const date = order.createdAt ? order.createdAt.toDate().toLocaleString('th-TH') : '-';
      const statusMap = {
        pending: 'รอดำเนินการ',
        completed: 'เสร็จแล้ว',
        cancelled: 'ยกเลิก'
      };
      const statusClass = order.status || 'pending';
      const statusText = statusMap[order.status] || order.status;

      const itemsText = order.items.map(i => `${i.name} x${i.qty}`).join(', ');

      return `
        <div class="order-card">
          <div class="order-card-header">
            <span class="order-date">${date}</span>
            <span class="order-status ${statusClass}">${statusText}</span>
          </div>
          <div class="order-card-items">${itemsText}</div>
          <div class="order-card-total">รวม ${order.totalPrice} บาท</div>
        </div>
      `;
    }).join('');

  } catch (e) {
    console.error(e);
    historyList.innerHTML = '<p style="text-align:center;color:#ff6b6b;">เกิดข้อผิดพลาด</p>';
  }
}

// ============ TAB SWITCHING ============
function setupTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.dataset.tab;
      document.getElementById('shopSection').style.display = target === 'shop' ? 'block' : 'none';
      document.getElementById('historySection').classList.toggle('active', target === 'history');
      document.getElementById('sidePanel').style.display = target === 'shop' ? 'block' : 'none';
    });
  });
}

// ============ EVENT LISTENERS ============
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  loadItems();

  // Item modal
  document.getElementById('qtyMinus').addEventListener('click', () => {
    if (currentQty > 1) {
      currentQty--;
      const inCart = cart[currentItem.id] ? cart[currentItem.id].qty : 0;
      updateQtyDisplay(currentItem.stock - inCart);
    }
  });

  document.getElementById('qtyPlus').addEventListener('click', () => {
    const inCart = cart[currentItem.id] ? cart[currentItem.id].qty : 0;
    const maxQty = currentItem.stock - inCart;
    if (currentQty < maxQty) {
      currentQty++;
      updateQtyDisplay(maxQty);
    }
  });

  document.getElementById('modalConfirm').addEventListener('click', addToCart);
  document.getElementById('modalCancel').addEventListener('click', closeItemModal);

  // Summary modal
  document.getElementById('summaryBtn').addEventListener('click', openSummaryModal);
  document.getElementById('summaryCancel').addEventListener('click', closeSummaryModal);
  document.getElementById('summaryConfirm').addEventListener('click', submitOrder);

  // Success modal
  document.getElementById('successClose').addEventListener('click', () => {
    document.getElementById('successModal').classList.remove('active');
  });

  // History
  document.getElementById('historySearchBtn').addEventListener('click', searchHistory);
  document.getElementById('historyFbInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchHistory();
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });
});
