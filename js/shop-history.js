// ============ ORDER HISTORY ============
let currentHistoryLimit = 50;
let lastSearchedFb = "";

async function searchHistory(isLoadMore = false) {
  const fb = document.getElementById("historyFbInput").value.trim();
  if (!fb) {
    showAlert("กรุณากรอก Facebook");
    return;
  }

  if (!isLoadMore || fb !== lastSearchedFb) {
    currentHistoryLimit = 50;
    lastSearchedFb = fb;
  } else {
    currentHistoryLimit += 50;
  }

  const historyList = document.getElementById("historyList");
  if (!isLoadMore) historyList.innerHTML = '<p style="text-align:center;color:#aaa;">กำลังค้นหา...</p>';

  try {
    const snapshot = await db
      .collection("orders")
      .where("facebook", "==", fb)
      .orderBy("createdAt", "desc")
      .limit(currentHistoryLimit)
      .get();

    const loadMoreBtn = document.getElementById('loadMoreHistoryBtn');
    if (loadMoreBtn) {
      loadMoreBtn.style.display = snapshot.docs.length >= currentHistoryLimit ? 'inline-block' : 'none';
    }

    if (snapshot.empty) {
      historyList.innerHTML = '<p style="text-align:center;color:#aaa;">ไม่พบประวัติการสั่ง</p>';
      return;
    }

    historyList.innerHTML = snapshot.docs
      .map((doc) => {
        const order = doc.data();
        const date = order.createdAt
          ? order.createdAt.toDate().toLocaleString("th-TH")
          : "-";
        const statusMap = {
          pending: "รอดำเนินการ",
          completed: "เสร็จแล้ว",
          cancelled: "ยกเลิก",
        };
        const validStatuses = ["pending", "completed", "cancelled"];
        const statusClass = validStatuses.includes(order.status)
          ? order.status
          : "pending";
        const statusText = statusMap[order.status] || escapeHtml(order.status);

        const items = Array.isArray(order.items) ? order.items : [];
        const itemsText = items
          .map((i) => `${escapeHtml(i.name)} x${i.qty}`)
          .join(", ");

        const cancelBtn = order.status === 'pending'
          ? `<button class="btn-cancel-order" data-order-id="${doc.id}">ยกเลิก</button>`
          : '';

        return `
        <div class="order-card">
          <div class="order-card-header">
            <span class="order-date">${date}</span>
            <span class="order-status ${statusClass}">${statusText}</span>
          </div>
          <div class="order-card-char">ชื่อตัวละคร: <strong>${escapeHtml(order.characterName || '-')}</strong></div>
          <div class="order-card-items">${itemsText}</div>
          <div class="order-card-footer">
            <span class="order-card-total">รวม ${formatPrice(order.totalPrice)} บาท</span>
            ${cancelBtn}
          </div>
        </div>
      `;
      })
      .join("");
  } catch (e) {
    console.error(e);
    historyList.innerHTML =
      '<p style="text-align:center;color:#ff6b6b;">เกิดข้อผิดพลาด</p>';
  }
}

// ============ CANCEL ORDER (ลูกค้ายกเลิกเอง) ============
async function cancelOrder(orderId) {
  const yes = await showConfirm('ต้องการยกเลิก order นี้?', 'ยืนยันยกเลิก');
  if (!yes) return;

  try {
    await db.runTransaction(async (transaction) => {
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) throw new Error('ไม่พบ order');

      const order = orderDoc.data();
      if (order.status !== 'pending') throw new Error('order นี้ไม่สามารถยกเลิกได้');

      // อ่าน item ทั้งหมดก่อน
      const orderItems = Array.isArray(order.items) ? order.items : [];
      const itemRefs = [];
      const itemDocs = [];
      for (const item of orderItems) {
        if (item.itemId) {
          const ref = db.collection('items').doc(item.itemId);
          itemRefs.push({ ref, qty: item.qty });
          itemDocs.push(await transaction.get(ref));
        }
      }

      // คืน stock (ไม่เขียน stockHistory เพราะ rules บังคับ isAdmin)
      for (let i = 0; i < itemRefs.length; i++) {
        if (itemDocs[i].exists) {
          transaction.update(itemRefs[i].ref, {
            stock: firebase.firestore.FieldValue.increment(itemRefs[i].qty)
          });
        }
      }

      // คืนยอดใช้คูปอง
      if (order.couponCode) {
        transaction.update(db.collection('coupons').doc(order.couponCode), {
          usedCount: firebase.firestore.FieldValue.increment(-1)
        });
      }

      // เปลี่ยนสถานะ
      transaction.update(orderRef, { status: 'cancelled' });
    });

    // รีเซ็ต cooldown
    localStorage.removeItem('lastOrderTime');

    showAlert('ยกเลิก order สำเร็จ สามารถสั่งใหม่ได้เลย', 'สำเร็จ');
    searchHistory(); // reload history
  } catch (e) {
    showAlert('ยกเลิกไม่ได้: ' + e.message, 'ผิดพลาด');
  }
}


