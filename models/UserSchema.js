import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    // 🖼️ New Fields
    avatar: { type: String, default: "" },
    banner: { type: String, default: "" },
    bio: {
      type: String,
      maxlength: 200,
      default: "Hey there! I'm using this app 😎",
    },

    followers: { type: Array, default: [] },
    following: { type: Array, default: [] },
    bookmarks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tweet",
      },
    ],
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
