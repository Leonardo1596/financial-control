import mongoose from "mongoose";

const MonthlySummarySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },

    year: {
      type: Number,
      required: true,
    },

    income: {
      type: Number,
      default: 0,
    },

    expense: {
      type: Number,
      default: 0,
    },

    balance: {
      type: Number,
      default: 0,
    },

    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },

    closedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// 🔒 ensures 1 summary per month per user
MonthlySummarySchema.index(
  { user: 1, year: 1, month: 1, account: 1 },
  { unique: true }
);

export default mongoose.model("MonthlySummary", MonthlySummarySchema);
