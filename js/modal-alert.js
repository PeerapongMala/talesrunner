// ============================================
// Shared Utilities
// ============================================

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// ============================================
// Modal Alert & Confirm (แทน alert/confirm)
// ============================================

function showAlert(msg, title) {
  const overlay = document.getElementById('alertModal');
  document.getElementById('alertModalTitle').textContent = title || 'แจ้งเตือน';
  document.getElementById('alertModalMsg').textContent = msg;
  document.getElementById('alertModalButtons').innerHTML =
    '<button class="btn-primary" style="width:auto;margin:0 auto;padding:10px 40px;" onclick="closeAlertModal()">ตกลง</button>';
  overlay.classList.add('active');
}

function showConfirm(msg, title) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('alertModal');
    document.getElementById('alertModalTitle').textContent = title || 'ยืนยัน';
    document.getElementById('alertModalMsg').textContent = msg;
    document.getElementById('alertModalButtons').innerHTML =
      '<button class="btn-secondary" id="confirmNo">ยกเลิก</button>' +
      '<button class="btn-primary" id="confirmYes" style="width:auto;padding:10px 30px;">ยืนยัน</button>';
    overlay.classList.add('active');

    document.getElementById('confirmYes').onclick = () => { closeAlertModal(); resolve(true); };
    document.getElementById('confirmNo').onclick = () => { closeAlertModal(); resolve(false); };
  });
}

function closeAlertModal() {
  document.getElementById('alertModal').classList.remove('active');
}

// ============ Toast Notification ============
function showToast(msg, duration) {
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration || 4000);
}
