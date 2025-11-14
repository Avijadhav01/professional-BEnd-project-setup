import mongoose, { Mongoose, Schema, model, version } from "mongoose";

const likeSchema = new Schema(
  {
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
    vedio: {
      type: Schema.Types.ObjectId,
      ref: "Vedio",
    },
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    tweet: {
      type: Schema.Types.ObjectId,
      ref: "Tweet",
    },
  },
  { timestamps: true }
);

export const Like = model("Like", likeSchema);
