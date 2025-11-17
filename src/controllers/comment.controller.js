import mongoose, { isValidObjectId, Schema } from "mongoose";
import { Comment } from "../model/comment.model.js";
import { Video } from "../model/Video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";

const getVideoComments = AsyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { page = 1, limit = 10 } = req.query;

  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError("Video ID should be required", 400);
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError("Video not found", 404);
  }

  const aggregate = Comment.aggregate([]);

  aggregate.match({
    video: new mongoose.Types.ObjectId(videoId),
  });

  aggregate
    .lookup({
      from: "users", // collection to join
      localField: "owner", // field from Comment
      foreignField: "_id", // field from User
      as: "ownerDetails", // new field to add

      pipeline: [
        {
          $project: {
            username: 1,
            avatar: 1,
          },
        },
      ],
    })
    .addFields({
      ownerDetails: {
        $ifNull: [
          { $first: "$ownerDetails" },
          { username: "Deleted User", avatar: "default.png" },
        ],
      },
    });

  aggregate.project({
    content: 1,
    createdAt: 1,
    ownerDetails: 1,
  });

  aggregate.sort({
    createdAt: -1,
  });

  const fetchedComments = await Comment.aggregatePaginate(aggregate, {
    page: Number(page),
    limit: Number(limit),
  });

  if (!fetchedComments || !fetchedComments.docs.length) {
    return res.status(404).json(new ApiResponse(404, {}, "Comments not found"));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, fetchedComments, "Comments fetched successfully")
    );
});

const addComment = AsyncHandler(async (req, res) => {
  // TODO: add a comment to a video

  if (!req.user) {
    throw new ApiError("Unauthorized access, no user logged In", 401);
  }

  const { content } = req.body;
  if (!content || content.trim() === "") {
    throw new ApiError("Content is required for comment", 400);
  }

  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) throw new ApiError("Invalid video ID", 400);

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError("Video not found", 404);
  }

  const comment = await Comment.create({
    content,
    owner: req.user._id,
    video: videoId,
  });

  if (!comment) {
    throw new ApiError("Comment not found");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
});

const updateComment = AsyncHandler(async (req, res) => {
  // TODO: update a comment

  const { content } = req.body;
  if (!content || content.trim() === "") {
    throw new ApiError("Content should be required to update comment", 400);
  }

  const { commentId } = req.params;
  if (!isValidObjectId(commentId))
    throw new ApiError("Invalid comment ID", 400);

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError("Comment not found", 404);
  }

  if (!comment.owner.equals(req.user?._id)) {
    throw new ApiError("You are not authorized to update this comment", 403);
  }

  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    { content },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
});

const deleteComment = AsyncHandler(async (req, res) => {
  // TODO: delete a comment

  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) {
    throw new ApiError("Invalid comment ID", 400);
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return res.status(404).json(new ApiResponse(404, {}, "Comment not found"));
  }

  if (!comment.owner.equals(req.user?._id)) {
    throw new ApiError("You are not authorized to delete this comment", 403);
  }

  const deletedComment = await Comment.findByIdAndDelete(commentId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

export { addComment, updateComment, deleteComment, getVideoComments };
