import AccountModel from '../models/AccountModel.js';

export async function create(req, res) {
    try {
        const { name, balance } = req.body;

        console.log("name:", name);
        console.log("balance:", balance);

        if (!name || balance === undefined) {
            return res.status(400).json({ error: "Campos obrigatórios faltando" });
        }

        const account = await AccountModel.create({
            userId: req.userId,
            name,
            balance
        });

        res.status(201).json(account);
    } catch (error) {
        console.error("Erro ao criar conta:", error);
        res.status(500).json({ error: "Erro ao criar conta" });
    }
};

export const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await AccountModel.findOneAndDelete({
      _id: id,
      userId: req.userId
    });

    if (!account) {
      return res.status(404).json({ message: "Conta não encontrada" });
    }

    return res.json({ message: "Conta removida" });
  } catch (err) {
    return res.status(500).json({ message: "Erro interno" });
  }
}


export const listAccounts = async (req, res) => {
  try {
    const accounts = await AccountModel.find({
      userId: req.userId
    }).sort({ name: 1 });

    return res.json(accounts);
  } catch (err) {
    return res.status(500).json({ message: "Erro interno" });
  }
};