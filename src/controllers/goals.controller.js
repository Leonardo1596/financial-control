import Goal from '../models/GoalModel.js';

// create
export const createGoal = async (req, res) => {
  try {
    const { name, targetAmount } = req.body;

    const goal = await Goal.create({
      user: req.userId,
      name,
      targetAmount,
    });

    return res.status(201).json(goal);

  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Erro ao criar meta" });
  }
};


// list
export const listGoals = async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.userId, isActive: true })
      .sort({ priority: -1, createdAt: 1 });

    return res.json(goals);

  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Erro ao buscar metas" });
  }
};


// update
export const updateGoal = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await Goal.findOneAndUpdate(
      { _id: id, user: req.userId },
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Meta não encontrada" });
    }

    return res.json(updated);

  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Erro ao atualizar meta" });
  }
};

// add value to goal
export const addValueToGoal = async (req, res) => {
  try {
    const { id } = req.params;
    let { amount } = req.body;

    amount = Number(amount);

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valor inválido" });
    }

    const goal = await Goal.findOne({
      _id: id,
      user: req.userId
    });

    if (!goal) {
      return res.status(404).json({ message: "Meta não encontrada" });
    }

    goal.accumulated.weekly += amount;
    goal.accumulated.monthly += amount;
    goal.accumulated.total += amount;

    await goal.save();

    return res.json(goal);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Erro interno" });
  }
};

// get by id
export const getGoalById = async (req, res) => {
  try {
    const { id } = req.params;

    const goal = await Goal.findOne({ _id: id, user: req.userId, isActive: true });

    if (!goal) {
      return res.status(404).json({ message: "Meta não encontrada" });
    }

    return res.json(goal);

  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Erro ao buscar meta" });
  }
}


// delete (soft delete)
export const deleteGoal = async (req, res) => {
  try {
    const { id } = req.params;

    const goal = await Goal.findOneAndUpdate(
      { _id: id, user: req.userId },
      { isActive: false },
      { new: true }
    );

    if (!goal) {
      return res.status(404).json({ message: "Meta não encontrada" });
    }

    return res.json({ message: "Meta removida com sucesso" });

  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Erro ao deletar meta" });
  }
};

export const removeValueFromGoal = async (req, res) => {
  try {
    const { id } = req.params;
    let { amount } = req.body;

    amount = Number(amount);

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valor inválido" });
    }

    const goal = await Goal.findOne({
      _id: id,
      user: req.userId
    });

    if (!goal) {
      return res.status(404).json({ message: "Meta não encontrada" });
    }

    if (goal.accumulated.total < amount) {
      return res.status(400).json({ message: "Saldo insuficiente na meta" });
    }

    goal.accumulated.weekly = Math.max(0, goal.accumulated.weekly - amount);
    goal.accumulated.monthly = Math.max(0, goal.accumulated.monthly - amount);
    goal.accumulated.total -= amount;

    await goal.save();

    return res.json(goal);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Erro interno" });
  }
};