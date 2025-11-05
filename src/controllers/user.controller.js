import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { isValidEmailAndUsername } from "../validators/emailValidator.js"; // import email validator
import { passwordValidate } from "../validators/passwordValidator.js";
import { User } from "../model/User.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

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
    throw ApiError("Password is not valid", 400);
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

  const avatarResponse = await uploadOnCloudinary(avatarLocalPath);

  let coverImageResponse = null;
  if (coverImageLocalPath) {
    coverImageResponse = await uploadOnCloudinary(coverImageLocalPath);
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
    avatar: avatarResponse.secure_url,
    coverImage: coverImageResponse?.secure_url || "",
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
  // console.log("Request body: ", req.body);

  // 1. Get user details from req.body
  // - you can login with email or username, so we will accept either one
  const { identifier, password } = req.body;
  // client sends { identifier: 'avi' or 'a@b.com', password }

  if (!identifier) {
    throw new ApiError("Identifier is required to login", 400);
  }

  const { isValid, type } = isValidIdentifier(identifier);

  if (!isValid) {
    throw new ApiError("Identifier is not valid", 401);
  }

  if (!password) {
    throw new ApiError("Password Is Required To Login", 400);
  }

  // 3. Check if user exists : username/email
  const user = await User.findOne({
    [type]: identifier.toLowerCase(), //dynamically picks "email" or "username"
  });

  if (!user) {
    throw new ApiError("User not found", 404);
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

  console.log("\nUser Login successfully");

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
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
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

  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken; // This is the JWT string you got from the client.

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

    if (user?.refreshToken !== incomingRefreshToken) {
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
    console.error("Error refreshing access token:", error);
    throw new ApiError("Could not refresh access token", 500);
  }
});

const changeCurrentPassword = AsyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    throw new ApiError("New password and confirm password do not match", 400);
  }

  if (!passwordValidate(newPassword)) {
    throw new ApiError("New password is not valid", 400);
  }

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError("Invalid old password", 400);
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

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

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const avatarUrl = avatar.secure_url || avatar.url;

  if (!avatarUrl) {
    throw new ApiError("Error While uploading avatar", 500);
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatarUrl,
      },
    },
    { new: true } // Return the updated document
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successsfully"));
});

const updateUserCoverImage = AsyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError("CoverImage file is missing", 400);
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  const coverImageUrl = coverImage.secure_url || coverImage.url;

  if (!coverImageUrl) {
    throw new ApiError("Error While uploading coverImage", 500);
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImageUrl,
      },
    },
    { new: true } // Return the updated document
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "CoverImage updated successsfully"));
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
};
