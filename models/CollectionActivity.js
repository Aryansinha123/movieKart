import mongoose from "mongoose";

const CollectionActivitySchema = new mongoose.Schema(
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
    },
    username: {
      type: String,
      required: true,
    },
    userAvatar: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: [
        "movie_added",
        "movie_removed",
        "reordered",
        "description_updated",
        "banner_updated",
        "invite_accepted",
        "collaborator_added",
        "collaborator_removed",
      ],
      required: true,
    },
    meta: {
      movieId: Number,
      movieTitle: String,
      details: String,
    },
  },
  { timestamps: true }
);

CollectionActivitySchema.index({ collectionId: 1, createdAt: -1 });

export default mongoose.models.CollectionActivity ||
  mongoose.model("CollectionActivity", CollectionActivitySchema);
