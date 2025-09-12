import { Router } from "express";
import registerUser from "../controllers/user.controller.js";
import { upload } from "../middleware/multer.middleware.js"; // to send the images on cloudinary

const router = Router();

router.route("/register").post(
  upload.fields([
    // here we injected the multer middleware to upload the images on server
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

export default router;
