import { User } from "../model/User.model.js";
import { ApiError } from "../utils/ApiError.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";
import jwt from "jsonwebtoken";

const isLoggedIn = AsyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError("Not authorized, no token", 401);
  }
  const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;

  // Decodes it to get the payload (for example { _id: "userId", email: "test@gmail.com" }).
  const decodedToken = jwt.verify(token, accessTokenSecret);

  const user = await User.findById(decodedToken?._id).select(
    "-password -refreshToken"
  );

  if (!user) {
    // NEXT VIDEO: Descussion about frontend
    throw new ApiError("Invalid Access Token", 401);
  }
  req.user = user;

  next();
});

export { isLoggedIn };
