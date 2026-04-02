// ============ ITEM MODAL ============
function openItemModal(itemId) {
  currentItem = items.find((i) => i.id === itemId);
  if (!currentItem) return;

  const available = typeof getAvailableStock === 'function' ? getAvailableStock(currentItem) : (Number(currentItem.stock) || 0);
  const inCart = cart[itemId] ? cart[itemId].qty : 0;
  const canAdd = available - inCart;
  const reserved = typeof getReservedQty === 'function' ? getReservedQty(itemId) : 0;

  if (canAdd <= 0) {
    showAlert(available <= 0 ? "สินค้าหมดแล้ว" : "สินค้านี้เลือกครบจำนวน stock แล้ว");
    return;
  }

  currentQty = 1;
  document.getElementById("modalItemImg").src = currentItem.image;
  document.getElementById("modalItemName").textContent = currentItem.name;
  document.getElementById("modalItemPriceUnit").innerHTML =
    isPromoValid(currentItem)
      ? `<div class="promo-countdown" data-expires="${currentItem.promoExpiresAt ? currentItem.promoExpiresAt.toMillis() : ''}"></div>
         <span class="original-price">ชิ้นละ ${formatPrice(currentItem.price)} บาท</span> <span class="promo-price">ชิ้นละ ${formatPrice(currentItem.promoPrice)} บาท</span>`
      : `ชิ้นละ ${formatPrice(currentItem.price)} บาท`;
  document.getElementById("modalStockInfo").textContent =
    `เหลือ ${canAdd} ชิ้น` + (reserved > 0 ? ` (${reserved} ถูกจองโดยคนอื่น)` : '');
  updateQtyDisplay(canAdd);
  document.getElementById("itemModal").classList.add("active");
}

function updateQtyDisplay(maxQty) {
  const qtyInput = document.getElementById("qtyDisplay");
  qtyInput.value = currentQty;
  qtyInput.max = maxQty;
  document.getElementById("modalTotalPrice").textContent =
    `${formatPrice(currentQty * getPrice(currentItem))} บาท`;
  document.getElementById("qtyMinus").disabled = currentQty <= 1;
  document.getElementById("qtyPlus").disabled = currentQty >= maxQty;
}

function closeItemModal() {
  document.getElementById("itemModal").classList.remove("active");
  currentItem = null;
}

// ============ CART ============
function addToCart() {
  if (!currentItem) return;
  if (!shopOpen) { showAlert('ร้านปิดอยู่ ยังไม่สามารถสั่งซื้อได้', 'ร้านปิด'); return; }

  if (cart[currentItem.id]) {
    cart[currentItem.id].qty += currentQty;
  } else {
    cart[currentItem.id] = {
      item: { ...currentItem },
      qty: currentQty,
    };
  }

  closeItemModal();
  renderCart();
  if (typeof syncReservation === 'function') syncReservation();
}

function changeCartQty(itemId, delta) {
  if (!cart[itemId]) return;
  const available = typeof getAvailableStock === 'function' ? getAvailableStock(cart[itemId].item) : cart[itemId].item.stock;
  const newQty = cart[itemId].qty + delta;
  if (newQty <= 0) {
    delete cart[itemId];
  } else if (newQty > available) {
    return;
  } else {
    cart[itemId].qty = newQty;
  }
  renderCart();
  if (typeof syncReservation === 'function') syncReservation();
}

function removeFromCart(itemId) {
  delete cart[itemId];
  renderCart();
  if (typeof syncReservation === 'function') syncReservation();
}

function renderCart() {
  const cartList = document.getElementById("cartList");
  const cartTotal = document.getElementById("cartTotal");
  const cartTotalPrice = document.getElementById("cartTotalPrice");
  const summaryBtn = document.getElementById("summaryBtn");
  const entries = Object.entries(cart);

  if (entries.length === 0) {
    cartList.innerHTML = '<div class="cart-empty">ยังไม่ได้เลือกสินค้า</div>';
    cartTotal.style.display = "none";
    summaryBtn.disabled = true;
    return;
  }

  let total = 0;
  cartList.innerHTML = entries
    .map(([id, { item, qty }]) => {
      const unitPrice = getPrice(item);
      const subtotal = unitPrice * qty;
      total += subtotal;
      const available = typeof getAvailableStock === 'function' ? getAvailableStock(item) : (Number(item.stock) || 0);
      const notEnough = qty > available;
      const stockWarn = available <= 0 ? ' cart-item-out' : notEnough ? ' cart-item-low' : available <= 5 ? ' cart-item-low' : '';
      return `
      <div class="cart-item${stockWarn}">
        <div class="cart-item-top">
          <span class="cart-item-name">${escapeHtml(item.name)}</span>
          <span class="cart-item-price">${formatPrice(subtotal)}฿</span>
        </div>
        <div class="cart-item-stock">เหลือ ${available} ชิ้น${available <= 0 ? ' — สินค้าหมดแล้ว!' : notEnough ? ' — ไม่พอ!' : ''}</div>
        <div class="cart-item-bottom">
          <div class="cart-item-controls">
            <button class="cart-qty-btn" data-cart-action="minus" data-cart-id="${id}" ${qty <= 1 ? "disabled" : ""} aria-label="ลดจำนวน">-</button>
            <span class="cart-item-qty">${qty}</span>
            <button class="cart-qty-btn" data-cart-action="plus" data-cart-id="${id}" ${qty >= available ? "disabled" : ""} aria-label="เพิ่มจำนวน">+</button>
          </div>
          <span class="cart-item-unit">ชิ้นละ ${formatPrice(unitPrice)}฿</span>
          <button class="cart-item-remove" data-cart-action="remove" data-cart-id="${id}" aria-label="ลบสินค้า">&times;</button>
        </div>
      </div>
    `;
    })
    .join("");

  cartTotal.style.display = "block";
  cartTotalPrice.textContent = formatPrice(total);
  summaryBtn.disabled = false;
}
