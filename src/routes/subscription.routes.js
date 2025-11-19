import { Router } from "express";
import {
  getLoggedInUsersSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscription.controller.js";
import { isLoggedIn } from "../middleware/auth.middleware.js";

const router = Router();
router.use(isLoggedIn); // Apply isLoggedIn middleware to all routes in this file

router.route("/c/:channelId").post(toggleSubscription);

router.route("/user").get(getLoggedInUsersSubscribedChannels);

router.route("/u/:channelId").get(getUserChannelSubscribers);

export default router;
