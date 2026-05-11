import mongoose from "mongoose";

const CollectionSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    movies: [
      {
        type: Number, // TMDB movie id
      },
    ],
  },
  { timestamps: true }
);

CollectionSchema.index({ ownerId: 1, name: 1 }, { unique: false });

export default mongoose.models.Collection || mongoose.model("Collection", CollectionSchema);

