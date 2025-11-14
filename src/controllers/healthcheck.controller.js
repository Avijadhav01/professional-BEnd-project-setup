import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";

const healthcheck = AsyncHandler(async (req, res) => {
  //TODO: build a healthcheck response that simply returns the OK status as json with a message
});

export { healthcheck };
