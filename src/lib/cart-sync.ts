// منطق مزامنة السلة (دوال نقية بلا اعتماد على المتصفح عدا علم «بانتظار التأكيد»)
export type Cart = Record<string, number>;

export const normalizeCart = (c: Cart): Cart => {
  const out: Cart = {};
  for (const [id, q] of Object.entries(c)) {
    const n = Math.floor(Number(q));
    if (n > 0) out[id] = n;
  }
  return out;
};

export const sameCart = (a: Cart, b: Cart) => {
  const x = normalizeCart(a);
  const y = normalizeCart(b);
  const ids = Object.keys(x);
  return ids.length === Object.keys(y).length && ids.every((id) => x[id] === y[id]);
};

// الأكبر كمية يفوز (نفس قاعدة الدمج عند تسجيل الدخول)
export const mergeMax = (a: Cart, b: Cart): Cart => {
  const out: Cart = { ...normalizeCart(a) };
  for (const [id, q] of Object.entries(normalizeCart(b))) out[id] = Math.max(out[id] ?? 0, q);
  return out;
};

export type CartChange = { id: string; device: number; account: number };

// الفروق بين سلة هذا الجهاز وسلة الحساب (للعرض قبل التأكيد)
export const diffCart = (device: Cart, account: Cart): CartChange[] => {
  const d = normalizeCart(device);
  const a = normalizeCart(account);
  return [...new Set([...Object.keys(d), ...Object.keys(a)])]
    .map((id) => ({ id, device: d[id] ?? 0, account: a[id] ?? 0 }))
    .filter((c) => c.device !== c.account);
};

// علم «تغييرات لم تُؤكَّد مزامنتها» — يُرفع عند التعديل دون اتصال أو عند فشل الحفظ في الحساب
const PENDING_KEY = "dentist-on-cart-pending";
export const isPending = () => {
  try { return localStorage.getItem(PENDING_KEY) === "1"; } catch { return false; }
};
export const setPendingFlag = (on: boolean) => {
  try {
    if (on) localStorage.setItem(PENDING_KEY, "1");
    else localStorage.removeItem(PENDING_KEY);
  } catch { /* التخزين غير متاح */ }
};

// متى يظهر زر «تأكيد مزامنة السلة»: مسجّل دخول + عاد الاتصال + توجد تغييرات معلّقة + وصلت سلة الحساب
export const needsSyncConfirm = (st: { loggedIn: boolean; online: boolean; pending: boolean; serverCart: Cart | null }) =>
  st.loggedIn && st.online && st.pending && !!st.serverCart;
