import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../model/Video.model.js";
import { Subscription } from "../model/subscription.model.js";
import { Like } from "../model/like.model.js";
import { User } from "../model/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";

// logged in user's dashbord it is private
const getChannelStats = AsyncHandler(async (req, res) => {
  // Logged-in user's channel ID
  const channelObjectId = req.user._id;

  // Count subscribers for logged-in user's channel
  const totalSubscribers = await Subscription.countDocuments({
    channel: channelObjectId,
  });

  // Get user's videos
  const videos = await Video.find({ owner: channelObjectId }).select(
    "_id views"
  );

  // Get logged-in user's profile info
  const channel = await User.findById(channelObjectId).select(
    "_id username fullname avatar coverImage"
  );

  const totalVideos = videos.length;
  const totalViews = videos.reduce((acc, v) => acc + (v.views || 0), 0);
  const videoIds = videos.map((v) => v._id);

  // Count likes on logged-in user's videos
  const totalLikes = await Like.countDocuments({
    video: { $in: videoIds },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        channel,
        totalSubscribers,
        totalVideos,
        totalViews,
        totalLikes,
      },
      "Channel stats fetched successfully"
    )
  );
});

const getChannelVideos = AsyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel

  const channelId = req.user?._id;
  if (!isValidObjectId(channelId)) {
    throw new ApiError("Invalid channel ID", 400);
  }

  const channel = await User.findById(channelId).select("username avatar");

  const videos = await Video.find({
    owner: channelId,
  }).select("title description videoFile thumbnail views duration createdAt");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videoInfo: {
          channelName: channel.username,
          avatar: channel.avatar,
        },
        videos: videos.length > 0 ? videos : [],
      },
      "Videos fetched successfully"
    )
  );
});

export { getChannelStats, getChannelVideos };
