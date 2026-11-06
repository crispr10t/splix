// all frontend to backend API calls
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");
let apiWarmupPromise = null;

//global handler
async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: options.cache || "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (response.status === 304) return { notModified: true };

  if (!response.ok) {
    let message = "Request failed";
    try {
      const data = await response.json();
      message = data.details?.join(", ") || data.error || message;
    } catch {
      // Ignore malformed JSON errors.
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

function warmApi() {
  if (!apiWarmupPromise) {
    apiWarmupPromise = fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      cache: "no-store"
    }).catch(() => null);
  }
  return apiWarmupPromise;
}

function createGroup(payload) {
  return apiRequest("/api/groups", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

function createSession(payload) {
  return apiRequest("/api/session", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

function fetchViewSnapshot(viewId, options = {}) {
  const query = options.since !== undefined && options.since !== null ? `?since=${encodeURIComponent(options.since)}` : "";
  return apiRequest(`/api/groups/view/${viewId}${query}`);
}

function fetchEditSnapshot(editId, token, options = {}) {
  const query = options.since !== undefined && options.since !== null ? `?since=${encodeURIComponent(options.since)}` : "";
  return apiRequest(`/api/groups/edit/${editId}${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

function fetchEditGroupMeta(editId) {
  return apiRequest(`/api/groups/edit/${editId}/meta`);
}

function addExpense(editId, token, payload) {
  return apiRequest(`/api/groups/edit/${editId}/expenses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

function updateExpense(editId, expenseId, token, payload) {
  return apiRequest(`/api/groups/edit/${editId}/expenses/${expenseId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

function deleteExpense(editId, expenseId, token) {
  return apiRequest(`/api/groups/edit/${editId}/expenses/${expenseId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

function addParticipant(editId, token, payload) {
  return apiRequest(`/api/groups/edit/${editId}/participants`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

function updateParticipant(editId, participantId, token, payload) {
  return apiRequest(`/api/groups/edit/${editId}/participants/${participantId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

function recordSettlement(editId, token, payload) {
  return apiRequest(`/api/groups/edit/${editId}/settlements`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

function deleteSettlement(editId, settlementId, token) {
  return apiRequest(`/api/groups/edit/${editId}/settlements/${settlementId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

function updateSettlement(editId, token, payload) {
  return apiRequest(`/api/groups/edit/${editId}/settlements`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

function pdfDownloadUrl(viewId) {
  return `${API_BASE_URL}/api/groups/view/${viewId}/pdf`;
}

export {
  API_BASE_URL,
  addExpense,
  addParticipant,
  apiRequest,
  createGroup,
  createSession,
  deleteExpense,
  deleteSettlement,
  fetchEditGroupMeta,
  fetchEditSnapshot,
  fetchViewSnapshot,
  pdfDownloadUrl,
  recordSettlement,
  updateExpense,
  updateParticipant,
  updateSettlement,
  warmApi
};
