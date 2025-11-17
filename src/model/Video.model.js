import mongoose, { Schema, model, version } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    videoFile: {
      url: {
        type: String, // cloudinary url
        required: true,
      },
      public_id: {
        type: String, // cloudinary url
        required: true,
      },
    },
    thumbnail: {
      url: {
        type: String, // cloudinary url
        required: true,
      },
      public_id: {
        type: String, // cloudinary url
        required: true,
      },
    },
    duration: {
      type: Number, // duration in seconds
      required: true,
      min: 0, // cannot be negative
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublic: {
      type: Boolean,
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

videoSchema.index({ title: "text", description: "text" });
videoSchema.plugin(mongooseAggregatePaginate);

export const Video = model("Video", videoSchema);
