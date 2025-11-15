import express from "express";
import {
  createTweet,
  deleteTweet,
  getAllTweets,
  getFollowingTweets,
  likeOrDislike,
  getComments,
  addComment,
  getUserTweets,
  deleteComment,
} from "../controllers/tweetControllers.js";
import { isAuthenticated } from "../config/auth.js";
import { upload } from "../middleware/multer.js";

const router = express.Router();

router
  .route("/create")
  .post(isAuthenticated, upload.single("media"), createTweet);
router.route("/delete/:id").delete(isAuthenticated, deleteTweet);
router.route("/like/:id").put(isAuthenticated, likeOrDislike);
router.route("/all-tweets/:id").get(isAuthenticated, getAllTweets);
router
  .route("/all-following-tweets/:id")
  .get(isAuthenticated, getFollowingTweets);

router.post("/:tweetId/comment", isAuthenticated, addComment);
router.get("/:tweetId/comments", isAuthenticated, getComments);
router.get("/user/:id", getUserTweets);
router.delete("/comment/:tweetId/:commentId", isAuthenticated, deleteComment);

export default router;
