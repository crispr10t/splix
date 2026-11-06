import { Expense } from "./models/Expense.js";
import { Group } from "./models/Group.js";
import { Participant } from "./models/Participant.js";
import { Settlement } from "./models/Settlement.js";
import { deriveBalances, simplifyDebts } from "./settlement.js";

//raw data to json
function mapGroup(group) {
  return {
    id: String(group._id),
    name: group.name,
    currency: group.currency,
    editId: group.editId,
    viewId: group.viewId,
    createdAt: group.createdAt,
    lastActivityAt: group.lastActivityAt,
    version: group.version || (group.lastActivityAt ? new Date(group.lastActivityAt).getTime() : 1)
  };
}

function mapParticipant(participant) {
  return {
    id: String(participant._id),
    groupId: String(participant.groupId),
    name: participant.name,
    upiId: participant.upiId || null,
    createdAt: participant.createdAt
  };
}

function mapExpense(expense) {
  const expenseDate = expense.date || expense.createdAt || new Date();
  const createdDate = expense.createdAt || expenseDate;
  return {
    id: String(expense._id),
    groupId: String(expense.groupId),
    title: expense.title,
    amountMinor: expense.amountMinor,
    paidByParticipantId: String(expense.paidByParticipantId),
    splitJson: expense.splitJson,
    category: expense.category || "general",
    date: expenseDate instanceof Date ? expenseDate.toISOString() : new Date(expenseDate).toISOString(),
    createdAt: createdDate instanceof Date ? createdDate.toISOString() : new Date(createdDate).toISOString()
  };
}

function mapSettlement(settlement, participantsById) {
  const fromName = participantsById.get(String(settlement.fromParticipantId))?.name || "Unknown";
  const toName = participantsById.get(String(settlement.toParticipantId))?.name || "Unknown";
  const settleDate = settlement.date || settlement.createdAt || new Date();
  const createdDate = settlement.createdAt || settleDate;
  return {
    id: String(settlement._id),
    groupId: String(settlement.groupId),
    fromParticipantId: String(settlement.fromParticipantId),
    fromName,
    toParticipantId: String(settlement.toParticipantId),
    toName,
    amountMinor: settlement.amountMinor,
    note: settlement.note || "",
    date: settleDate instanceof Date ? settleDate.toISOString() : new Date(settleDate).toISOString(),
    createdAt: createdDate instanceof Date ? createdDate.toISOString() : new Date(createdDate).toISOString()
  };
}

function sortParticipantsByName(participants) {
  return participants
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true }));
}

export async function getGroupByEditId(editId) {
  return Group.findOne({ editId }).lean();
}

export async function getGroupByViewId(viewId) {
  return Group.findOne({ viewId }).lean();
}

export async function getSnapshotByGroup(group) {
  const [participantsRaw, expensesRaw, settlementsRaw] = await Promise.all([
    Participant.find({ groupId: group._id }).sort({ name: 1 }).lean(),
    Expense.find({ groupId: group._id }).sort({ date: -1, createdAt: -1 }).lean(),
    Settlement.find({ groupId: group._id }).sort({ date: -1, createdAt: -1 }).lean()
  ]);

  const participants = sortParticipantsByName(participantsRaw.map(mapParticipant));
  const participantsById = new Map(participants.map((p) => [p.id, p]));
  const expenses = expensesRaw.map(mapExpense);
  const settlementHistory = settlementsRaw.map((s) => mapSettlement(s, participantsById));

  // Compute net balances accounting for all expenses and formal settlement reimbursements
  const balances = deriveBalances(participants, expenses, settlementsRaw);
  const states = group.settlementStates || []; // legacy states if any

  const settlements = simplifyDebts(balances).map((row) => {
    const settledRow = states.find(
      (state) =>
        state.fromParticipantId === row.fromParticipantId &&
        state.toParticipantId === row.toParticipantId &&
        state.amountMinor === row.amountMinor &&
        state.settled
    );
    return {
      ...row,
      settled: Boolean(settledRow)
    };
  });

  return {
    group: mapGroup(group),
    participants,
    expenses,
    balances,
    settlements,
    settlementHistory
  };
}
