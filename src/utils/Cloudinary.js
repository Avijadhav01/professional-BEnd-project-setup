import { v2 as cloudinary } from "cloudinary";
import fs from "fs"; // File system module (to delete local temp files)

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

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // 🔽 Uploading file to Cloudinary
    const result = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto", // auto-detect (image, video, pdf, etc.)
    });

    fs.unlinkSync(localFilePath); // delete temp file
    return result;
  } catch (error) {
    // ❌ If upload fails, delete local file (cleanup)
    fs.unlinkSync(localFilePath);
    console.error("Error uploading file:", error);
    return null;
  }
};

export { uploadOnCloudinary };
