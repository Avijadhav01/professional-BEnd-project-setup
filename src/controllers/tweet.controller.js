import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../model/tweet.model.js";
import { User } from "../model/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";

const createTweet = AsyncHandler(async (req, res) => {
  //TODO: create tweet

  if (!req.user) {
    throw new ApiError("Unauthorized access", 401);
  }
  const { content } = req.body;

  if (!content.trim()) {
    throw new ApiError("Tweet content is required", 400);
  }

  const tweet = await Tweet.create({
    content,
    owner: req.user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, tweet, "Tweet created successfully"));
});

const getUserTweets = AsyncHandler(async (req, res) => {
  // TODO: get user tweets
  if (!req.user) {
    throw new ApiError("Unauthorized access", 401);
  }

  const { userId } = req.params;

  const tweets = await Tweet.find({ owner: userId });

  return res
    .status(201)
    .json(new ApiResponse(201, tweets, "Tweets fetched successfully"));
});

const updateTweet = AsyncHandler(async (req, res) => {
  //TODO: update tweet
  const { tweetId } = req.params;
  const content = req.body?.content;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(`Invalid tweet ID`, 400);
  }

  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    { content },
    { new: true }
  );

  if (!updatedTweet) {
    throw new ApiError("Tweet not found", 404);
  }

  return res
    .status(201)
    .json(new ApiResponse(201, updatedTweet, "Tweet updates successfully"));
});

const deleteTweet = AsyncHandler(async (req, res) => {
  //TODO: delete tweet
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiResponse("nvalid tweet ID", 400);
  }

  const tweet = await Tweet.findByIdAndDelete(tweetId);

  if (!tweet) {
    throw new ApiError("Tweet not found", 404);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
