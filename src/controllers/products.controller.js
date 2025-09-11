import { AsyncHandler } from "../utils/AsyncHandler.js";

const getProducts = AsyncHandler(async (req, res) => {
  res.status(201).json({
    message: "These are the products",
  });
});

export { getProducts };
