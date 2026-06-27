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
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    /** Wide banner displayed on collection detail page. */
    bannerUrl: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
      maxlength: 500,
    },
    category: {
      type: String,
      default: "Custom",
      trim: true,
    },
    bannerStyle: {
      gradient: { type: String, default: "" },
      themeColor: { type: String, default: "" },
      autoGenerate: { type: Boolean, default: false },
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    visibility: {
      type: String,
      enum: ["public", "unlisted", "private", "collaborative_private"],
      default: "private",
      index: true,
    },
    collaborators: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["collaborator"],
          default: "collaborator",
        },
        invitedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    views: {
      type: Number,
      default: 0,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    followersCount: {
      type: Number,
      default: 0,
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

CollectionSchema.pre("save", async function (next) {
  // Sync isPublic with visibility for compatibility
  this.isPublic = this.visibility === "public";

  if (!this.slug || this.isModified("name")) {
    let baseSlug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    if (!baseSlug) baseSlug = "collection";

    let uniqueSlug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await mongoose.models.Collection.findOne({
        slug: uniqueSlug,
        _id: { $ne: this._id },
      });
      if (!existing) {
        this.slug = uniqueSlug;
        break;
      }
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }
  }
  next();
});

export default mongoose.models.Collection || mongoose.model("Collection", CollectionSchema);
