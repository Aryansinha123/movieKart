import mongoose from "mongoose";

const ReviewLikeSchema = new mongoose.Schema(
  {
    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

ReviewLikeSchema.index({ reviewId: 1, userId: 1 }, { unique: true });

export default mongoose.models.ReviewLike || mongoose.model("ReviewLike", ReviewLikeSchema);
