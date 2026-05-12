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
    imageUrl: {
      type: String,
      default: "",
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    /** Link-based sharing (read-only view for anyone with the link). */
    shareEnabled: {
      type: Boolean,
      default: false,
    },
    shareToken: {
      type: String,
      default: "",
      index: true,
      sparse: true,
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
CollectionSchema.index({ shareToken: 1 }, { unique: true, sparse: true });

export default mongoose.models.Collection || mongoose.model("Collection", CollectionSchema);

