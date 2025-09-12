import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js"; // custom error class for handling API errors
import { isValidEmail } from "../validators/emailValidator.js"; // import email validator
import { User } from "../model/User.model.js"; // import User model which interacts with MongoDB
import { uploadOnCloudinary } from "../utils/Cloudinary.js"; // import Cloudinary upload image files
import { ApiResponse } from "../utils/ApiResponse.js"; // custom response class for consistent API responses

const registerUser = AsyncHandler(async (req, res) => {
  // steps:
  //1. get user details from frontend >>
  //2. validate - not empty >>
  //3. check if user already exists : username, email >>
  //4. check for images , check for avatar
  //5. upload it on cloudinary and check avatar on cloudinary
  //6. create user object - create entry in db
  //7. check for user creation
  //8. return res

  // 1. Get user details from req.body
  console.log("Request body:", req.body);
  console.log("Request files:", req.files);
  const { fullname, email, username, password } = req.body;

  // 2. Validate - check if any field is empty
  if (
    [fullname, email, username, password].some((field) => field?.trim() === "") // If at least one field is empty, .some() returns true.
  ) {
    throw new ApiError("All fields are required", 400); // Here we used custom error class
  }

  if (!isValidEmail(email)) {
    throw new ApiError("Email is not valid", 400);
  }

  // 3. Check if user already exists (by email or username)
  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser) {
    throw new ApiError("User already exists", 409);
  }

  // 4. Check for images (avatar is required, coverImage is optional)
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError("Avatar is required", 400);
  }

  // 5. Upload images to Cloudinary and check avatar response
  const avatarResponse = await uploadOnCloudinary(avatarLocalPath);
  const coverImageResponse = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatarResponse) {
    throw new ApiError("Error uploading avatar image", 500);
  }

  // 6. create user object - create entry in db
  const newUser = await User.create({
    fullname,
    email,
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

export default registerUser;
