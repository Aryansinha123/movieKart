import mongoose from "mongoose";

const UserAchievementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    unlockedKeys: [{ type: String }],
    notifiedKeys: [{ type: String }],
    featuredKeys: [{ type: String }],
    lastComputedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.UserAchievement ||
  mongoose.model("UserAchievement", UserAchievementSchema);

