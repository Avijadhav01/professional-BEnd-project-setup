import { Router } from "express";
import { upload } from "../middleware/multer.middleware.js";
import { isLoggedIn } from "../middleware/auth.middleware.js";

import {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
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
router.route("/watch-history").get(isLoggedIn, getWatchHistory);
router.route("/:username").get(isLoggedIn, getUserChannelProfile);

export default router;
