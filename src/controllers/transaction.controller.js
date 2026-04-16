import Transaction from "../models/TransactionModel.js";
import PendingTransaction from "../models/PendingTransactionModel.js";
import Category from "../models/CategoryModel.js";
import { calculateSummary } from "../utils/calculateSummary.js";

// =========================
// 🟢 CREATE NORMAL
// =========================
export const createTransaction = async (req, res) => {
  try {
    const {
      type,
      description,
      amount,
      date,
      accountId,
      categoryId, // 🔥 novo campo
      pendingId
    } = req.body;

    if (!type || !description || !amount || !accountId || !categoryId) {
      return res.status(400).json({ message: "Dados incompletos" });
    }

    // 🔥 valida se a categoria pertence ao usuário ou é padrão
    const category = await Category.findOne({
      _id: categoryId,
      $or: [
        { isDefault: true },
        { userId: req.userId }
      ]
    });

    if (!category) {
      return res.status(400).json({
        message: "Categoria inválida"
      });
    }

    const transaction = await Transaction.create({
      user: req.userId,
      type,
      description,
      amount,
      accountId,
      categoryId,
      date
    });

    // 🔥 APAGA PENDING SE EXISTIR
    if (pendingId) {
      await PendingTransaction.findOneAndDelete({
        _id: pendingId,
        user: req.userId
      });
    }
    console.log("Transação criada:", transaction);
    return res.status(201).json(transaction);
  } catch (err) {
    console.error("Erro createTransaction:", err);
    return res.status(500).json({ message: "Erro interno" });
  }
};

// =========================
// 🔥 CREATE PENDING (NOVO)
// =========================
export const createPendingTransaction = async (req, res) => {
  try {
    let { type, description, amount, source, accountId } = req.body;

    if (!description || !amount || !source) {
      return res.status(400).json({ message: "Dados incompletos" });
    }

    // 🔥 NORMALIZA TYPE (não confia no Android, ele não é seu amigo)
    const text = (description || "").toLowerCase();

    const incomeKeywords = [
      "recebido",
      "recebeu",
      "entrada",
      "creditou",
      "pix recebido",
      "você recebeu",
      "transferência recebida"
    ];

    const isIncome = incomeKeywords.some(k => text.includes(k));

    type = type
      ? type
      : isIncome
        ? "income"
        : "expense";

    // 🔥 garante number válido
    const numericAmount = Number(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: "Valor inválido" });
    }

    const pending = await PendingTransaction.create({
      user: req.userId,
      type,
      description,
      amount: numericAmount,
      source,
      accountId,
      createdAt: new Date()
    });

    return res.status(201).json(pending);

  } catch (err) {
    console.error("Erro createPendingTransaction:", err);
    return res.status(500).json({ message: "Erro interno" });
  }
};

export const getPendingTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const pending = await PendingTransaction.findOne({
      _id: id,
      user: req.userId
    });

    if (!pending) {
      return res.status(404).json({ message: "Pending não encontrado" });
    }

    return res.json(pending);
  } catch (err) {
    console.error("Erro getPendingTransactionById:", err);
    return res.status(500).json({ message: "Erro interno" });
  }
};

// =========================
// 📥 LIST PENDING (opcional)
// =========================
export const listPendingTransactions = async (req, res) => {
  try {
    const pendings = await PendingTransaction.find({
      user: req.userId
    }).sort({ createdAt: -1 });

    return res.json(pendings);
  } catch (err) {
    return res.status(500).json({ message: "Erro interno" });
  }
};

// =========================
// ✅ CONFIRMAR PENDING
// =========================
export const confirmPendingTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { accountId, date } = req.body;

    const pending = await PendingTransaction.findOne({
      _id: id,
      user: req.userId
    });

    if (!pending) {
      return res.status(404).json({ message: "Pending não encontrado" });
    }

    const transaction = await Transaction.create({
      user: req.userId,
      type: pending.type,
      description: pending.description,
      amount: pending.amount,
      accountId,
      date: date || new Date()
    });

    await PendingTransaction.deleteOne({ _id: id });

    return res.json(transaction);

  } catch (err) {
    console.error("Erro confirmPending:", err);
    return res.status(500).json({ message: "Erro interno" });
  }
};

// =========================
// 🧾 LIST
// =========================
export const listTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      user: req.userId
    })
      .populate("categoryId", "name icon color")
      .sort({ date: -1 });

    return res.json(transactions);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Erro interno" });
  }
};

// =========================
// ❌ DELETE
// =========================
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

// =========================
// ❌ DELETE ALL
// =========================
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

// =========================
// 📊 SUMMARY
// =========================
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

// =========================
// 🔍 FILTER
// =========================
export const filterTransactionsByName = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ message: "Nome é obrigatório" });
    }

    const transactions = await Transaction.find({
      user: req.userId,
      description: { $regex: name, $options: "i" }
    }).sort({ date: -1 });

    return res.json(transactions);
  } catch (err) {
    return res.status(500).json({ message: "Erro interno" });
  }
};