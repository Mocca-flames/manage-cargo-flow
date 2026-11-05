const KEY = 'freight.token';
const DEVICE_KEY = 'freight.device';

export function getToken(){ try { return localStorage.getItem(KEY); } catch { return null; } }
export function setToken(token){ try { if (token) localStorage.setItem(KEY, token); else localStorage.removeItem(KEY); } catch {} }

// Trusted-device token: backend skips the OTP email for 30 days when sent back.
export function getDeviceToken(): string | null { try { return localStorage.getItem(DEVICE_KEY); } catch { return null; } }
export function setDeviceToken(token: string | null){ try { if (token) localStorage.setItem(DEVICE_KEY, token); else localStorage.removeItem(DEVICE_KEY); } catch {} }
