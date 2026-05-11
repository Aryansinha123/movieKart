import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    movieId: {
      type: Number,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "User",
    },
    username: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: "",
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

ReviewSchema.index({ movieId: 1, userId: 1 }, { unique: true });

export default mongoose.models.Review || mongoose.model("Review", ReviewSchema);

