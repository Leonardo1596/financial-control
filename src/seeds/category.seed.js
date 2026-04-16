import Category from "../models/CategoryModel.js";

const defaultCategories = [
  { name: "Alimentação", type: "expense", isDefault: true },
  { name: "Transporte", type: "expense", isDefault: true },
  { name: "Lazer", type: "expense", isDefault: true },
  { name: "Salário", type: "income", isDefault: true },
  { name: "Outros", type: "expense", isDefault: true },
  { name: "Outross", type: "income", isDefault: true },
  { name: "Serviços", type: "expense", isDefault: true }
];

export const seedCategories = async () => {
  for (const cat of defaultCategories) {
    const exists = await Category.findOne({
      name: cat.name,
      isDefault: true,
    });

    if (!exists) {
      await Category.create(cat);
    }
  }
};