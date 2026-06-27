import mongoose from "mongoose";

const CollectionInviteSchema = new mongoose.Schema(
  {
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
      required: true,
      index: true,
    },
    inviterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    inviteeUsernameOrEmail: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

CollectionInviteSchema.index({ collectionId: 1, inviteeUsernameOrEmail: 1 }, { unique: true });

export default mongoose.models.CollectionInvite ||
  mongoose.model("CollectionInvite", CollectionInviteSchema);
