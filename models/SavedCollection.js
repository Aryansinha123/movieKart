import mongoose from "mongoose";

const SavedCollectionSchema = new mongoose.Schema(
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

SavedCollectionSchema.index({ userId: 1, collectionId: 1 }, { unique: true });

export default mongoose.models.SavedCollection || mongoose.model("SavedCollection", SavedCollectionSchema);
