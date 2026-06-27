import mongoose from "mongoose";

const CollectionFollowSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

CollectionFollowSchema.index({ userId: 1, collectionId: 1 }, { unique: true });

export default mongoose.models.CollectionFollow ||
  mongoose.model("CollectionFollow", CollectionFollowSchema);
