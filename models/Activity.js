import mongoose from "mongoose";

const ActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
        "collection_add",    // added a movie to a collection
        "review",            // wrote/updated a review
        "watchlist_add",     // added a movie to watchlist
        "watched_add",       // marked a movie as watched
      ],
      required: true,
      index: true,
    },
    movieId: {
      type: Number,
      required: true,
    },
    // Extra context depending on type
    meta: {
      collectionName: String,
      collectionId: String,
      rating: Number,
      comment: String,
    },
  },
  { timestamps: true }
);

// Feed query: get activities from followed users, newest first
ActivitySchema.index({ userId: 1, createdAt: -1 });
ActivitySchema.index({ createdAt: -1 });

export default mongoose.models.Activity || mongoose.model("Activity", ActivitySchema);
