import dotenv from "dotenv";
import connectDb from "./db/index.js";
import app from "./app.js";

// Load environment variables
dotenv.config({ path: ".env" });

const PORT = process.env.PORT || 9000;

// Handle app-level errors
app.on("error", (err) => {
  console.error("❌ APP Error:", err);
  process.exit(1);
});

// Connect DB and start server
connectDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MONGODB connection FAILED !!!", err);
  });
