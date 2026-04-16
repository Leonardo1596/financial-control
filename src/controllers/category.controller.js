import Category from "../models/CategoryModel.js";

export const createCategory = async (req, res) => {
  try {
    const { name, type, icon, color } = req.body;
    const userId = req.userId; // assumindo que tu tem auth middleware

    const category = await Category.create({
      name,
      type,
      icon,
      color,
      userId,
      isDefault: false,
    });

    return res.status(201).json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Categoria já existe",
      });
    }
    console.error(error);
    return res.status(500).json({
      message: "Erro ao criar categoria",
    });
  }
};

export const getCategories = async (req, res) => {
  try {
    const userId = req.userId;

    const categories = await Category.find({
      $or: [{ isDefault: true }, { userId }],
    }).sort({ name: 1 });

    return res.json(categories);
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao buscar categorias",
    });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const category = await Category.findOne({
      _id: id,
      $or: [{ isDefault: true }, { userId }],
    });

    if (!category) {
      return res.status(404).json({
        message: "Categoria não encontrada",
      });
    }

    return res.json(category);
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao buscar categoria",
    });
  }
}

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const category = await Category.findOneAndUpdate(
      { _id: id, userId }, // só atualiza se for do usuário
      req.body,
      { new: true }
    );

    if (!category) {
      return res.status(404).json({
        message: "Categoria não encontrada",
      });
    }

    return res.json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Categoria já existe",
      });
    }

    return res.status(500).json({
      message: "Erro ao atualizar categoria",
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const category = await Category.findOne({
      _id: id,
      userId,
    });

    if (!category) {
      return res.status(404).json({
        message: "Categoria não encontrada",
      });
    }

    if (category.isDefault) {
      return res.status(400).json({
        message: "Não é possível deletar categorias padrão",
      });
    }

    await category.deleteOne();

    return res.json({
      message: "Categoria deletada com sucesso",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao deletar categoria",
    });
  }
};