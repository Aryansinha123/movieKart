import mongoose from "mongoose";

const UserCuratedCollectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    curatedCollectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CuratedCollection",
      required: true,
      index: true,
    },
    /** Personal watch order / additions — does not affect the global curated list. */
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

UserCuratedCollectionSchema.index({ userId: 1, curatedCollectionId: 1 }, { unique: true });

export default mongoose.models.UserCuratedCollection ||
  mongoose.model("UserCuratedCollection", UserCuratedCollectionSchema);
