import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import z from "zod";
import { Playlist } from "./../models/playlist.model.js";
import { Video } from "./../models/video.model.js";
import { User } from "./../models/user.model.js";
import { title } from "process";

const createPlaylist = asyncHandler(async (req, res) => {
  const playlistSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    description: z.string().trim().min(1, "Description is required"),
    videoIds: z
      .array(z.string().refine((id) => mongoose.Types.ObjectId.isValid(id)))
      .optional(),
  });

  const validated = playlistSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, "Invalid input", validated.error.issues);
  }

  const { name, description, videoIds = [] } = validated.data;
  const userId = req.user._id;

  const invalidIds = videoIds.filter(
    (id) => !mongoose.Types.ObjectId.isValid(id) // checking user given video Ids are valid mongoDb Object ID...........
  );
  if (invalidIds.length > 0) {
    throw new ApiError(400, `Invalids video Ids `, invalidIds);
  }

  const existingVideos = await Video.find({
    //checking that video IDS are in db or not....
    _id: { $in: videoIds },
  }).select("_id");

  const existingIdsSet = new Set(existingVideos.map((v) => v._id.toString())); //converting existingVideos, those ids into string and check no duplicates values

  const missingIds = videoIds.filter((id) => !existingIdsSet.has(id)); // ids which are in set but not found in db

  if (missingIds.length > 0) {
    throw new ApiError(404, "One or more videos not found", missingIds);
  }

  const playlist = await Playlist.create({
    name,
    description,
    owner: userId,
    videos: videoIds,
  });

  return res
    .status(201)

    .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid User ID");
  }

  const playlists = await Playlist.find({ owner: userId })
    .select("name description videos createdAt")
    .populate("videos", "title thumbnail")
    .sort({ createdAt: -1 });
  if (playlists.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to Update this playlist");
  }
  const playlistsWithCount = playlists.map((playlist) => ({
    _id: playlist._id,
    name: playlist.name,
    description: playlist.description,
    videos: playlist.videos,
    totalVideos: playlist.videos.length,
    createdAt: playlist.createdAt,
  }));

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        playlistsWithCount,
        "User playlists fetched successfully"
      )
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id
  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid Playlist ID format");
  }

  const playlist = await Playlist.findById(playlistId)
    .populate("owner", "username fullName avatar ")
    .populate("videos", "title thumbnail");

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }
  const formattedVideos = playlist.videos.map((video) => ({
    _id: video._id,
    title: video.title,
    thumbnail: video.thumbnail,
  }));

  const formattedPlaylist = {
    _id: playlist._id,
    name: playlist.name,
    description: playlist.description,
    owner: playlist.owner,
    videos: formattedVideos,
    createdAt: playlist.createdAt,
    updatedAt: playlist.updatedAt,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, formattedPlaylist, "Playlist fetched successfully")
    );
});
const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid Playlist ID format");
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  const schema = z.object({
    videoIds: z.array(
      z.string().refine((id) => mongoose.Types.ObjectId.isValid(id), {
        message: "Invalid video ID",
      })
    ),
  });

  const validated = schema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, "Invalid input", validated.error.issues);
  }

  const { videoIds } = validated.data;
  const foundVideos = await Video.find({ _id: { $in: videoIds } }).select(
    "_id"
  );

  const foundIdsSet = new Set(foundVideos.map((v) => v._id.toString()));

  const missingIds = videoIds.filter((id) => !foundIdsSet.has(id));
  if (missingIds.length > 0) {
    throw new ApiError(404, "Some videos not found", missingIds);
  }

  const existingIds = new Set(playlist.videos.map((v) => v.toString()));

  const newVideoIds = videoIds.filter((id) => !existingIds.has(id));

  if (newVideoIds.length === 0) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          playlist,
          "All videos already exist in the playlist"
        )
      );
  }
  playlist.videos.push(...newVideoIds);
  await playlist.save();

  await playlist.populate("videos", "title thumbnail");

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "Videos added to playlist successfully")
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist
  if (
    !mongoose.Types.ObjectId.isValid(playlistId) ||
    !mongoose.Types.ObjectId.isValid(videoId)
  ) {
    throw new ApiError(400, "Invalid Playlist or Video ID format");
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  const videoExists = playlist.videos.some((v) => v.toString() === videoId);
  if (!videoExists) {
    throw new ApiError(404, "Video not found in playlist");
  }

  playlist.videos = playlist.videos.filter((v) => v.toString() !== videoId);
  await playlist.save();
  await playlist.populate("videos", "title thumbnail");

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "Video removed from playlist successfully")
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid Playlist ID format");
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }
  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this playlist");
  }

  await Playlist.deleteOne({ _id: playlistId });

  return res
    .status(200)
    .json(
      new ApiResponse(200, null, `${playlistId}: Playlist Deleted Successfully`)
    );
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid Playlist ID format");
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }
  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to Update this playlist");
  }
  const playlistSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    description: z.string().trim().min(1, "Description is required"),
    videoIds: z
      .array(z.string().refine((id) => mongoose.Types.ObjectId.isValid(id)))
      .optional(),
  });

  const validated = playlistSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, "Invalid input", validated.error.issues);
  }

  const { name, description } = validated.data;
  const userId = req.user._id;

  playlist.name = name;
  playlist.description = description;

  await playlist.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist updated successfully"));
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
