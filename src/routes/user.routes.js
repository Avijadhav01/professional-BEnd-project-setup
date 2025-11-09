import { Router } from "express";
import { upload } from "../middleware/multer.middleware.js";
import { isLoggedIn } from "../middleware/auth.middleware.js";

import {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  getUserChannelProfile,
} from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

router.route("/logout").post(isLoggedIn, logOutUser);

router.route("/refresh").post(refreshAccessToken);

router.route("/:username").get(isLoggedIn, getUserChannelProfile);

export default router;
