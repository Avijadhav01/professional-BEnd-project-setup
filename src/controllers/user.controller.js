import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

// validators
import { isValidEmailAndUsername } from "../validators/emailValidator.js"; // import email validator
import { passwordValidate } from "../validators/passwordValidator.js";
import { isValidIdentifier } from "../validators/identifierValidator.js";

// =======
import { User } from "../model/user.model.js";
import { uploadToCloudinary, cloudinarySDK } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const registerUser = AsyncHandler(async (req, res) => {
  // 1. Get user details from req.body

  const { fullname, email, username, password } = req.body;

  // 2. Validate - not empty
  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError("All fields are required", 400);
  }

  const { isEmailValid, isUsernameValid } = isValidEmailAndUsername(
    email,
    username
  );

  const isPasswordValid = passwordValidate(password);

  if (!isPasswordValid) {
    throw new ApiError("Password is not valid", 400);
  }

  if (!isEmailValid) {
    throw new ApiError("Email is not valid", 400);
  }

  if (!isUsernameValid) {
    throw new ApiError("Username Must be lowercase letters only", 400);
  }

  // 3. Check if user already exists : username, email
  const isUserExist = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (isUserExist) {
    throw new ApiError("User already exists", 409);
  }

  // 4. Check for images (avatar is required, coverImage is optional)
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError("Error avatar is required", 400);
  }

  // 5. Upload images to Cloudinary and check avatar response

  const avatarResponse = await uploadToCloudinary(avatarLocalPath);

  let coverImageResponse = null;
  if (coverImageLocalPath) {
    coverImageResponse = await uploadToCloudinary(coverImageLocalPath);
  }

  if (!avatarResponse) {
    throw new ApiError("Error uploading avatar on Cloudinary", 500);
  }

  // 6. create user object - create entry in db
  const newUser = await User.create({
    fullname,
    email: email.toLowerCase(),
    username: username.toLowerCase(),
    password,
    avatar: {
      url: avatarResponse.secure_url,
      public_id: avatarResponse.public_id,
    },
    coverImage: {
      url: coverImageResponse?.secure_url || "",
      public_id: coverImageResponse.public_id || "",
    },
  });

  const createdUser = await User.findById(newUser._id).select(
    "-password -refreshToken"
  );

  // 7. check for user creation
  if (!createdUser) {
    throw new ApiError("Error creating user", 500);
  }

  // 8. return res
  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); // “Just save the changes, don’t run full validation on every field.”

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Token generation error:", error);
    throw new ApiError("Error generating tokens", 500);
  }
};

const loginUser = AsyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier) {
    throw new ApiError("Identifier is required to login", 400);
  }

  const { isValid } = isValidIdentifier(identifier);

  const type = identifier.includes("@") ? "email" : "username";

  if (!isValid) {
    throw new ApiError("Identifier is not valid", 401);
  }

  if (!password) {
    throw new ApiError("Password Is Required To Login", 400);
  }

  // 3. Check if user exists : username/email
  const user = await User.findOne({
    [type]: identifier.trim().toLowerCase(),
  });

  if (!user) {
    throw new ApiError(`user not found`, 404);
  }

  // 4. check for password match >>
  const isPasswordMatched = await user.isPasswordCorrect(password);

  if (!isPasswordMatched) {
    throw new ApiError("Invalid credentials", 401);
  }

  // 5. generate an access and refresh tokens

  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  // here we get user again from the database User to get the refresh token which is empty in last one user
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  console.log(`\n${identifier} logged in successfully`);

  // 6. send cookie in response
  // 7. return res

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "user logged in successfully"
      )
    );
});

const logOutUser = AsyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError("Unauthorized: Please log in to continue", 401);
  }

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out successfully"));
});

// ----------------- REFRESH TOKEN -----------------
const refreshAccessToken = AsyncHandler(async (req, res) => {
  //

  // Get the JWT string you got from the client.
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError("Unauthorized request", 401);
  }

  try {
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET; // This is what the server uses to recreate the signature.

    const decodedToken = jwt.verify(incomingRefreshToken, refreshTokenSecret); //Token + Secret together → allows the server to check the signature and decode the payload.

    if (!decodedToken || !decodedToken._id) {
      throw new ApiError("Invalid Refresh Token", 401);
    }

    const user = await User.findById(decodedToken._id);

    if (!user) {
      throw new ApiError("User not found", 404);
    }

    if (user.refreshToken !== incomingRefreshToken) {
      throw new ApiError("Token mismatched or expired", 401);
    }

    const { accessToken, refreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    console.error("Error: ", error);
    throw new ApiError("Could not refresh access token", 500);
  }
});

const changeCurrentPassword = AsyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  // 1️⃣ Check all fields provided
  if (!oldPassword || !newPassword || !confirmPassword) {
    throw new ApiError("All fields (old, new, confirm) are required", 400);
  }

  // 2️⃣ Check new password and confirm password match
  if (newPassword !== confirmPassword) {
    throw new ApiError("New password and confirm password do not match", 400);
  }

  // 3️⃣ Validate password strength
  if (!passwordValidate(newPassword)) {
    throw new ApiError("New password does not meet security requirements", 400);
  }

  // 4️⃣ Find the current logged-in user
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError("User not found or unauthorized", 401);
  }

  // 5️⃣ Check old password is correct
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError("Invalid old password", 400);
  }

  // 6️⃣ Update password
  user.password = newPassword;
  await user.save({ validateBeforeSave: false }); // pre-save hook hashes it

  // 7️⃣ Send response
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = AsyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError("Unauthorized: No user found", 401);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateAccountDetails = AsyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!fullname || !email) {
    throw new ApiError("Atleast one field is required", 400);
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email: email,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = AsyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError("Avatar file is missing", 400);
  }

  if (!req.user) {
    throw new ApiError("Not authorized", 401);
  }

  // ✅ Delete old avatar from Cloudinary (if exists)
  const oldAvatarPublicId = req.user.avatar?.public_id;

  if (oldAvatarPublicId) {
    try {
      await cloudinarySDK.uploader.destroy(oldAvatarPublicId);
    } catch (error) {
      console.error("Error deleting old avatar:", error);
    }
  }

  // ✅ Upload new avatar
  const avatarResponse = await uploadToCloudinary(avatarLocalPath);

  if (!avatarResponse || !avatarResponse.public_id) {
    throw new ApiError("Error while uploading new avatar", 500);
  }

  // ✅ Update user record in DB
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: {
          url: avatarResponse.secure_url,
          public_id: avatarResponse.public_id,
        },
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  console.log("Avatar updated successfully");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = AsyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError("Cover image file is missing", 400);
  }

  if (!req.user) {
    throw new ApiError("Not authorized", 401);
  }

  // Delete old cover image from Cloudinary if it exists
  const oldCoverImagePublicId = req.user.coverImage?.public_id;
  if (oldCoverImagePublicId) {
    try {
      await cloudinarySDK.uploader.destroy(oldCoverImagePublicId);
    } catch (error) {
      console.error("Error deleting old cover image:", error);
    }
  }

  // Upload new cover image
  const coverImageResponse = await uploadToCloudinary(coverImageLocalPath);

  if (!coverImageResponse || !coverImageResponse.public_id) {
    throw new ApiError("Error while uploading new cover image", 500);
  }

  // Update user in DB
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: {
          url: coverImageResponse.secure_url,
          public_id: coverImageResponse.public_id,
        },
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

const getUserChannelProfile = AsyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError("username is missing", 400);
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        totalSubscribers: {
          $size: "$subscribers",
        },
        totalSubscribedTo: {
          $size: "$subscribedTo",
        },
        isSubscribed: { $in: [req.user?._id, "$subscribers.subscriber"] },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
        totalSubscribers: 1,
        totalSubscribedTo: 1,
        isSubscribed: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError("Channel does not exists", 404);
  }

  console.log("User channel fetched successfully");

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

const getWatchHistory = AsyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError("Unauthorized access", 401);
  }

  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: { $first: "$owner" },
            },
          },
          // optional sort by latest watch
          {
            $sort: { createdAt: -1 },
          },
        ],
      },
    },
  ]);

  if (!user?.length) {
    throw new ApiError("User not found", 404);
  }

  console.log("Watch history fetched successfully");

  return res
    .status(200)
    .json(new ApiResponse(200, user[0], "Watch history fetched successfully"));
});

export {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
