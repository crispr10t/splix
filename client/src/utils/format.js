export function getCurrencySymbol(currency = "INR") {
  if (!currency) return "₹";
  const curr = String(currency).trim().toUpperCase();
  if (curr === "INR") return "₹";
  try {
    const parts = new Intl.NumberFormat(curr === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: curr
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value || curr;
  } catch {
    return curr;
  }
}

export function money(amountMinor, currency = "INR") {
  const minor = Math.round(Number(amountMinor || 0));
  const isWhole = Math.abs(minor) % 100 === 0;
  const value = minor / 100;
  const curr = String(currency || "INR").trim().toUpperCase();
  try {
    const locale = curr === "INR" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: curr,
      minimumFractionDigits: isWhole ? 0 : 2,
      maximumFractionDigits: isWhole ? 0 : 2
    }).format(value);
  } catch {
    const symbol = getCurrencySymbol(curr);
    const spacing = symbol.length > 1 ? " " : "";
    return `${symbol}${spacing}${isWhole ? value.toFixed(0) : value.toFixed(2)}`;
  }
}

export function formatDateTime(value) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

export function formatCompactDate(value) {
  if (!value) return "";
  const d = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  if (isNaN(d.getTime())) return "";

  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isToday) return "";
  if (isYesterday) return "";

  const isThisYear = d.getFullYear() === now.getFullYear();
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });

  if (isThisYear) {
    return `${day} ${month}`;
  }
  return `${day} ${month} ${d.getFullYear()}`;
}
