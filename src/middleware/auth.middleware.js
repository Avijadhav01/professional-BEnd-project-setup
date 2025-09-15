import { User } from "../model/User.model.js";
import { ApiError } from "../utils/ApiError.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJwt = AsyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError("Not authorized, no token", 401);
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      // NEXT VIDEO: Descussion about frontend
      throw new ApiError("Invalid Access Token", 401);
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Access Token Not Valid");
  }
});
