import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../model/user.model.js";
import { Subscription } from "../model/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";

const toggleSubscription = AsyncHandler(async (req, res) => {
  // TODO: toggle subscription

  const { channelId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(channelId) || !isValidObjectId(userId)) {
    throw new ApiError("Invalid channel or userId", 400);
  }

  const subscription = await Subscription.findOne({
    subscriber: userId,
    channel: channelId,
  });

  if (subscription) {
    await Subscription.deleteOne({
      subscriber: userId,
      channel: channelId,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Unsubscribed successfully"));
  } else {
    const subscribed = Subscription.create({
      subscriber: userId,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, subscribed, "Subscribed successfully"));
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = AsyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const loggedInUserId = req.user?._id;
  if (!isValidObjectId(channelId)) {
    throw new ApiError("Invalid channel ID", 400);
  }

  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriberInfo",
      },
    },
    {
      $unwind: "$subscriberInfo",
    },
    {
      $addFields: {
        isSubscribed: {
          $eq: ["$subscriber", new mongoose.Types.ObjectId(loggedInUserId)],
        },
      },
    },
    {
      $project: {
        _id: "$subscriberInfo._id",
        username: "$subscriberInfo.username",
        fullname: "$subscriberInfo.fullname",
        avatar: "$subscriberInfo.avatar",
        isSubscribed: 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalSubscribers: subscribers.length,
        subscribers,
      },
      "Subscribers fetched successfully"
    )
  );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = AsyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError("Invalid subscriber ID", 400);
  }

  const channels = await Subscription.aggregate([
    // 1️⃣ Only subscriptions of this user
    { $match: { subscriber: new mongoose.Types.ObjectId(subscriberId) } },

    // 2️⃣ Sort by latest subscription
    { $sort: { createdAt: -1 } },

    // 3️⃣ Join with users collection to get channel info
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channelInfo",
      },
    },

    // 4️⃣ Unwind array, preserve if channel missing
    { $unwind: { path: "$channelInfo", preserveNullAndEmptyArrays: false } },

    // 5️⃣ Remove duplicates (if same channel appears multiple times)
    {
      $group: {
        _id: "$channelInfo._id",
        username: { $first: "$channelInfo.username" },
        fullname: { $first: "$channelInfo.fullname" },
        avatar: { $first: "$channelInfo.avatar" },
        latestSubscription: { $first: "$createdAt" },
      },
    },

    // 6️⃣ Sort again by latest subscription if needed
    { $sort: { latestSubscription: -1 } },

    // 7️⃣ Project final output fields
    {
      $project: {
        _id: 1,
        username: 1,
        fullname: 1,
        avatar: 1,
      },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalChannels: channels.length,
        channels,
      },
      "Subscribed channels fetched successfully"
    )
  );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
