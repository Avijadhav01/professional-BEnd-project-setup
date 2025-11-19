import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../model/like.model.js";
import { Video } from "../model/Video.model.js";
import { Comment } from "../model/comment.model.js";
import { Tweet } from "../model/tweet.model.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";

const toggleVideoLike = AsyncHandler(async (req, res) => {
  //TODO: toggle like on video

  const { videoId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(videoId) || !isValidObjectId(userId)) {
    throw new ApiError("Invalid video or user ID format", 400);
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError("Video not found", 404);
  }

  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: userId,
  });

  if (existingLike) {
    await existingLike.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Video unliked successfully"));
  } else {
    const likedVideo = await Like.create({
      video: videoId,
      likedBy: userId,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, likedVideo, "Video liked successfully"));
  }
});

const toggleCommentLike = AsyncHandler(async (req, res) => {
  //TODO: toggle like on comment

  const { commentId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(commentId) || !isValidObjectId(userId)) {
    throw new ApiError("Invalid video or user ID format", 400);
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError("Comment not found", 404);
  }

  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: userId,
  });

  if (existingLike) {
    await existingLike.deleteOne();

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Comment unliked successfully"));
  } else {
    const likedComment = await Like.create({
      comment: commentId,
      likedBy: userId,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, likedComment, "comment liked successfully"));
  }
});

const toggleTweetLike = AsyncHandler(async (req, res) => {
  //TODO: toggle like on tweet

  const { tweetId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(tweetId) || !isValidObjectId(userId)) {
    throw new ApiError("Invalid tweet ID format", 400);
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError("Tweet not found", 404);
  }

  const existingLike = await Like.findOne({
    tweet: tweetId,
    likedBy: userId,
  });

  if (existingLike) {
    await existingLike.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Tweet unliked successfully"));
  } else {
    const likedTweet = await Like.create({
      tweet: tweetId,
      likedBy: userId,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, likedTweet, "Tweet liked successfully"));
  }
});

const getLikedVideos = AsyncHandler(async (req, res) => {
  //TODO: get all liked videos
  const userId = req.user?._id;
  if (!isValidObjectId(userId)) {
    throw new ApiError("Invalid user ID", 400);
  }

  const likes = await Like.find({
    likedBy: userId,
    video: { $exists: true },
  }).populate({
    path: "video",
    populate: { path: "owner", select: "username fullName avatar" },
  });

  const likedVideos = likes
    .map((like) => like.video)
    .filter((video) => video != null);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalVideos: likedVideos.length,
        likedVideos,
      },
      "Liked videos fetched successfully"
    )
  );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
