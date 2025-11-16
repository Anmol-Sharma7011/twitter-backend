import { Tweet } from "../models/TweetSchema.js";
import { User } from "../models/UserSchema.js";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";

export const createTweet = async (req, res) => {
  try {
    const { description } = req.body;

    // ✅ Check that at least one input exists (text OR media)
    if (!description && !req.file) {
      return res.status(400).json({
        success: false,
        message: "Please provide text or media for your tweet",
      });
    }

    // 🧠 Find the logged-in user
    const user = await User.findById(req.userId).select("name username avatar");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let mediaUrl = null;
    let mediaType = null;

    // 🖼️ Upload media if present
    // if (req.file) {
    //   const uploaded = await cloudinary.uploader.upload(req.file.path, {
    //     resource_type: "auto",
    //   });
    //   mediaUrl = uploaded.secure_url;
    //   mediaType = req.file.mimetype.startsWith("video") ? "video" : "image";
    // }
    if (req.file) {
  const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

  const uploaded = await cloudinary.uploader.upload(base64, {
    resource_type: "auto",
  });

  mediaUrl = uploaded.secure_url;
  mediaType = req.file.mimetype.startsWith("video") ? "video" : "image";
}


    // 🧩 Create new tweet
    const newTweet = new Tweet({
      description,
      userId: user._id,
      userDetails: [
        {
          _id: user._id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
        },
      ],
      mediaUrl,
      mediaType,
    });

    await newTweet.save();

    return res.status(201).json({
      success: true,
      message: "Tweet created successfully",
      tweet: newTweet,
    });
  } catch (error) {
    console.error("createTweet error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating tweet",
    });
  }
};

export const deleteTweet = async (req, res) => {
  try {
    const { id } = req.params;
    await Tweet.findByIdAndDelete(id);
    return res.status(201).json({
      message: "Tweet deleted successfully ",
      success: true,
    });
  } catch (error) {
    console.log(error);
    return res.status(401).json({
      message: "Error while deleting tweet ",
      success: false,
    });
  }
};

export const likeOrDislike = async (req, res) => {
  try {
    const loggedInUserId = req.body.id;
    const tweetId = req.params.id;

    if (!loggedInUserId) {
      return res.status(400).json({
        message: "User ID is required",
        success: false,
      });
    }
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
      return res.status(404).json({
        message: "Tweet not found",
        success: false,
      });
    }
    if (tweet.like.includes(loggedInUserId)) {
      // dislike
      await Tweet.findByIdAndUpdate(tweetId, {
        $pull: { like: loggedInUserId },
      });
      return res.status(200).json({
        message: "Tweet disliked successfully",
        success: true,
      });
    } else {
      await Tweet.findByIdAndUpdate(tweetId, {
        $push: { like: loggedInUserId },
      });
      return res.status(200).json({
        message: "Tweet liked successfully",
        success: true,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      message: "Tweet Liked or disliked unsuccessfully",
      success: false,
    });
  }
};

export const getAllTweets = async (req, res) => {
  try {
    const loggedInUserId = req.params.id;
    if (!loggedInUserId) {
      return res.status(400).json({
        message: "User ID is required",
        success: false,
      });
    }

    // 1️⃣ Find logged-in user
    const user = await User.findById(loggedInUserId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    // 2️⃣ Combine user's ID and following IDs
    const idsToFetch = [loggedInUserId, ...user.following].map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    // 3️⃣ Pagination setup
    const page = parseInt(req.query.page) || 1; // default page = 1
    const limit = parseInt(req.query.limit) || 10; // default limit = 10
    const skip = (page - 1) * limit; // how many docs to skip

    // 4️⃣ Fetch tweets of logged-in user + following
    const tweets = await Tweet.find({ userId: { $in: idsToFetch } })
      .populate("userId", "name username avatar") // include user info
      .sort({ createdAt: -1 }) // newest first
      .skip(skip)
      .limit(limit);

    // 5️⃣ Get total count for pagination
    const totalTweets = await Tweet.countDocuments({
      userId: { $in: idsToFetch },
    });

    // 6️⃣ Send response
    return res.status(200).json({
      message: "Tweets fetched successfully",
      success: true,
      currentPage: page,
      totalPages: Math.ceil(totalTweets / limit),
      count: tweets.length,
      tweets,
    });
  } catch (error) {
    console.log("Error fetching tweets:", error);
    return res.status(500).json({
      message: "Error fetching tweets",
      success: false,
      error: error.message,
    });
  }
};

export const getFollowingTweets = async (req, res) => {
  try {
    const loggedInUserId = req.params.id;
    if (!loggedInUserId) {
      return res.status(400).json({
        message: "User ID is required",
        success: false,
      });
    }

    // 1️⃣ Find logged-in user
    const user = await User.findById(loggedInUserId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    // 2️⃣ Combine user's ID and following IDs
    const idsToFetch = [...user.following].map(
      (id) => new mongoose.Types.ObjectId(id)
    );
    // If user follows no one, return empty
    if (idsToFetch.length === 0) {
      return res.status(200).json({
        message: "You are not following anyone yet.",
        success: true,
        currentPage: 1,
        totalPages: 0,
        count: 0,
        tweets: [],
      });
    }

    // 3️⃣ Pagination setup
    const page = parseInt(req.query.page) || 1; // default page = 1
    const limit = parseInt(req.query.limit) || 10; // default limit = 10
    const skip = (page - 1) * limit; // how many docs to skip

    // 4️⃣ Fetch tweets of logged-in user + following
    const tweets = await Tweet.find({ userId: { $in: idsToFetch } })
      .populate("userId", "name username avatar") // include user info
      .sort({ createdAt: -1 }) // newest first
      .skip(skip)
      .limit(limit);

    // 5️⃣ Get total count for pagination
    const totalTweets = await Tweet.countDocuments({
      userId: { $in: idsToFetch },
    });

    // 6️⃣ Send response
    return res.status(200).json({
      message: "Tweets fetched successfully",
      success: true,
      currentPage: page,
      totalPages: Math.ceil(totalTweets / limit),
      count: tweets.length,
      tweets,
    });
  } catch (error) {
    console.log("Error fetching tweets:", error);
    return res.status(500).json({
      message: "Error fetching tweets",
      success: false,
      error: error.message,
    });
  }
};

// 🗨️ Add a new comment to a tweet
export const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const tweetId = req.params.tweetId;
    const userId = req.user; // ✅ from isAuthenticated middleware

    if (!text?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment text cannot be empty",
      });
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
      return res.status(404).json({
        success: false,
        message: "Tweet not found",
      });
    }

    // 🧱 Add the new comment
    const newComment = {
      user: userId,
      text,
      createdAt: new Date(),
    };

    tweet.comments.push(newComment);
    await tweet.save();

    // Optional: populate user info for frontend
    const populatedTweet = await Tweet.findById(tweetId).populate(
      "comments.user",
      "name username avatar"
    );

    return res.status(200).json({
      success: true,
      message: "Comment added successfully",
      tweet: populatedTweet,
    });
  } catch (error) {
    console.error("Add comment error:", error);
    return res.status(500).json({
      success: false,
      message: "Error adding comment",
      error: error.message,
    });
  }
};

// 🧾 Get all comments for a specific tweet
export const getComments = async (req, res) => {
  try {
    const tweetId = req.params.tweetId;

    const tweet = await Tweet.findById(tweetId).populate(
      "comments.user",
      "name username avatar"
    );

    if (!tweet) {
      return res.status(404).json({
        success: false,
        message: "Tweet not found",
      });
    }

    // Sort comments by latest (newest first)
    const sortedComments = tweet.comments.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.status(200).json({
      success: true,
      comments: sortedComments,
      count: sortedComments.length,
    });
  } catch (error) {
    console.error("Get comments error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching comments",
      error: error.message,
    });
  }
};

export const getUserTweets = async (req, res) => {
  try {
    const { id } = req.params; // userId from route

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // 🧠 Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 📝 Fetch tweets for this user only
    const tweets = await Tweet.find({ userId: id })
      .populate("userId", "name username avatar")
      .sort({ createdAt: -1 }) // latest first
      .skip(skip)
      .limit(limit);

    const totalTweets = await Tweet.countDocuments({ userId: id });

    return res.status(200).json({
      success: true,
      message: "User tweets fetched successfully",
      currentPage: page,
      totalPages: Math.ceil(totalTweets / limit),
      count: tweets.length,
      tweets,
    });
  } catch (error) {
    console.error("Error fetching user tweets:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching user tweets",
      error: error.message,
    });
  }
};

// 🗑 Delete a comment
export const deleteComment = async (req, res) => {
  try {
    const { tweetId, commentId } = req.params;
    const userId = req.user; // from auth middleware

    if (!tweetId || !commentId) {
      return res.status(400).json({
        success: false,
        message: "Tweet ID and Comment ID are required",
      });
    }

    // Find the tweet
    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
      return res.status(404).json({
        success: false,
        message: "Tweet not found",
      });
    }

    // Find the requested comment
    const comment = tweet.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Allow delete ONLY IF:
    // 1️⃣ User is the comment owner
    // 2️⃣ User is the tweet owner
    if (
      String(comment.user) !== String(userId) &&
      String(tweet.userId) !== String(userId)
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this comment",
      });
    }

    // Delete comment
    comment.deleteOne(); // removes the subdocument
    await tweet.save();

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
      comments: tweet.comments,
    });
  } catch (error) {
    console.error("Delete comment error:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting comment",
      error: error.message,
    });
  }
};
