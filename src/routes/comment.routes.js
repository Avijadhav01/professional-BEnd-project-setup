import { Router } from "express";
import {
  addComment,
  deleteComment,
  getVideoComments,
  updateComment,
} from "../controllers/comment.controller.js";
import { isLoggedIn } from "../middleware/auth.middleware.js";

const router = Router();

router.use(isLoggedIn); // Apply isLoggedIn middleware to all routes in this file

router.route("/c/:videoId").get(getVideoComments).post(addComment);

router.route("/:commentId").delete(deleteComment).patch(updateComment);

export default router;
