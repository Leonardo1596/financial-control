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

    const { month, year, accountId } = req.query;

    // ❌ removido: obrigatoriedade do accountId
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

    const userId = new mongoose.Types.ObjectId(req.userId);

    // 👇 só cria se existir accountId
    const accountObjectId = accountId
      ? new mongoose.Types.ObjectId(accountId)
      : null;

    // 📅 intervalo do mês atual
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(y, m, 0, 23, 59, 59));

    // 🧠 filtro dinâmico
    const matchFilter = {
      user: userId,
      date: { $gte: start, $lte: end },
    };

    if (accountObjectId) {
      matchFilter.accountId = accountObjectId;
    }

    // 🔍 transações do mês atual
    const result = await Transaction.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$type",
          total: {
            $sum: {
              $cond: [
                { $eq: ["$type", "expense"] },
                { $multiply: ["$amount", -1] },
                "$amount",
              ],
            },
          },
        },
      },
    ]);

    let income = 0;
    let expense = 0;

    result.forEach((item) => {
      if (item._id === "income") income = item.total;
      if (item._id === "expense") expense = Math.abs(item.total);
    });

    // 🔥 mês anterior
    const prevMonth = m === 1 ? 12 : m - 1;
    const prevYear = m === 1 ? y - 1 : y;

    let previousBalance = 0;

    // 🧠 filtro do summary anterior
    const previousSummaryFilter = {
      user: userId,
      month: prevMonth,
      year: prevYear,
    };

    if (accountObjectId) {
      previousSummaryFilter.account = accountObjectId;
    }

    const previousSummary = await MonthlySummary.findOne(previousSummaryFilter);

    if (previousSummary) {
      previousBalance = previousSummary.balance;
    } else {
      // 💀 fallback: tudo antes do mês atual
      const pastMatchFilter = {
        user: userId,
        date: { $lt: start },
      };

      if (accountObjectId) {
        pastMatchFilter.accountId = accountObjectId;
      }

      const pastTransactions = await Transaction.aggregate([
        { $match: pastMatchFilter },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $cond: [
                  { $eq: ["$type", "expense"] },
                  { $multiply: ["$amount", -1] },
                  "$amount",
                ],
              },
            },
          },
        },
      ]);

      previousBalance = pastTransactions[0]?.total || 0;
    }

    const rawBalance = previousBalance + income - expense;

    return res.json({
      previousBalance: Number(previousBalance.toFixed(2)),
      income: Number(income.toFixed(2)),
      expense: Number(expense.toFixed(2)),
      balance: Number(rawBalance.toFixed(2)),
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erro interno" });
  }
};