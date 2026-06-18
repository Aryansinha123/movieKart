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
    /** Personal watch order / additions for saved community collections. */
    personalItems: [{ type: Number }],
    personalBannerUrl: { type: String, default: "" },
    bannerStyle: {
      gradient: { type: String, default: "" },
      themeColor: { type: String, default: "" },
      autoGenerate: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

SavedCollectionSchema.index({ userId: 1, collectionId: 1 }, { unique: true });

export default mongoose.models.SavedCollection || mongoose.model("SavedCollection", SavedCollectionSchema);
