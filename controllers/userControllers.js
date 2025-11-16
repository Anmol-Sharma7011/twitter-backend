import jwt from "jsonwebtoken";
import { User } from "../models/UserSchema.js";
import { Tweet } from "../models/TweetSchema.js";
import bcryptjs from "bcryptjs";
import mongoose from "mongoose";
import cloudinary from "cloudinary"; // optional if you add image upload

export const Register = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!name || !username || !email || !password) {
      return res.status(401).json({
        message: "All fields are required.",
        success: false,
      });
    }
    const user = await User.findOne({ email });
    if (user) {
      return res.status(401).json({
        message: "User already exists",
        success: false,
      });
    }
    const hashedPassword = await bcryptjs.hash(password, 10); // 16 is salt value
    await User.create({
      name,
      username,
      email,
      password: hashedPassword, // password
    });
    return res.status(201).json({
      message: "User registered successfully , Account created",
      success: true,
    });
  } catch (error) {
    console.error("❌ Register error:", error.message);
    console.error(error.stack);
    return res.status(500).json({
      message: "Server error, please try again later",
      success: false,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "All fields are required",
        success: false,
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const isPasswordMatched = await bcryptjs.compare(password, user.password);

    if (!isPasswordMatched) {
      return res.status(401).json({
        message: "Incorrect credentials",
        success: false,
      });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    // return res
    //   .status(200)
    //   .cookie("token", token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 })
    //   .json({
    //     message: `Welcome back ${user.name}`,
    //     user,
    //     success: true,
    //   });
    const isProd = process.env.NODE_ENV === "production";

return res
  .status(200)
  .cookie("token", token, { 
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    secure: isProd,               // ✔ Important for Render
    sameSite: isProd ? "none" : "lax", // ✔ Required for cross-site cookies
  })
  .json({
    message: `Welcome back ${user.name}`,
    user,
    success: true,
  });

  } catch (error) {
    console.log("login error", error);
    return res.status(500).json({
      message: "Login failed",
      success: false,
    });
  }
};

export const logout = async (req, res) => {
  return res
    .status(200)
    .cookie("token", "", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      expires: new Date(0),
    })
    .json({
      message: "Logout successful",
      success: true,
    });
};

export const bookmarks = async (req, res) => {
  try {
    const loggedInUserId = req.body.id;
    const tweetId = req.params.tweetId;

    if (!loggedInUserId || !tweetId) {
      return res.status(400).json({
        message: "User ID and Tweet ID are required",
        success: false,
      });
    }

    const tweetObjectId = new mongoose.Types.ObjectId(tweetId);
    const user = await User.findById(loggedInUserId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const isBookmarked = user.bookmarks.some(
      (id) => id.toString() === tweetObjectId.toString()
    );

    let updatedUser;

    if (isBookmarked) {
      updatedUser = await User.findByIdAndUpdate(
        loggedInUserId,
        { $pull: { bookmarks: tweetObjectId } },
        { new: true }
      );
      return res.status(200).json({
        message: "Bookmark removed successfully",
        success: true,
        action: "removed",
        bookmarks: updatedUser.bookmarks,
      });
    } else {
      updatedUser = await User.findByIdAndUpdate(
        loggedInUserId,
        { $addToSet: { bookmarks: tweetObjectId } },
        { new: true }
      );
      return res.status(200).json({
        message: "Bookmark added successfully",
        success: true,
        action: "added",
        bookmarks: updatedUser.bookmarks,
      });
    }
  } catch (error) {
    console.error("Bookmark toggle error:", error);
    return res.status(500).json({
      message: "Error toggling bookmark",
      success: false,
      error: error.message,
    });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findById(id).select("-password");
    return res.status(200).json({
      user,
      message: "true",
    });
  } catch (error) {
    console.log(error);
  }
};

export const getOthersUsers = async (req, res) => {
  try {
    const { id } = req.params;
    const otherUsers = await User.find({ _id: { $ne: id } }).select(
      "-password"
    );
    if (!otherUsers) {
      return res.status(402).json({
        message: "Currently don't have any other user",
      });
    }
    return res.status(200).json({
      otherUsers,
      message: "true",
    });
  } catch (error) {
    console.log(error);
  }
};

export const followUnfollow = async (req, res) => {
  try {
    const loggedInUserId = req.body.id;
    const userId = req.params.id;

    // 🧩 1. Basic validation
    if (!loggedInUserId || !userId) {
      return res.status(400).json({
        message: "User ID and Target User ID are required",
        success: false,
      });
    }

    // 🧩 2. Prevent self-follow
    if (loggedInUserId === userId) {
      return res.status(400).json({
        message: "You cannot follow yourself",
        success: false,
      });
    }

    // 🧩 3. Find both users
    const loggedInUser = await User.findById(loggedInUserId);
    const user = await User.findById(userId);

    if (!loggedInUser || !user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    // 🧩 4. Check if already following
    const isAlreadyFollowing = user.followers.some(
      (followerId) => followerId.toString() === loggedInUserId
    );

    if (isAlreadyFollowing) {
      // 🧭 Unfollow
      await user.updateOne({ $pull: { followers: loggedInUserId } });
      await loggedInUser.updateOne({ $pull: { following: userId } });

      return res.status(200).json({
        message: `${loggedInUser.name} unfollowed ${user.name}`,
        success: true,
        action: "unfollowed",
      });
    } else {
      // 🧭 Follow
      await user.updateOne({ $addToSet: { followers: loggedInUserId } });
      await loggedInUser.updateOne({ $addToSet: { following: userId } });

      return res.status(200).json({
        message: `${loggedInUser.name} followed ${user.name}`,
        success: true,
        action: "followed",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error toggling follow status",
      success: false,
      error: error.message,
    });
  }
};

export const getBookmarkedTweets = async (req, res) => {
  try {
    const userId = req.userId; // ✅ from isAuthenticated middleware

    if (!userId) {
      return res.status(400).json({
        message: "User ID is missing",
        success: false,
      });
    }

    // 🧭 Pagination setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // ✅ Find user and fetch only bookmark IDs first (for performance)
    const user = await User.findById(userId).select("bookmarks");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    if (user.bookmarks.length === 0) {
      return res.status(200).json({
        message: "No bookmarked tweets yet",
        success: true,
        currentPage: page,
        totalPages: 0,
        count: 0,
        tweets: [],
      });
    }

    // ⚡ Fetch only paginated bookmarked tweets (reverse order for latest first)
    const tweets = await Tweet.find({
      _id: { $in: user.bookmarks },
    })
      .populate("userId", "name username avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // ✅ Calculate total pages
    const totalTweets = user.bookmarks.length;
    const totalPages = Math.ceil(totalTweets / limit);

    return res.status(200).json({
      message: "Bookmarked tweets fetched successfully",
      success: true,
      currentPage: page,
      totalPages,
      count: tweets.length,
      tweets,
    });
  } catch (error) {
    console.error("Error fetching bookmarked tweets:", error);
    return res.status(500).json({
      message: "Error fetching bookmarked tweets",
      success: false,
      error: error.message,
    });
  }
};

// ✅ Update user profile (text + avatar + banner)
// ✅ Update user profile (text + avatar + banner)
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user; // from isAuthenticated middleware

    if (!userId) {
      return res.status(401).json({
        message: "User not authenticated",
        success: false,
      });
    }

    // Fields from body
    const { name, username, email, bio } = req.body;
    let avatar = req.body.avatar;
    let banner = req.body.banner;

    // 🚀 File uploads using memoryStorage + Cloudinary
    if (req.files) {
      // Avatar upload
      if (req.files.avatar && req.files.avatar[0]) {
        const file = req.files.avatar[0];
        const base64 = `data:${file.mimetype};base64,${file.buffer.toString(
          "base64"
        )}`;

        const uploaded = await cloudinary.v2.uploader.upload(base64, {
          folder: "profile_avatars",
          resource_type: "auto",
        });

        avatar = uploaded.secure_url;
      }

      // Banner upload
      if (req.files.banner && req.files.banner[0]) {
        const file = req.files.banner[0];
        const base64 = `data:${file.mimetype};base64,${file.buffer.toString(
          "base64"
        )}`;

        const uploaded = await cloudinary.v2.uploader.upload(base64, {
          folder: "profile_banners",
          resource_type: "auto",
        });

        banner = uploaded.secure_url;
      }
    }

    // Build update payload
    const updatedFields = {};
    if (name) updatedFields.name = name;
    if (username) updatedFields.username = username;
    if (email) updatedFields.email = email;
    if (bio) updatedFields.bio = bio;
    if (avatar) updatedFields.avatar = avatar;
    if (banner) updatedFields.banner = banner;

    // Update user in DB
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updatedFields },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      success: true,
      user: updatedUser,
    });

  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({
      message: "Error updating profile",
      success: false,
      error: error.message,
    });
  }
};
