import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../model/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";

const createPlaylist = AsyncHandler(async (req, res) => {
  //TODO: create playlist

  const { name, description } = req.body;
  if (!name.trim() || !description.trim()) {
    throw new ApiError("Name and description is required for playlist");
  }

  const ownerId = req.user?._id;
  if (!isValidObjectId(ownerId)) {
    throw new ApiError("Invalid user ID", 400);
  }

  const playlist = await Playlist.create({
    name,
    description,
    owner: ownerId,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

const getUserPlaylists = AsyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError("Invalid user ID", 400);
  }

  const playlists = await Playlist.find({ owner: userId }).sort({
    createdAt: -1,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { total: playlists.length, playlists },
        "User playlists fetched successfully"
      )
    );
});

const getPlaylistById = AsyncHandler(async (req, res) => {
  //TODO: get playlist by id
  const { playlistId } = req.params;
  if (!isValidObjectId(playlistId)) {
    throw new ApiError("Invalid playlist ID", 400);
  }

  const playlist = await Playlist.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(playlistId) } },

    // Join videos
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videosList",
        pipeline: [
          {
            $sort: {
              createdAt: -1,
            },
          },
        ],
      },
    },

    //  Join owner details
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerInfo",
      },
    },
    { $unwind: "$ownerInfo" },

    // final shape

    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        videos: "$videosList",
        owner: "$ownerInfo",
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  if (!playlist.length) {
    throw new ApiError("Playlist not found", 404);
  }

  const data = playlist[0];

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalVideos: data.videos.length,
        playlist: data,
      },
      "Playlist fetched successfully"
    )
  );
});

const addVideoToPlaylist = AsyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError("Invalid playlist ID or video ID", 400);
  }

  const playlist = await Playlist.findById(videoId);

  if (!playlist) throw new ApiError("Playlist not found", 400);

  const videoExists = playlist.videos.some((v) => v.toString() === videoId);

  if (videoExists) {
    return res
      .status(200)
      .json(new ApiResponse(200, {}, " Video already exist in playlist"));
  }

  playlist.videos.push(videoId);
  await playlist.save({ validateBeforeSave: false });

  await playlist.populate(
    "videos",
    "title thumbnail videoFile views duration "
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "Video added to playlist successfully")
    );
});

const removeVideoFromPlaylist = AsyncHandler(async (req, res) => {
  // TODO: remove video from playlist

  const { playlistId, videoId } = req.params;
  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError("Invalid playlist or video ID", 400);
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError("Playlist not found", 404);
  }

  const videoExists = playlist.videos.some((v) => v.toString() === videoId);
  if (!videoExists) {
    throw new ApiError("Video not found in playlist", 404);
  }

  playlist.videos = playlist.videos.filter(
    (v) => v.toString() !== videoId.toString()
  );
  await playlist.save({ validateBeforeSave: false });

  await playlist.populate("videos", "title thumbnail videoFile views duration");

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Video deleted successfully"));
});

const updatePlaylist = AsyncHandler(async (req, res) => {
  //TODO: update playlist

  const { playlistId } = req.params;
  if (!isValidObjectId(playlistId)) {
    throw new ApiError("Invalid playlist ID", 400);
  }

  const { name, description } = req.body;
  if (!name && !description)
    throw new ApiError("Name or Description should be required", 400);

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError("Playlist not found", 404);
  }

  const dataToUpdate = {};
  if (name && name.trim() !== "") dataToUpdate.name = name;

  if (description && description.trim() !== "")
    dataToUpdate.description = description;

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    dataToUpdate,
    { new: true, runValidators: true }
  ).populate("videos", "title description thumbnail videoFile views duration");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
    );
});

const deletePlaylist = AsyncHandler(async (req, res) => {
  // TODO: delete playlist

  const { playlistId } = req.params;
  if (!isValidObjectId(playlistId)) {
    throw new ApiError("Invalid playlist ID", 400);
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError("Playlist not found", 404);
  }

  const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId, {
    projection: { name: 1, owner: 1 },
  }).lean();

  return res
    .status(200)
    .json(
      new ApiResponse(200, deletedPlaylist, "Playlist deleted successfully")
    );
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
