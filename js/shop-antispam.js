// ============================================================
// ANTI-SPAM LAYER 1: Gibberish pattern detection
// ============================================================

const KEYBOARD_PATTERNS = [
  'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
  '1234567890', 'qazwsxedc', 'poiuytrewq'
];

function hasThai(s) {
  return /[\u0E00-\u0E7F]/.test(s);
}

function hasVowel(s) {
  // สระอังกฤษ + y (ทำหน้าที่สระได้)
  return /[aeiouyAEIOUY]/.test(s);
}

function maxConsonantRun(s) {
  // นับเฉพาะ run ที่มีตัวอักษรต่างกัน ≥ 4 ตัว (กัน "nnnnnn" ถูกเหมาว่า random)
  const m = s.toLowerCase().match(/[bcdfghjklmnpqrstvwxz]+/g);
  if (!m) return 0;
  return Math.max(...m.map(x => new Set(x).size >= 4 ? x.length : 0));
}

function maxRepeatChar(s) {
  let max = 1, cur = 1;
  for (let i = 1; i < s.length; i++) {
    if (s[i].toLowerCase() === s[i - 1].toLowerCase()) cur++;
    else cur = 1;
    if (cur > max) max = cur;
  }
  return max;
}

function hasKeyboardRun(s, minLen) {
  const lower = s.toLowerCase();
  for (const pat of KEYBOARD_PATTERNS) {
    for (let i = 0; i + minLen <= pat.length; i++) {
      const sub = pat.substring(i, i + minLen);
      if (lower.includes(sub)) return true;
      const rev = sub.split('').reverse().join('');
      if (lower.includes(rev)) return true;
    }
  }
  return false;
}

// Map ของตัวอักษรที่อยู่ติดกันบน QWERTY keyboard (ทั้งซ้ายขวา-บนล่าง)
const KB_ADJACENT = {
  q:'wa',    w:'qesa',   e:'wrsd',   r:'etdf',   t:'ryfg',
  y:'tugh',  u:'yihj',   i:'uojk',   o:'ipkl',   p:'ol',
  a:'qwszx', s:'weadzxc',d:'erscxv', f:'rtdcvb', g:'tyfvbn',
  h:'yugbnm',j:'uihnm',  k:'iojm',   l:'opk',
  z:'asx',   x:'zsdc',   c:'xdvf',   v:'cfgb',   b:'vgnh',
  n:'bhmj',  m:'nj'
};

function keyboardAdjacencyRatio(s) {
  const lower = s.toLowerCase().replace(/[^a-z]/g, '');
  if (lower.length < 4) return 0;
  let adjacent = 0, total = 0;
  for (let i = 1; i < lower.length; i++) {
    const prev = lower[i - 1], curr = lower[i];
    if (prev === curr) continue; // ข้ามตัวซ้ำ
    total++;
    if (KB_ADJACENT[prev] && KB_ADJACENT[prev].includes(curr)) adjacent++;
  }
  return total === 0 ? 0 : adjacent / total;
}

function hasRepeatedChunk(s) {
  // ตรวจ pattern ซ้ำ 3 รอบ เช่น abcabcabc (เริ่มที่ n=3 ไม่จับ "nn"/"bu" ที่เป็นชื่อจริง)
  const lower = s.toLowerCase().replace(/\s+/g, '');
  for (let n = 3; n <= 4; n++) {
    for (let i = 0; i + n * 3 <= lower.length; i++) {
      const chunk = lower.substring(i, i + n);
      if (lower.substring(i + n, i + 2 * n) === chunk &&
          lower.substring(i + 2 * n, i + 3 * n) === chunk) {
        return true;
      }
    }
  }
  return false;
}

function hasPureRepeat(s) {
  // ตรวจ chunk 2-5 ตัวซ้ำ 2 รอบติดกัน โดยส่วนที่ซ้ำต้อง cover ≥ 80% ของข้อความ
  // จับ "asdasd" (100%), "abcabc" (100%) แต่ไม่จับ "tonnamnamtip" (namnam = 50%)
  const lower = s.toLowerCase().replace(/[^a-z]/g, '');
  if (lower.length < 6) return false;
  for (let n = 2; n <= 5; n++) {
    for (let i = 0; i + n * 2 <= lower.length; i++) {
      const chunk = lower.substring(i, i + n);
      if (lower.substring(i + n, i + 2 * n) === chunk) {
        if ((2 * n) / lower.length >= 0.8) return true;
      }
    }
  }
  return false;
}

function charDiversityLow(s) {
  // ใช้ตัวอักษรต่างกันน้อยเกินไปเมื่อเทียบกับความยาว = มั่ว
  //   length ≥ 8  + unique ≤ 2   เช่น "yoyoyoyo" (y,o) แต่ "Bububuu" ที่ 7 ตัวยังผ่าน
  //   length ≥ 9  + unique ≤ 3   เช่น "asddsadas" (a,s,d)
  //   length ≥ 12 + unique ≤ 4   เช่น "dasdasdsadd" (d,a,s)
  //   length ≥ 15 + unique ≤ 5   เช่น "asdfoasdfasfsafsafsa"
  const letters = s.toLowerCase().replace(/[^a-z]/g, '');
  if (letters.length < 8) return false;
  const uniq = new Set(letters).size;
  if (uniq <= 2) return true;
  if (letters.length >= 9 && uniq <= 3) return true;
  if (letters.length >= 12 && uniq <= 4) return true;
  if (letters.length >= 15 && uniq <= 5) return true;
  return false;
}

// Return true ถ้าข้อความดู "พิมพ์มั่ว"
// กฎเซฟ: ชื่อไทย / ชื่อสั้น <5 ตัว ถือว่าไม่มั่วเสมอ
function looksLikeGibberish(text) {
  if (!text) return false;
  const t = text.trim();

  if (hasThai(t)) return false;         // ชื่อไทย ผ่าน
  if (t.length < 5) return false;       // "Bob", "Kim" ผ่าน

  // อักขระพิเศษที่ไม่พบในชื่อจริง (@, #, $, %, ^, &, *, + ฯลฯ) = มั่ว
  if (/[@#$%^&*+={}<>\/\\|~`]/.test(t)) return true;

  const letters = t.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 5) return false; // ชื่อที่มีอักษรน้อย (เบอร์เยอะ) ผ่าน

  if (letters.length >= 7 && !hasVowel(letters)) return true;  // ยาว 7+ ไม่มีสระ
  if (maxConsonantRun(letters) >= 7) return true;   // consonant run 7+ (unique ≥ 4)
  if (maxRepeatChar(letters) >= 7) return true;     // ตัวเดียวซ้ำ 7+
  if (hasKeyboardRun(letters, 5)) return true;      // keyboard row 5+
  if (hasRepeatedChunk(letters)) return true;       // chunk ซ้ำ 3 รอบ
  if (charDiversityLow(letters)) return true;       // ตัวอักษรต่างกันน้อย

  // Keyboard mashing: คู่ตัวอักษรติดกันบน keyboard ≥ 50% = น่าจะกดมั่ว
  // ใช้ตั้งแต่ length ≥ 10 เพื่อไม่กระทบชื่อไทยสั้นๆ ที่มี "sa","wa" (home row)
  // จับ "peeasdaszcxzesazdx" (62%), "dasdsafeasd" (60%)
  if (letters.length >= 10 && keyboardAdjacencyRatio(t) >= 0.50) return true;

  return false;
}

// ============================================================
// ANTI-SPAM LAYER 2: Device fingerprint rate limit (Firestore)
// ============================================================

const FP_COOLDOWN_MS = 30 * 1000;      // 30s ระหว่างออเดอร์ต่อเครื่อง
const FP_HOURLY_LIMIT = 5;             // สูงสุด 5 ออเดอร์ / ชม / เครื่อง
const FP_HOURLY_WINDOW_MS = 60 * 60 * 1000;

async function _sha256Hex(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

let _fingerprintCache = null;
async function getFingerprint() {
  if (_fingerprintCache) return _fingerprintCache;
  const parts = [
    navigator.userAgent || '',
    `${screen.width}x${screen.height}`,
    screen.colorDepth || 0,
    navigator.language || '',
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    navigator.platform || '',
  ].join('|');
  _fingerprintCache = (await _sha256Hex(parts)).substring(0, 32);
  return _fingerprintCache;
}

// ตรวจว่าเครื่องนี้ถูก rate-limit อยู่หรือไม่
// return { blocked, reason }
async function checkFingerprintLimit() {
  try {
    const fp = await getFingerprint();
    const doc = await db.collection('rate_limits').doc(fp).get();
    if (!doc.exists) return { blocked: false };

    const data = doc.data();
    const now = Date.now();
    const lastMs = data.last && typeof data.last.toMillis === 'function'
      ? data.last.toMillis()
      : 0;
    const count = data.count || 0;

    const since = now - lastMs;
    if (since < FP_COOLDOWN_MS) {
      const sec = Math.ceil((FP_COOLDOWN_MS - since) / 1000);
      return { blocked: true, reason: `กรุณารอ ${sec} วินาที ก่อนสั่งซื้อครั้งถัดไป` };
    }

    if (since < FP_HOURLY_WINDOW_MS && count >= FP_HOURLY_LIMIT) {
      return { blocked: true, reason: 'สั่งซื้อเกินจำนวนที่อนุญาตในชั่วโมงนี้ กรุณาลองใหม่ภายหลัง' };
    }

    return { blocked: false };
  } catch (e) {
    console.warn('fingerprint check failed:', e.message);
    return { blocked: false }; // fail-open: ไม่ block ถ้า Firestore อ่านไม่ได้
  }
}

// บันทึกว่าเพิ่งสั่งซื้อสำเร็จ (เพิ่ม count + อัปเดต last)
async function recordFingerprintOrder() {
  try {
    const fp = await getFingerprint();
    const ref = db.collection('rate_limits').doc(fp);
    const doc = await ref.get();
    const now = Date.now();
    const lastMs = doc.exists && doc.data().last && typeof doc.data().last.toMillis === 'function'
      ? doc.data().last.toMillis()
      : 0;
    const prevCount = doc.exists ? (doc.data().count || 0) : 0;
    // รีเซ็ต count ถ้าเกิน 1 ชม
    const newCount = (now - lastMs > FP_HOURLY_WINDOW_MS) ? 1 : prevCount + 1;

    await ref.set({
      last: firebase.firestore.FieldValue.serverTimestamp(),
      count: newCount,
    });
  } catch (e) {
    console.warn('fingerprint record failed:', e.message);
  }
}
