import mongoose from "mongoose";
const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    currency: { type: String, required: true, uppercase: true, match: /^[A-Z]{3}$/ },
    pinHash: { type: String, required: true },
    editId: { type: String, required: true, unique: true, index: true },
    viewId: { type: String, required: true, unique: true, index: true },
    lastActivityAt: { type: Date, default: Date.now, index: true },
    version: { type: Number, default: 1 },
    settlementStates: {
      type: [
        {
          fromParticipantId: { type: String, required: true },
          toParticipantId: { type: String, required: true },
          amountMinor: { type: Number, required: true },
          settled: { type: Boolean, default: false }
        }
      ],
      default: []
    }
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);
export const Group = mongoose.model("Group", groupSchema);