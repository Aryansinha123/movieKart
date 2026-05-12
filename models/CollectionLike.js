import mongoose from "mongoose";

const CollectionLikeSchema = new mongoose.Schema(
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

CollectionLikeSchema.index({ collectionId: 1, userId: 1 }, { unique: true });

export default mongoose.models.CollectionLike || mongoose.model("CollectionLike", CollectionLikeSchema);
