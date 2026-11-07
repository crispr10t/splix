export function normalizeUpiId(value) {
  return String(value || "").trim().toLowerCase();
}

// Common email domains mistakenly entered as UPI
export const EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "proton.me",
  "zoho.com",
  "live.com"
]);

export function isValidUpiId(value) {
  const upiId = normalizeUpiId(value);
  if (!upiId || upiId.includes(" ")) return false;

  const parts = upiId.split("@");
  if (parts.length !== 2) return false;

  const [handle, provider] = parts;
  if (!handle || !provider) return false;

  if (EMAIL_DOMAINS.has(provider)) return false;

  if (handle.length < 3 || handle.length > 50) return false;
  if (/^[._-]|[._-]$/.test(handle)) return false;
  if (!/^[a-z0-9._-]+$/i.test(handle)) return false;
  if (/\.{2,}/.test(handle)) return false;

  if (provider.length < 2 || provider.length > 30) return false;
  if (!/^[a-z0-9]+$/i.test(provider)) return false;

  return true;
}
