// require("dotenv").config({ path: "./env" });
import dotenv from "dotenv";
import connectDb from "./db/index.js";

dotenv.config({
  path: "./env",
});

connectDb();

/*import express from "express";
const app = express();

(async () => {
  // use try() catch() block as it may throw an error while connecting to database
  try {
    // Try to establish connection with MongoDB
    // mongoose.connect() returns a promise, so we use await
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    app.on("error", (err) => {
      console.log("Error: ", err);
      throw err;
    });

    app.listen(process.env.PORT, () => {
      console.log(`Server is running on port ${process.env.PORT}`);
    });
  } catch (error) {
    // If there is any error while connecting, it will be caught here
    console.log("Error: ", error);
    throw error;
  }
})();
*/
