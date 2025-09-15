import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDb = async () => {
  try {
    const response = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    if (response)
      console.log("\nMongoDB Cnnected !! DB HOST: ", response.connection.host);
  } catch (error) {
    console.log("MONGODB connection FAILED !!!", error);
    process.exit(1);
  }
};

export default connectDb;
