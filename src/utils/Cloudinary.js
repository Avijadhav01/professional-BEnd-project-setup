// 📌 Cloudinary Configuration & Upload Utility
// In this file, we are setting up Cloudinary and
// creating a helper function to upload files to
// Cloudinary after receiving them from Multer.

import { v2 as cloudinary } from "cloudinary";
import fs from "fs"; // File system module (to delete local temp files)

// 🔑 Cloudinary Configuration
// Here we configure Cloudinary with credentials
// (cloud_name, api_key, api_secret).
//
// ⚠️ These values come from your Cloudinary account:
//   - cloud_name  → Found in Cloudinary dashboard
//   - api_key     → Provided in dashboard
//   - api_secret  → Provided in dashboard
//
// To keep them safe, we store them in environment
// variables (.env file) and access with process.env.

if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  console.error("❌ Cloudinary credentials are missing!");
  process.exit(1);
} else {
  console.log("✅ Cloudinary credentials found.");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 📌 Function: uploadOnCloudinary
// Purpose: Upload a file (local path) to Cloudinary
// Steps:
// 1. Check if localFilePath is provided.
// 2. Upload the file to Cloudinary.
// 3. If successful → return result (with public URL).
// 4. If failed → delete temp file from server and return null.
const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // 🔽 Uploading file to Cloudinary
    const result = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto", // auto-detect (image, video, pdf, etc.)
    });

    // ✅ If upload is successful, log and return details
    if (result) console.log("File Uploaded on cloudinary: ", result.url);
    return result;
    fs.unlinkSync(localFilePath); // delete temp file
  } catch (error) {
    // ❌ If upload fails, delete local file (cleanup)
    fs.unlinkSync(localFilePath);
    console.error("Error uploading file:", error);
    return null;
  }
};

export { uploadOnCloudinary };

// Extra concepts (not used in this code but good to know):
// 1. you can set the resource_type to "image", "video", or "raw" if you know the type
// 2. you can delete files from Cloudinary using cloudinary.uploader.destroy()
// 3. cloudinary lets you transform images/videos during upload (resize, crop, etc.)
// 4. Learn about advanced file upload options in Cloudinary docs
