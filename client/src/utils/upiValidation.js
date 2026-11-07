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

/**
 * Top recognized PSP handles across India (Google Pay, PhonePe, Paytm, BHIM, etc.)
 */
export const KNOWN_PSP_HANDLES = {
  // Google Pay
  okhdfcbank: { app: "Google Pay", bank: "HDFC Bank" },
  okaxis: { app: "Google Pay", bank: "Axis Bank" },
  okicici: { app: "Google Pay", bank: "ICICI Bank" },
  oksbi: { app: "Google Pay", bank: "SBI" },
  // PhonePe
  ybl: { app: "PhonePe", bank: "YES Bank" },
  ibl: { app: "PhonePe", bank: "ICICI Bank" },
  axl: { app: "PhonePe", bank: "Axis Bank" },
  // Paytm
  paytm: { app: "Paytm", bank: "Paytm Bank" },
  ptaxis: { app: "Paytm", bank: "Axis Bank" },
  pthdfc: { app: "Paytm", bank: "HDFC Bank" },
  ptyes: { app: "Paytm", bank: "YES Bank" },
  ptsbi: { app: "Paytm", bank: "SBI" },
  // BHIM / NPCI
  upi: { app: "BHIM", bank: "UPI" },
  // Major Banks
  sbi: { app: "SBI YONO", bank: "SBI" },
  icici: { app: "iMobile", bank: "ICICI Bank" },
  hdfcbank: { app: "HDFC Mobile", bank: "HDFC Bank" },
  axisbank: { app: "Axis Mobile", bank: "Axis Bank" },
  kotak: { app: "Kotak 811", bank: "Kotak Bank" },
  indus: { app: "IndusMobile", bank: "IndusInd Bank" },
  barodampay: { app: "bob World", bank: "Bank of Baroda" },
  pnb: { app: "PNB ONE", bank: "Punjab National Bank" },
  // Amazon Pay
  apl: { app: "Amazon Pay", bank: "Axis Bank" },
  rapl: { app: "Amazon Pay", bank: "RBL Bank" },
  // CRED
  cred: { app: "CRED", bank: "Axis Bank" },
  axisb: { app: "CRED", bank: "Axis Bank" }
};

export const POPULAR_UPI_HANDLES = [
  "@okaxis",
  "@okhdfcbank",
  "@ybl",
  "@paytm",
  "@upi",
  "@icici"
];

/**
 * Returns PSP app & bank metadata if the provider is recognized, or null
 */
export function getUpiPspInfo(value) {
  const upiId = normalizeUpiId(value);
  if (!upiId || !upiId.includes("@")) return null;
  const parts = upiId.split("@");
  if (parts.length !== 2) return null;
  const provider = parts[1].toLowerCase();
  return KNOWN_PSP_HANDLES[provider] || null;
}

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
