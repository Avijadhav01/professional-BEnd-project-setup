import mongoose, { Mongoose, Schema, model, version } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    vedioFile: {
      type: String, // cloudinary url
      required: true,
    },
    thumbnail: {
      type: String, // cloudinary url
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number, // duration in seconds
      required: true,
    },
    views: {
      type: Number, // duration in seconds
      default: 0,
    },
    isPublic: {
      type: Boolean,
      required: true,
    },
    owner: {
      type: Mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = model("Video", videoSchema);
