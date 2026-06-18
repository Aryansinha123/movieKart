import mongoose from "mongoose";

const CuratedCollectionSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    category: { type: String, default: "Curated", index: true },
    tags: [{ type: String }],
    items: [{ type: Number }],
    totalItems: { type: Number, default: 0 },
    mediaType: {
      type: String,
      enum: ["movie", "tv", "mixed"],
      default: "movie",
    },
    createdBy: { type: String, default: "system" },
    featured: { type: Boolean, default: false, index: true },
    popularity: { type: Number, default: 0, index: true },
    coverResolved: { type: Boolean, default: false },
    itemsVersion: { type: Number, default: 1 },
    plannedTitles: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.models.CuratedCollection ||
  mongoose.model("CuratedCollection", CuratedCollectionSchema);
