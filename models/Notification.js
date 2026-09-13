import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    senderUsername: {
      type: String,
      default: "MovieKart",
    },
    type: {
      type: String,
      enum: [
        "follow",
        "like",
        "invite",
        "invite_accepted",
        "edit",
        "new_season",
        "new_episode",
        "new_movie_installment",
        "new_part",
      ],
      required: true,
    },
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
    },
    collectionName: {
      type: String,
    },
    movieId: {
      type: Number,
    },
    mediaType: {
      type: String,
      enum: ["movie", "tv"],
    },
    releaseId: {
      type: String,
    },
    releaseType: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    dedupKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
