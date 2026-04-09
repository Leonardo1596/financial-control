import Transaction from "../models/TransactionModel.js";
import { calculateSummary } from "../utils/calculateSummary.js";

export const createTransaction = async (req, res) => {
  try {
    const { type, description, amount, date, accountId } = req.body;

    if (!type || !description || !amount || !accountId) {
      return res.status(400).json({ message: "Dados incompletos" });
    }

    const transaction = await Transaction.create({
      user: req.userId,
      type,
      description,
      amount,
      accountId,
      date
    });

    return res.status(201).json(transaction);
  } catch (err) {
    return res.status(500).json({ message: "Erro interno" });
  }
};

export const listTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      user: req.userId
    }).sort({ date: -1 });

    return res.json(transactions);
  } catch (err) {
    return res.status(500).json({ message: "Erro interno" });
  }
};

export const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findOneAndDelete({
      _id: id,
      user: req.userId
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transação não encontrada" });
    }

    return res.json({ message: "Transação removida" });
  } catch (err) {
    return res.status(500).json({ message: "Erro interno" });
  }
};

export const deleteAllTransactions = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await Transaction.deleteMany({ user: userId });

    return res.status(200).json({
      message: "Todas as transações foram deletadas",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao deletar transações",
      error: error.message,
    });
  }
};

export const getSummary = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    const { month, year, accountId } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        message: "Mês e ano são obrigatórios",
      });
    }

    const m = Number(month);
    const y = Number(year);

    if (isNaN(m) || isNaN(y) || m < 1 || m > 12 || y < 2000) {
      return res.status(400).json({
        message: "Período inválido",
      });
    }

    // 🧠 agora delega tudo pra função reutilizável
    const summary = await calculateSummary({
      userId: req.userId,
      month,
      year,
      accountId,
    });

    return res.json({
      previousBalance: Number(summary.previousBalance.toFixed(2)),
      income: Number(summary.income.toFixed(2)),
      expense: Number(summary.expense.toFixed(2)),
      balance: Number(summary.balance.toFixed(2)),
    });

  } catch (err) {
    console.error("Erro no getSummary:", err);
    return res.status(500).json({ message: "Erro interno" });
  }
};