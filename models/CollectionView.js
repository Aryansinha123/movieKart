import mongoose from "mongoose";

const CollectionViewSchema = new mongoose.Schema(
  {
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
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

// One view record per user per collection
CollectionViewSchema.index({ collectionId: 1, userId: 1 }, { unique: true });

export default mongoose.models.CollectionView ||
  mongoose.model("CollectionView", CollectionViewSchema);
