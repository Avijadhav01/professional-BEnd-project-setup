import { Router } from "express";
import { upload } from "../middleware/multer.middleware.js";
import { isLoggedIn } from "../middleware/auth.middleware.js";

import {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  getUserChannelProfile,
  getWatchHistory,
} from "../controllers/user.controller.js";

const router = Router();

// Register
router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

// Login / Logout / Refresh
router.route("/login").post(loginUser);
router.route("/logout").post(isLoggedIn, logOutUser);
router.route("/refresh").post(refreshAccessToken);

// User-related routes
router.route("/change-password").post(isLoggedIn, changeCurrentPassword);

router.route("/me").get(isLoggedIn, getCurrentUser);

router.route("/update-account-details").post(isLoggedIn, updateAccountDetails);

router
  .route("/update-avatar")
  .post(isLoggedIn, upload.single("avatar"), updateUserAvatar);

router.route("/c/:username").get(isLoggedIn, getUserChannelProfile);

router.route("/watch-history").get(isLoggedIn, getWatchHistory);

export default router;
