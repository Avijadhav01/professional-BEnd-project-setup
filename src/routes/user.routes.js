import { Router } from "express";
import { upload } from "../middleware/multer.middleware.js";
import { isLoggedIn } from "../middleware/auth.middleware.js";

const router = Router();

import {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
} from "../controllers/user.controller.js";

router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);
router.route("/login").post(loginUser);
// secured routes
router.route("/logout").post(isLoggedIn, logOutUser);
router.route("/refresh").post(refreshAccessToken);

export default router;
