import AccountPayable from "../models/AccountPayableModel.js";

// 🔧 função interna pra calcular status
function calculateStatus(account) {
  if (account.status === "paga") return "paga";

  const today = new Date();
  const dueDate = new Date(account.dueDate);

  if (dueDate < today) {
    return "atrasada";
  }

  return "pendente";
}

// ✅ Criar conta a pagar
export async function create(req, res) {
  try {
    const {
      description,
      amount,
      dueDate,
      type,
      recurring,
      category
    } = req.body;

    if (!description || !amount || !dueDate) {
      return res.status(400).json({ error: "Campos obrigatórios faltando" });
    }

    const account = await AccountPayable.create({
      userId: req.userId,
      description,
      amount,
      dueDate,
      type: type || "fixa",
      recurring: recurring || false,
      category: category || "Geral"
    });

    return res.status(201).json(account);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar conta a pagar" });
  }
}

// 📋 Listar contas a pagar
export async function list(req, res) {
  try {
    const accounts = await AccountPayable.find({
      userId: req.userId
    }).sort({ dueDate: 1 });

    const updatedAccounts = await Promise.all(
      accounts.map(async account => {
        const newStatus = calculateStatus(account);

        if (newStatus !== account.status) {
          account.status = newStatus;
          await account.save();
        }

        return account;
      })
    );

    return res.json(updatedAccounts);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar contas a pagar" });
  }
}

// 🔍 Buscar conta por ID
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

// 💸 Marcar como paga
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

    // 🔁 cria próxima se for recorrente
    if (account.recurring) {
      const nextDueDate = new Date(account.dueDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);

      await AccountPayable.create({
        userId: account.userId,
        description: account.description,
        amount: account.amount,
        dueDate: nextDueDate,
        type: account.type,
        recurring: true,
        category: account.category
      });
    }

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
