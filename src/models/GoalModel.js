import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    targetAmount: {
      type: Number,
      required: true
    },

    accumulated: {
      weekly: {
        type: Number,
        default: 0
      },
      monthly: {
        type: Number,
        default: 0
      },
      total: {
        type: Number,
        default: 0
      }
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Goal", goalSchema);