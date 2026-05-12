import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: ["review", "collection"],
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    username: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    /** Null for top-level; points to another Comment on the same target. */
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

CommentSchema.index({ targetType: 1, targetId: 1, createdAt: 1 });

export default mongoose.models.Comment || mongoose.model("Comment", CommentSchema);
