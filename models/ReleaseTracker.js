import mongoose from "mongoose";

const ReleaseTrackerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    tmdbId: {
      type: Number,
      required: true,
    },

    mediaType: {
      type: String,
      enum: ["movie", "tv"],
      required: true,
    },

    title: {
      type: String,
      default: "",
    },

    trackedSources: {
      watchlist: { type: Boolean, default: false },
      favorite: { type: Boolean, default: false },
      watched: { type: Boolean, default: false },
      collection: { type: Boolean, default: false },
    },

    lastKnownSeason: {
      type: Number,
      default: 0,
    },

    lastKnownEpisodeCount: {
      type: Number,
      default: 0,
    },

    lastKnownReleaseDate: {
      type: Date,
    },

    knownSeasonIds: [
      {
        type: Number,
      },
    ],

    knownEpisodeIds: [
      {
        type: Number,
      },
    ],

    knownCollectionId: {
      type: Number,
    },

    knownCollectionMovieIds: [
      {
        type: Number,
      },
    ],

    lastCheckedAt: {
      type: Date,
      default: Date.now,
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

ReleaseTrackerSchema.index({ userId: 1, tmdbId: 1, mediaType: 1 }, { unique: true });
ReleaseTrackerSchema.index({ tmdbId: 1, mediaType: 1, active: 1 });

export default mongoose.models.ReleaseTracker ||
  mongoose.model("ReleaseTracker", ReleaseTrackerSchema);
