// require("dotenv").config({ path: "./env" });
import dotenv from "dotenv";
import connectDb from "./db/index.js";
import app from "./app.js";

dotenv.config({
  path: "./env",
});

app.on("error", (err) => {
  console.log("APP Error: ", err);
  throw err;
});

connectDb()
  .then((data) => {
    app.listen(process.env.PORT || 9000, () => {
      console.log(
        `\nServer is running on http://localhost:${process.env.PORT}`
      );
    });
  })
  .catch((err) => {
    console.log("MONGODB connection FAILED !!!", err);
  });
