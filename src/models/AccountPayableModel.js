import mongoose from "mongoose";

const AccountPayableSchema = new mongoose.Schema({
  userId: {
    type: String,
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

  dueDate: {
    type: Date,
    required: true
  },

  paidAt: {
    type: Date,
    default: null
  },

  status: {
    type: String,
    enum: ["pendente", "paga", "atrasada"],
    default: "pendente"
  },

  type: {
    type: String,
    enum: ["fixa", "variavel"],
    default: "fixa"
  },

  recurring: {
    type: Boolean,
    default: false
  },

  category: {
    type: String,
    default: "Geral"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const AccountPayable = mongoose.model(
  "AccountPayable",
  AccountPayableSchema
);

export default AccountPayable;