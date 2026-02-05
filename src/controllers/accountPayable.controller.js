import AccountPayable from "../models/AccountPayableModel.js";

// 🔧 calcula status automaticamente
function calculateStatus(account) {
  if (account.status === "paga") return "paga";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(account.dueDate);
  dueDate.setHours(0, 0, 0, 0);

  if (dueDate < today) return "atrasada";

  return "pendente";
}

// ✅ Criar conta(s) a pagar
export async function create(req, res) {
  try {
    const {
      description,
      amount,
      dueDate,
      type,
      recurring,
      category,
      recurringMonths = 12
    } = req.body;

    if (!description || !amount || !dueDate) {
      return res.status(400).json({ error: "Campos obrigatórios faltando" });
    }

    const baseDueDate = new Date(dueDate);
    const accounts = [];

    // conta principal
    accounts.push({
      userId: req.userId,
      description,
      amount,
      dueDate: baseDueDate,
      type: type || "fixa",
      recurring: !!recurring,
      category: category || "Geral"
    });

    // 🔁 contas futuras
    if (recurring) {
      for (let i = 1; i < recurringMonths; i++) {
        const nextDate = new Date(baseDueDate);
        nextDate.setMonth(baseDueDate.getMonth() + i);

        accounts.push({
          userId: req.userId,
          description,
          amount,
          dueDate: nextDate,
          type: type || "fixa",
          recurring: true,
          category: category || "Geral"
        });
      }
    }

    const created = await AccountPayable.insertMany(accounts);

    return res.status(201).json({
      message: "Conta(s) criada(s) com sucesso",
      created: created.length
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar conta a pagar" });
  }
}

// 📋 Listar contas
export async function list(req, res) {
  try {
    const accounts = await AccountPayable.find({
      userId: req.userId
    }).sort({ dueDate: 1 });

    const updated = await Promise.all(
      accounts.map(async acc => {
        const newStatus = calculateStatus(acc);

        if (newStatus !== acc.status) {
          acc.status = newStatus;
          await acc.save();
        }

        return acc;
      })
    );

    return res.json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar contas" });
  }
}

// 🔍 Buscar por ID
export async function getById(req, res) {
  try {
    const { id } = req.params;

    const account = await AccountPayable.findOne({
      _id: id,
      userId: req.userId
    });

    if (!account) {
      return res.status(404).json({ error: "Conta não encontrada" });
    }

    const newStatus = calculateStatus(account);
    if (newStatus !== account.status) {
      account.status = newStatus;
      await account.save();
    }

    return res.json(account);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar conta" });
  }
}

// ✏️ Atualizar conta
export async function update(req, res) {
  try {
    const { id } = req.params;

    const account = await AccountPayable.findOne({
      _id: id,
      userId: req.userId
    });

    if (!account) {
      return res.status(404).json({ error: "Conta não encontrada" });
    }

    const fields = [
      "description",
      "amount",
      "dueDate",
      "type",
      "recurring",
      "category"
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        account[field] = req.body[field];
      }
    });

    account.status = calculateStatus(account);
    await account.save();

    return res.json(account);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar conta" });
  }
}

// 💸 Marcar como paga (SEM criar duplicada)
export async function pay(req, res) {
  try {
    const { id } = req.params;

    const account = await AccountPayable.findOne({
      _id: id,
      userId: req.userId
    });

    if (!account) {
      return res.status(404).json({ error: "Conta não encontrada" });
    }

    if (account.status === "paga") {
      return res.status(400).json({ error: "Conta já está paga" });
    }

    account.status = "paga";
    account.paidAt = new Date();

    await account.save();

    return res.json(account);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao pagar conta" });
  }
}

// 🗑 Deletar conta
export async function remove(req, res) {
  try {
    const { id } = req.params;

    const account = await AccountPayable.findOneAndDelete({
      _id: id,
      userId: req.userId
    });

    if (!account) {
      return res.status(404).json({ error: "Conta não encontrada" });
    }

    return res.json({ message: "Conta removida com sucesso" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao remover conta" });
  }
}