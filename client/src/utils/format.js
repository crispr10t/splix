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
  const d = new Date(value);
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

  const timeStr = d
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    })
    .replace(/\s|[\u2000-\u200b\u202f]/g, " ")
    .toLowerCase();

  if (isToday) {
    return `Today, ${timeStr}`;
  }
  if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  }

  const isThisYear = d.getFullYear() === now.getFullYear();
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });

  if (isThisYear) {
    return `${day} ${month}`;
  }
  return `${day} ${month} ${d.getFullYear()}`;
}

