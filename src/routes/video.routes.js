import { Router } from "express";
import {
  deleteVideo,
  getAllVideos,
  getUsersAllVideos,
  getVideoById,
  publishAVideo,
  togglePublishStatus,
  updateVideo,
} from "../controllers/video.controller.js";
import { isLoggedIn } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();
router.use(isLoggedIn); // Apply isLoggedIn middleware to all routes in this file

// Get all videos of a specific user
router.route("/user/:userId").get(getUsersAllVideos);

// Get all videos (for logged-in user dashboard)
router.route("/").get(getAllVideos);

// Upload a video
router.route("/upload").post(
  upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  publishAVideo
);

// Get, update, delete a specific video
router
  .route("/video/:videoId")
  .get(getVideoById)
  .delete(deleteVideo)
  .put(upload.single("thumbnail"), updateVideo);

// Toggle publish status
router.route("/toggle/publish/:videoId").patch(togglePublishStatus);

export default router;
