import express from "express";
import {
  login,
  Register,
  logout,
  bookmarks,
  getMyProfile,
  getOthersUsers,
  followUnfollow,
  getBookmarkedTweets,
  updateProfile,
} from "../controllers/userControllers.js";
import { isAuthenticated } from "../config/auth.js";
import { upload } from "../middleware/multer.js";

const router = express.Router();

router.route("/register").post(Register);
router.route("/login").post(login);
router.route("/logout").post(logout);
router.route("/bookmarks/:tweetId").put(isAuthenticated, bookmarks);
router.route("/profile/:id").get(isAuthenticated, getMyProfile);
router.route("/other-user/:id").get(isAuthenticated, getOthersUsers);
router.route("/follow-unfollow/:id").post(isAuthenticated, followUnfollow);
router.route("/bookmarks").get(isAuthenticated, getBookmarkedTweets); // ✅ new route
router.route("/edit-profile").put(
  isAuthenticated,
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  updateProfile
);
export default router;
