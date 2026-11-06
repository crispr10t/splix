import bcrypt from "bcryptjs";
import express from "express";
import Joi from "joi";
import { nanoid } from "nanoid";
import { requireEditAuth } from "./auth.js";
import { Expense } from "./models/Expense.js";
import { Group } from "./models/Group.js";
import { Participant } from "./models/Participant.js";
import { Settlement } from "./models/Settlement.js";
import { buildReceiptPdf } from "./pdf.js";
import { mutationLimiter, pdfLimiter, snapshotLimiter } from "./rateLimiter.js";
import { getGroupByEditId, getGroupByViewId, getSnapshotByGroup } from "./snapshot.js";
import { setNoCache } from "./http.js";
import { buildSplitJson } from "./split.js";
import { normalizeUpiId, isValidUpiId } from "./upiValidation.js";
import { validateBody } from "./validate.js";

// joi is used to validate and sanitize incoming request date.
const splitEntrySchema = Joi.object({
  participantId: Joi.string().required(),
  amountMinor: Joi.number().integer().min(0).optional(),
  percent: Joi.number().min(0).max(100).optional()
});

const categorySchema = Joi.string()
  .valid("food", "transport", "stay", "groceries", "entertainment", "utilities", "general")
  .default("general");

const createGroupSchema = Joi.object({
  name: Joi.string().trim().min(1).max(50).required(),
  currency: Joi.string().trim().uppercase().length(3).required(),
  pin: Joi.string().pattern(/^\d{4}$/).required(),
  participants: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().trim().min(1).max(32).required()
      })
    )
    .min(2)
    .required()
});

const addExpenseSchema = Joi.object({
  title: Joi.string().trim().min(1).max(60).required(),
  amountMinor: Joi.number().integer().min(1).required(),
  paidByParticipantId: Joi.string().required(),
  split: Joi.object({
    mode: Joi.string().valid("even", "amount", "percentage").required(),
    entries: Joi.array().items(splitEntrySchema).min(1).required()
  }).required(),
  category: categorySchema.optional(),
  date: Joi.date().iso().optional()
});

const updateExpenseSchema = Joi.object({
  title: Joi.string().trim().min(1).max(60).required(),
  amountMinor: Joi.number().integer().min(1).required(),
  paidByParticipantId: Joi.string().required(),
  split: Joi.object({
    mode: Joi.string().valid("even", "amount", "percentage").required(),
    entries: Joi.array().items(splitEntrySchema).min(1).required()
  }).required(),
  category: categorySchema.optional(),
  date: Joi.date().iso().optional()
});

const upiIdSchema = Joi.alternatives()
  .try(
    Joi.string()
      .trim()
      .allow("")
      .max(120)
      .custom((value, helpers) => {
        const normalized = normalizeUpiId(value);
        if (!normalized) return "";
        if (!isValidUpiId(normalized)) {
          return helpers.error("upi.invalid");
        }
        return normalized;
      }, "UPI ID validation"),
    Joi.valid(null)
  )
  .messages({
    "upi.invalid": "Enter a valid UPI ID format like name@bank"
  });

const addParticipantSchema = Joi.object({
  name: Joi.string().trim().min(1).max(32).required(),
  upiId: upiIdSchema.optional()
});

const patchParticipantSchema = Joi.object({
  name: Joi.string().trim().min(1).max(32).optional(),
  upiId: upiIdSchema.optional()
}).min(1);

const recordSettlementSchema = Joi.object({
  fromParticipantId: Joi.string().required(),
  toParticipantId: Joi.string().required(),
  amountMinor: Joi.number().integer().min(1).required(),
  note: Joi.string().trim().max(100).allow("").optional(),
  date: Joi.date().iso().optional()
});

const patchSettlementSchema = Joi.object({
  fromParticipantId: Joi.string().required(),
  toParticipantId: Joi.string().required(),
  amountMinor: Joi.number().integer().min(1).required(),
  settled: Joi.boolean().required()
});



async function touchGroupActivity(groupId) {
  await Group.updateOne(
    { _id: groupId },
    {
      $set: { lastActivityAt: new Date() },
      $inc: { version: 1 }
    }
  );
}

async function createGroup(req, res) {
  const { name, currency, pin, participants } = req.body;
  const pinHash = await bcrypt.hash(pin, 10);
  const editId = nanoid(18);
  const viewId = nanoid(18);
  let group = null;
  try {
    group = await Group.create({ name, currency, pinHash, editId, viewId, version: 1 });

    await Participant.insertMany(
      participants.map((participant) => ({
        groupId: group._id,
        name: participant.name
      }))
    );
    return res.status(201).json({
      group: {
        id: String(group._id),
        name: group.name,
        currency: group.currency,
        editId: group.editId,
        viewId: group.viewId,
        createdAt: group.createdAt
      },
      editLink: `/edit/${editId}`,
      viewLink: `/view/${viewId}`
    });
  } catch (error) {
    if (group?._id) {
      await Group.deleteOne({ _id: group._id });
    }
    throw error;
  }
}

async function getViewSnapshot(req, res) {
  const group = await getGroupByViewId(req.params.viewId);
  if (!group) return res.status(404).json({ error: "Group not found" });

  const currentVersion = group.version || (group.lastActivityAt ? new Date(group.lastActivityAt).getTime() : 1);
  const since = req.query.since || req.headers["if-none-match"]?.replace(/["']/g, "");

  if (since && String(since) === String(currentVersion)) {
    setNoCache(res);
    return res.status(200).json({ notModified: true, version: currentVersion });
  }

  const snapshot = await getSnapshotByGroup(group);
  setNoCache(res);
  return res.json(snapshot);
}

async function getEditSnapshot(req, res) {
  const group = await getGroupByEditId(req.params.editId);
  if (!group) return res.status(404).json({ error: "Group not found" });

  const currentVersion = group.version || (group.lastActivityAt ? new Date(group.lastActivityAt).getTime() : 1);
  const since = req.query.since || req.headers["if-none-match"]?.replace(/["']/g, "");

  if (since && String(since) === String(currentVersion)) {
    setNoCache(res);
    return res.status(200).json({ notModified: true, version: currentVersion });
  }

  const snapshot = await getSnapshotByGroup(group);
  setNoCache(res);
  return res.json(snapshot);
}

async function getEditGroupMeta(req, res) {
  const group = await getGroupByEditId(req.params.editId);
  if (!group) return res.status(404).json({ error: "Group not found" });
  const participantCount = await Participant.countDocuments({ groupId: group._id });
  setNoCache(res);
  return res.json({
    name: group.name,
    currency: group.currency,
    participantCount,
    viewId: group.viewId,
    createdAt: group.createdAt
  });
}

async function addExpense(req, res) {
  const { editId } = req.params;
  const group = await getGroupByEditId(editId);
  if (!group) return res.status(404).json({ error: "Group not found" });

  const participants = await Participant.find({ groupId: group._id }).lean();
  const participantsById = new Map(participants.map((participant) => [String(participant._id), participant]));
  if (!participantsById.has(req.body.paidByParticipantId)) {
    return res.status(400).json({ error: "Invalid payer participant" });
  }

  let splitJson;
  try {
    splitJson = buildSplitJson({
      amountMinor: req.body.amountMinor,
      split: req.body.split,
      participantsById
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const expense = await Expense.create({
    groupId: group._id,
    title: req.body.title,
    amountMinor: req.body.amountMinor,
    paidByParticipantId: req.body.paidByParticipantId,
    splitJson,
    category: req.body.category || "general",
    date: req.body.date ? new Date(req.body.date) : new Date()
  });

  await touchGroupActivity(group._id);

  return res.status(201).json({
    id: String(expense._id),
    groupId: String(expense.groupId),
    title: expense.title,
    amountMinor: expense.amountMinor,
    paidByParticipantId: String(expense.paidByParticipantId),
    splitJson: expense.splitJson,
    category: expense.category,
    date: expense.date ? expense.date.toISOString() : expense.createdAt.toISOString(),
    createdAt: expense.createdAt
  });
}

async function updateExpense(req, res) {
  const { editId, expenseId } = req.params;
  const group = await getGroupByEditId(editId);
  if (!group) return res.status(404).json({ error: "Group not found" });

  const expense = await Expense.findOne({ _id: expenseId, groupId: group._id });
  if (!expense) return res.status(404).json({ error: "Expense not found" });

  const participants = await Participant.find({ groupId: group._id }).lean();
  const participantsById = new Map(participants.map((participant) => [String(participant._id), participant]));
  if (!participantsById.has(req.body.paidByParticipantId)) {
    return res.status(400).json({ error: "Invalid payer participant" });
  }

  let splitJson;
  try {
    splitJson = buildSplitJson({
      amountMinor: req.body.amountMinor,
      split: req.body.split,
      participantsById
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  expense.title = req.body.title;
  expense.amountMinor = req.body.amountMinor;
  expense.paidByParticipantId = req.body.paidByParticipantId;
  expense.splitJson = splitJson;
  if (req.body.category) expense.category = req.body.category;
  if (req.body.date) expense.date = new Date(req.body.date);
  await expense.save();

  await touchGroupActivity(group._id);

  return res.json({
    id: String(expense._id),
    groupId: String(expense.groupId),
    title: expense.title,
    amountMinor: expense.amountMinor,
    paidByParticipantId: String(expense.paidByParticipantId),
    splitJson: expense.splitJson,
    category: expense.category,
    date: expense.date ? expense.date.toISOString() : expense.createdAt.toISOString(),
    createdAt: expense.createdAt
  });
}

async function deleteExpense(req, res) {
  const { editId, expenseId } = req.params;
  const group = await getGroupByEditId(editId);
  if (!group) return res.status(404).json({ error: "Group not found" });
  const deleted = await Expense.findOneAndDelete({ _id: expenseId, groupId: group._id });
  if (!deleted) return res.status(404).json({ error: "Expense not found" });
  await touchGroupActivity(group._id);
  return res.status(204).send();
}

async function addParticipant(req, res) {
  const { editId } = req.params;
  const group = await getGroupByEditId(editId);
  if (!group) return res.status(404).json({ error: "Group not found" });

  const name = req.body.name.trim();
  // Check for duplicate name in group (case-insensitive)
  const existing = await Participant.findOne({
    groupId: group._id,
    name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }
  }).lean();

  if (existing) {
    return res.status(400).json({ error: `A participant named "${name}" already exists` });
  }

  const participant = await Participant.create({
    groupId: group._id,
    name,
    upiId: req.body.upiId || null
  });

  await touchGroupActivity(group._id);

  return res.status(201).json({
    id: String(participant._id),
    groupId: String(participant.groupId),
    name: participant.name,
    upiId: participant.upiId,
    createdAt: participant.createdAt
  });
}

async function patchParticipant(req, res) {
  const { editId, participantId } = req.params;
  const group = await getGroupByEditId(editId);
  if (!group) return res.status(404).json({ error: "Group not found" });

  const patch = {};
  if (req.body.name !== undefined) patch.name = req.body.name;
  if (req.body.upiId !== undefined) patch.upiId = req.body.upiId || null;

  const participant = await Participant.findOneAndUpdate(
    { _id: participantId, groupId: group._id },
    { $set: patch },
    { new: true }
  ).lean();
  if (!participant) return res.status(404).json({ error: "Participant not found" });
  await touchGroupActivity(group._id);

  return res.json({
    id: String(participant._id),
    groupId: String(participant.groupId),
    name: participant.name,
    upiId: participant.upiId,
    createdAt: participant.createdAt
  });
}

async function recordSettlement(req, res) {
  const { editId } = req.params;
  const group = await getGroupByEditId(editId);
  if (!group) return res.status(404).json({ error: "Group not found" });

  const { fromParticipantId, toParticipantId, amountMinor, note, date } = req.body;
  if (fromParticipantId === toParticipantId) {
    return res.status(400).json({ error: "Payer and payee cannot be the same person" });
  }

  const participants = await Participant.find({ groupId: group._id }).lean();
  const participantsById = new Map(participants.map((p) => [String(p._id), p]));
  if (!participantsById.has(fromParticipantId) || !participantsById.has(toParticipantId)) {
    return res.status(400).json({ error: "Invalid participant selected for settlement" });
  }

  const settlement = await Settlement.create({
    groupId: group._id,
    fromParticipantId,
    toParticipantId,
    amountMinor,
    note: note || "",
    date: date ? new Date(date) : new Date()
  });

  await touchGroupActivity(group._id);

  return res.status(201).json({
    id: String(settlement._id),
    groupId: String(settlement.groupId),
    fromParticipantId: String(settlement.fromParticipantId),
    fromName: participantsById.get(fromParticipantId).name,
    toParticipantId: String(settlement.toParticipantId),
    toName: participantsById.get(toParticipantId).name,
    amountMinor: settlement.amountMinor,
    note: settlement.note,
    date: settlement.date.toISOString(),
    createdAt: settlement.createdAt
  });
}

async function deleteSettlement(req, res) {
  const { editId, settlementId } = req.params;
  const group = await getGroupByEditId(editId);
  if (!group) return res.status(404).json({ error: "Group not found" });

  const deleted = await Settlement.findOneAndDelete({ _id: settlementId, groupId: group._id });
  if (!deleted) return res.status(404).json({ error: "Settlement record not found" });

  await touchGroupActivity(group._id);
  return res.status(204).send();
}

async function patchSettlement(req, res) {
  const { editId } = req.params;
  const group = await getGroupByEditId(editId);
  if (!group) return res.status(404).json({ error: "Group not found" });
  const key = {
    fromParticipantId: req.body.fromParticipantId,
    toParticipantId: req.body.toParticipantId,
    amountMinor: req.body.amountMinor
  };
  const states = Array.isArray(group.settlementStates) ? [...group.settlementStates] : [];
  const index = states.findIndex(
    (state) =>
      state.fromParticipantId === key.fromParticipantId &&
      state.toParticipantId === key.toParticipantId &&
      state.amountMinor === key.amountMinor
  );
  if (index >= 0) {
    states[index] = { ...states[index], settled: req.body.settled };
  } else {
    states.push({ ...key, settled: req.body.settled });
  }
  await Group.updateOne({ _id: group._id }, { $set: { settlementStates: states } });
  await touchGroupActivity(group._id);
  return res.json({ ok: true });
}

async function getViewPdf(req, res) {
  const group = await getGroupByViewId(req.params.viewId);
  if (!group) return res.status(404).json({ error: "Group not found" });
  const snapshot = await getSnapshotByGroup(group);
  const bytes = await buildReceiptPdf(snapshot);
  setNoCache(res);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${group.name.replace(/\s+/g, "_")}_splix_receipt.pdf"`
  );
  return res.send(Buffer.from(bytes));
}

const router = express.Router();
router.post("/groups", mutationLimiter, validateBody(createGroupSchema), createGroup);
router.get("/groups/view/:viewId", snapshotLimiter, getViewSnapshot);
router.get("/groups/edit/:editId/meta", snapshotLimiter, getEditGroupMeta);
router.get("/groups/edit/:editId", requireEditAuth, snapshotLimiter, getEditSnapshot);
router.post("/groups/edit/:editId/participants", requireEditAuth, mutationLimiter, validateBody(addParticipantSchema), addParticipant);
router.post("/groups/edit/:editId/expenses", requireEditAuth, mutationLimiter, validateBody(addExpenseSchema), addExpense);
router.put("/groups/edit/:editId/expenses/:expenseId", requireEditAuth, mutationLimiter, validateBody(updateExpenseSchema), updateExpense);
router.delete("/groups/edit/:editId/expenses/:expenseId", requireEditAuth, mutationLimiter, deleteExpense);
router.patch(
  "/groups/edit/:editId/participants/:participantId",
  requireEditAuth,
  mutationLimiter,
  validateBody(patchParticipantSchema),
  patchParticipant
);
router.post(
  "/groups/edit/:editId/settlements",
  requireEditAuth,
  mutationLimiter,
  validateBody(recordSettlementSchema),
  recordSettlement
);
router.delete(
  "/groups/edit/:editId/settlements/:settlementId",
  requireEditAuth,
  mutationLimiter,
  deleteSettlement
);
router.patch(
  "/groups/edit/:editId/settlements",
  requireEditAuth,
  mutationLimiter,
  validateBody(patchSettlementSchema),
  patchSettlement
);
router.get("/groups/view/:viewId/pdf", pdfLimiter, getViewPdf);

export default router;
