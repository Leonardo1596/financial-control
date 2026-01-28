import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true
    },
    description: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    externalId: String,
    source: {
      type: String,
      enum: ["nubank", "mercadopago", "manual", "ofx"]
    }
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);