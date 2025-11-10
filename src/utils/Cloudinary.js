import { v2 as cloudinarySDK } from "cloudinary";
import fs from "fs";

// Check credentials
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

// Configure Cloudinary
cloudinarySDK.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to upload a local file
const uploadToCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const result = await cloudinarySDK.uploader.upload(localFilePath, {
      folder: "chai_and_code", // avoid spaces in folder names
      resource_type: "auto", // auto-detect type
    });

    fs.unlinkSync(localFilePath); // delete local temp file
    return result;
  } catch (error) {
    // Clean up local file if upload fails
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    console.error("Error uploading file:", error);
    return null;
  }
};

export { uploadToCloudinary, cloudinarySDK };
