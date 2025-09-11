import { AsyncHandler } from "../utils/AsyncHandler.js";

const registerUser = AsyncHandler(async (req, res) => {
  console.log("🔥 registerUser hit", req.body);
  res.status(200).json({
    message: "User registered successfully",
  });
});

export default registerUser;
