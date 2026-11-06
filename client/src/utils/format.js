export function money(amountMinor, currency) {
  return `${currency} ${(Number(amountMinor || 0) / 100).toFixed(2)}`;
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

