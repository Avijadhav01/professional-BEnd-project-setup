import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../model/Video.model.js";
import { User } from "../model/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";
import { uploadToCloudinary, cloudinarySDK } from "../utils/cloudinary.js";

const publishAVideo = AsyncHandler(async (req, res) => {
  const { title, description, isPublic } = req.body;
  // TODO: get video, upload to cloudinary, create video

  if (!title || !description || !isPublic) {
    throw new ApiError("Title, description and isPublic are required", 400);
  }

  if (!req.user) {
    throw new ApiError("Unauthorized access", 401);
  }

  if (!req.files) {
    throw new ApiError("Files are required to upload video", 400);
  }

  const videoLocalPath = req.files?.videoFile[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

  if (!videoLocalPath || !thumbnailLocalPath) {
    throw new ApiError("video and thumbnail is required", 400);
  }

  let videoResponce = null;
  let thumbnailResponce = null;
  try {
    videoResponce = await uploadToCloudinary(videoLocalPath);
    thumbnailResponce = await uploadToCloudinary(thumbnailLocalPath);
  } catch (error) {
    console.error("Error : ", error);
    throw new ApiError(
      "Error uploading video and thumbnail on cloudinary",
      400
    );
  }

  if (!videoResponce || !thumbnailResponce) {
    throw new ApiError("Error: upload video and thumbnail on cloudinary");
  }

  const video = await Video.create({
    title,
    description,
    videoFile: {
      url: videoResponce.url || videoResponce.secure_url,
      public_id: videoResponce.public_id,
    },
    thumbnail: {
      url: thumbnailResponce.secure_url || thumbnailResponce.url,
      public_id: thumbnailResponce.public_id,
    },
    isPublic,
    duration: videoResponce.duration,
    owner: req.user._id,
  });

  if (!video) {
    throw new ApiError("Video not found", 404);
  }

  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video Uploaded successfully"));
});

const getVideoById = AsyncHandler(async (req, res) => {
  const { videoId } = req.params;

  // Validate MongoDB ObjectId
  if (!isValidObjectId(videoId)) {
    throw new ApiError("Invalid video ID", 400);
  }

  const video = await Video.findById(videoId).select("-__v").lean();

  if (!video) {
    throw new ApiError("Video not found", 404);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const getAllVideos = AsyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType } = req.query;

  const aggregate = Video.aggregate([]);

  // 2️⃣ Search filter (if query exists)
  if (query) {
    aggregate.match({
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ],
    });
  }

  aggregate.match({
    isPublic: true,
  });

  // 3️⃣ Sorting (after filtering)
  aggregate.sort({
    [sortBy || "createdAt"]: sortType === "asc" ? 1 : -1,
  });

  const fetchedVideos = await Video.aggregatePaginate(aggregate, {
    limit: Number(limit),
    page: Number(page),
  });

  if (!fetchedVideos || !fetchedVideos.docs.length) {
    throw new ApiError("Videos not found", 404);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, fetchedVideos, "Videos fetched successfully"));
});

const getUsersAllVideos = AsyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType } = req.query;

  const { userId } = req.params;

  if (!userId || !isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid User ID");
  }

  const aggregate = Video.aggregate([]);

  // 1️⃣ Filter videos by owner
  aggregate.match({
    owner: new mongoose.Types.ObjectId(userId),
  });

  // 2️⃣ Search filter (if query exists)
  if (query) {
    aggregate.match({
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ],
    });
  }

  // 3️⃣ Sorting (after filtering)
  aggregate.sort({
    [sortBy || "createdAt"]: sortType === "asc" ? 1 : -1,
  });

  const fetchedVideos = await Video.aggregatePaginate(aggregate, {
    limit: Number(limit),
    page: Number(page),
  });

  if (!fetchedVideos || !fetchedVideos.docs.length) {
    throw new ApiError("Videos not found", 404);
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, fetchedVideos, "Videos fetched successfully...")
    );
});

const updateVideo = AsyncHandler(async (req, res) => {
  const { title, description } = req.body;
  //TODO: update video details like title, description, thumbnail

  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError("Video ID is required", 400);
  }

  const thumbnailLocalPath = req.file?.path;
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError("Video not found", 404);
  }

  const old_public_id = video.thumbnail.public_id;

  // Check ownership
  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError("Unauthorized: You cannot update this video", 403);
  }

  const dataToBeUpdate = {};

  if (title) dataToBeUpdate.title = title;
  if (description) dataToBeUpdate.description = description;

  let thumbnailResponce;

  if (thumbnailLocalPath)
    thumbnailResponce = await uploadToCloudinary(thumbnailLocalPath);

  if (thumbnailResponce)
    dataToBeUpdate.thumbnail = {
      url: thumbnailResponce.url || thumbnailResponce.secure_url,
      public_id: thumbnailResponce.public_id,
    };

  console.log(dataToBeUpdate);

  const updatedVideo = await Video.findByIdAndUpdate(videoId, dataToBeUpdate, {
    new: true,
  });

  if (!updatedVideo) {
    throw new ApiError("Video not found", 404);
  }

  if (thumbnailResponce) {
    const thumbnailDeleteResponce =
      await cloudinarySDK.uploader.destroy(old_public_id);

    if (!thumbnailDeleteResponce) {
      throw new ApiError("Error deleting old thumbnail", 402);
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = AsyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video

  if (!videoId) {
    throw new ApiError("video ID required", 400);
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError("Video not found", 404);
  }

  // Check ownership
  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError("Unauthorized: You cannot delete this video", 403);
  }

  const thumbnailPublic_id = video.thumbnail?.public_id;

  const videoPublic_id = video.videoFile?.public_id;

  const deletedVideo = await Video.findByIdAndDelete(videoId);

  if (!deletedVideo) {
    throw new ApiError("Video deletion failed", 500);
  }

  try {
    if (videoPublic_id) {
      await cloudinarySDK.uploader.destroy(videoPublic_id, {
        resource_type: "video",
      });
    }

    if (thumbnailPublic_id) {
      await cloudinarySDK.uploader.destroy(thumbnailPublic_id, {
        resource_type: "image",
      });
    }
  } catch (error) {
    console.error("Error: ", error);

    throw new ApiError(
      "Error deleting video and thumbnail from cloudinary",
      400
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deletedVideo._id, "Video deleted successfully"));
});

const togglePublishStatus = AsyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError("video ID required", 400);
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError("Video not found", 404);
  }

  // Check ownership
  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      "Unauthorized: You cannot toggle video publishStatus",
      403
    );
  }

  // Toggle the isPublic field
  const isPublicStatus = video.isPublic;
  video.isPublic = !isPublicStatus;

  // Save only modified fields
  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Successfully toggled publishStatus"));
});

export {
  getUsersAllVideos,
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
