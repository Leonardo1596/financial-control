import MonthlySummary from "../models/MonthlySummaryModel.js";
import Transaction from "../models/TransactionModel.js";

export async function closeMonth(req, res) {
  try {
    const userId = req.userId;
    const { month, year } = req.body;

    console.log(req.userId);
    if (!userId) {
      return res.status(401).json({
        message: "Usuário não autenticado",
      });
    }

    if (!month || !year) {
      return res.status(400).json({
        message: "Mês e ano são obrigatórios",
      });
    }

    const m = Number(month);
    const y = Number(year);

    if (m < 1 || m > 12 || y < 2000) {
      return res.status(400).json({
        message: "Período inválido",
      });
    }

    // Month date range (UTC)
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(y, m, 0, 23, 59, 59));

    // Prevent closing the same month twice
    const alreadyClosed = await MonthlySummary.findOne({
      user: userId,
      month: m,
      year: y,
    });

    if (alreadyClosed) {
      return res.status(409).json({
        message: "Este mês já foi fechado",
        summary: alreadyClosed,
      });
    }

    // Fetch all transactions for the given month
    const transactions = await Transaction.find({
      user: userId,
      date: {
        $gte: start,
        $lte: end,
      },
    });

    if (transactions.length === 0) {
      return res.status(400).json({
        message: "Nenhuma transação encontrada para este mês",
      });
    }

    let income = 0;
    let expense = 0;

    // Sum income and expenses
    for (const t of transactions) {
      if (t.type === "income") {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    }

    // Create monthly summary snapshot
    const summary = await MonthlySummary.create({
      user: userId,
      month: m,
      year: y,
      income,
      expense,
      balance: income - expense,
      closedAt: new Date(),
    });

    return res.json({
      message: "Mês fechado com sucesso",
      summary,
    });
  } catch (err) {
    console.error("Error closing month:", err);

    if (err.code === 11000) {
      return res.status(409).json({
        message: "Este mês já foi fechado anteriormente",
      });
    }

    return res.status(500).json({
      message: "Erro ao fechar o mês",
    });
  }
}

export async function getMonthlySummary(req, res) {
  try {
    const userId = req.userId;
    const { month, year } = req.query;

    if (!userId) {
      return res.status(401).json({
        message: "Usuário não autenticado",
      });
    }

    if (!month || !year) {
      return res.status(400).json({
        message: "Mês e ano são obrigatórios",
      });
    }

    const m = Number(month);
    const y = Number(year);

    if (m < 1 || m > 12 || y < 2000) {
      return res.status(400).json({
        message: "Período inválido",
      });
    }

    const summary = await MonthlySummary.findOne({
      user: userId,
      month: m,
      year: y,
    });

    if (!summary) {
      return res.status(404).json({
        message: "Resumo mensal não encontrado para este período",
      });
    }

    return res.json({
      summary,
    });
  } catch (err) {
    console.error("Error fetching monthly summary:", err);
    return res.status(500).json({
      message: "Erro ao buscar o resumo mensal",
    });
  }
}