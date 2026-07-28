const isClient = typeof window !== 'undefined';

let userTypeGlobal = null;

export const setUserType = (userType) => {
  userTypeGlobal = userType; // 'club-member', 'guest', or null
};

export const getViewMode = () => {
  if (!isClient) return 'league';
  try { return localStorage.getItem('view_mode') || 'league'; } catch (e) { return 'league'; }
};

export const lsKey = (key) => {
  if (key === 'view_mode') return 'view_mode';
  const vm = getViewMode();
  // For guests, prefix keys with 'guest:' to isolate their data
  const prefix = userTypeGlobal === 'guest' ? 'guest:' : '';
  return `${prefix}${vm}:${key}`;
};

export const getLSRaw = (key) => {
  if (!isClient) return null;
  try { return localStorage.getItem(lsKey(key)); } catch (e) { return null; }
};

export const setLSRaw = (key, value) => {
  if (!isClient) return;
  try { localStorage.setItem(lsKey(key), value); } catch (e) { }
};

export const removeLS = (key) => {
  if (!isClient) return;
  try { localStorage.removeItem(lsKey(key)); } catch (e) { }
};

export const getLSJson = (key, fallback = null) => {
  try {
    const raw = getLSRaw(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
};

export const setLSJson = (key, obj) => {
  try {
    setLSRaw(key, JSON.stringify(obj));
  } catch (e) {}
};
