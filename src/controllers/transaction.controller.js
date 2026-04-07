import Transaction from "../models/TransactionModel.js";
import MonthlySummary from "../models/MonthlySummaryModel.js";
import mongoose from "mongoose";

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

    const userId = new mongoose.Types.ObjectId(req.userId);
    const { month, year, accountId } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        message: "Mês e ano são obrigatórios"
      });
    }

    const m = Number(month);
    const y = Number(year);

    if (isNaN(m) || isNaN(y) || m < 1 || m > 12 || y < 2000) {
      return res.status(400).json({
        message: "Período inválido"
      });
    }

    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(y, m, 0, 23, 59, 59));

    const match = {
      user: userId,
      date: { $gte: start, $lte: end }
    };

    if (accountId) {
      match.accountId = new mongoose.Types.ObjectId(accountId);
    }

    // 🔥 calcula income e expense do mês
    const result = await Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$type",
          total: {
            $sum: {
              $cond: [
                { $eq: ["$type", "expense"] },
                { $multiply: ["$amount", -1] },
                "$amount"
              ]
            }
          }
        }
      }
    ]);

    let income = 0;
    let expense = 0;

    result.forEach(item => {
      if (item._id === "income") income = item.total;
      if (item._id === "expense") expense = Math.abs(item.total);
    });

    // 🔥 pega saldo do mês anterior
    const prevMonth = m === 1 ? 12 : m - 1;
    const prevYear = m === 1 ? y - 1 : y;

    const previousSummary = await MonthlySummary.findOne({
      user: userId,
      month: prevMonth,
      year: prevYear,
      ...(accountId && { account: accountId })
    });

    const previousBalance = previousSummary?.balance || 0;

    // 💀 corrige ponto flutuante
    const rawBalance = previousBalance + income - expense;

    const balance = Number(rawBalance.toFixed(2));
    const fixedIncome = Number(income.toFixed(2));
    const fixedExpense = Number(expense.toFixed(2));
    const fixedPreviousBalance = Number(previousBalance.toFixed(2));

    return res.json({
      previousBalance: fixedPreviousBalance,
      income: fixedIncome,
      expense: fixedExpense,
      balance
    });

  } catch (err) {
    console.error("Erro em getSummary:", err);
    return res.status(500).json({
      message: "Erro interno"
    });
  }
};