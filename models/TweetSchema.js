import mongoose from "mongoose";

// 🗨️ Comment Subschema
const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 280, // Limit comment size like Twitter
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 🐦 Tweet Schema
const tweetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    mediaUrl: {
      type: String,
    },
    mediaType: {
      type: String, // "image" | "video"
    },
    like: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [commentSchema], // ✅ Embedded comments array
  },
  { timestamps: true }
);

// ⚡ Performance Indexes
tweetSchema.index({ createdAt: -1 }); // Sort by newest tweets first
tweetSchema.index({ "comments.createdAt": -1 }); // Optional: Sort comments by latest if needed

export const Tweet = mongoose.model("Tweet", tweetSchema);
