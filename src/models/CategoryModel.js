import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    icon: {
      type: String,
    },

    color: {
      type: String,
      default: "#6B7280",
    },
  },
  {
    timestamps: true,
  }
);

CategorySchema.index(
  { name: 1, userId: 1, type: 1 },
  { unique: true }
);

export default mongoose.model("Category", CategorySchema);