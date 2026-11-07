export function normalizeUpiId(value) {
  return String(value || "").trim().toLowerCase();
}

// Common email domains mistakenly entered as UPI
const EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "proton.me",
  "zoho.com",
  "live.com"
]);

/**
 * Validates a UPI ID against NPCI VPA specifications:
 * - Format: username@provider
 * - Handle: 3-50 chars (alphanumeric, dot, hyphen, underscore; no punctuation at edges)
 * - Provider: 2-30 chars (letters and digits only; no dot-com or email domains)
 */
export function isValidUpiId(value) {
  const upiId = normalizeUpiId(value);
  if (!upiId || upiId.includes(" ")) return false;

  const parts = upiId.split("@");
  if (parts.length !== 2) return false;

  const [handle, provider] = parts;
  if (!handle || !provider) return false;

  // Reject common email domains
  if (EMAIL_DOMAINS.has(provider)) return false;

  // Handle (user/phone): must be 3-50 characters
  // Cannot start or end with a dot, hyphen, or underscore
  if (handle.length < 3 || handle.length > 50) return false;
  if (/^[._-]|[._-]$/.test(handle)) return false;
  if (!/^[a-z0-9._-]+$/i.test(handle)) return false;
  if (/\.{2,}/.test(handle)) return false; // no consecutive dots

  // Provider (bank/PSP): must be 2-30 characters, letters or digits only (no dots like .com)
  if (provider.length < 2 || provider.length > 30) return false;
  if (!/^[a-z0-9]+$/i.test(provider)) return false;

  return true;
}

/**
 * Returns a helpful error message if invalid, or null if valid/empty.
 */
export function getUpiValidationMessage(value) {
  const upiId = normalizeUpiId(value);
  if (!upiId) return null;

  if (upiId.includes(" ")) {
    return "UPI ID cannot contain spaces";
  }

  const parts = upiId.split("@");
  if (parts.length === 1) {
    return "Missing @ (e.g. yourname@okaxis)";
  }
  if (parts.length > 2) {
    return "Only one @ allowed";
  }

  const [handle, provider] = parts;

  if (EMAIL_DOMAINS.has(provider)) {
    return "This is an email address, not a UPI ID";
  }

  if (handle.length < 3) {
    return "Username or mobile number is too short (min 3 chars)";
  }

  if (/^[._-]|[._-]$/.test(handle)) {
    return "Cannot start or end with symbols";
  }

  if (!/^[a-z0-9._-]+$/i.test(handle)) {
    return "Invalid characters in username";
  }

  if (!provider) {
    return "Missing bank handle after @ (e.g. okaxis, ybl)";
  }

  if (provider.includes(".")) {
    return "Bank handle should not contain dots (e.g. use @okaxis, not .com)";
  }

  if (!/^[a-z0-9]+$/i.test(provider) || provider.length < 2) {
    return "Invalid bank handle after @";
  }

  return null;
}
