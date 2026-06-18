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
  },
  { timestamps: true }
);

UserCuratedCollectionSchema.index({ userId: 1, curatedCollectionId: 1 }, { unique: true });

export default mongoose.models.UserCuratedCollection ||
  mongoose.model("UserCuratedCollection", UserCuratedCollectionSchema);
