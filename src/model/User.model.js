import mongoose, { Schema, model } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String,
      default: "https://example.com/default-avatar.png",
    },
    coverImage: {
      type: String,
      default: "https://example.com/default-cover.png",
    },
    watchHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      maxlength: [30, "Password must be at most 30 characters"],
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

/*
  🔒 Pre-save hook:
  - "pre" means this function will run BEFORE a document is saved in the DB.
  - We listen to the "save" event → so it runs every time a user is created or updated.
  - Why? To automatically hash the password before storing it.
  - We use async/await here because bcrypt.hash() and bcrypt.genSalt() return Promises.
  - ⚡ Important: we use a NORMAL function (not arrow function) because:
      → In Mongoose middleware, "this" refers to the current document being saved.
      → Arrow functions do NOT have their own "this" binding, 
         so "this" would be undefined or point to the outer scope.
      → Using a normal function ensures "this" = current user document.
*/
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10); // generate salt (adds randomness)
    this.password = await bcrypt.hash(this.password, salt); // hash password with salt
    next(); // continue saving
  } catch (err) {
    next(err);
  }
});

// Compare entered password with hashed password in DB
userSchema.methods.isPasswordCorrect = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_LIFE,
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_LIFE,
    }
  );
};
export const User = model("User", userSchema);
