import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    avatar: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "Movie enthusiast 🎬",
    },

    watchlist: [
      {
        type: Number,
      },
    ],

    watchedMovies: [
      {
        type: Number,
      },
    ],

    favorites: [
      {
        type: Number,
      },
    ],

    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    preferredLanguages: {
      type: [String],
      default: [], // e.g. ["hi", "en", "te", "ta"]
    },

    notInterested: [
      {
        movieId: { type: Number, required: true },
        title: { type: String, required: true },
        genres: [String],
        createdAt: { type: Date, default: Date.now },
      }
    ],
  },
  {
    // Force schema update
    timestamps: true,
  },
);

if (mongoose.models.User) {
  delete mongoose.models.User;
}

export default mongoose.model("User", UserSchema);
