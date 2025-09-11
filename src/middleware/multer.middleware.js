// 📌 Multer Setup for File Uploads
// Multer is a middleware that helps us handle
// file uploads from the client (e.g., images, docs).
// It stores files temporarily on the server before
// we upload them to Cloudinary.

import multer from "multer";

// ⚙️ Configure Storage
// We are using multer.diskStorage to define:
//   1. destination → where to save uploaded files temporarily
//   2. filename    → how the uploaded file will be named
const storage = multer.diskStorage({
  // 🔹 destination: folder path where file will be saved
  // "cb" means callback. First parameter is error (null if no error),
  // second parameter is the folder path.
  // ⚠️ Note: Make sure this folder exists in your project
  destination: function (req, file, cb) {
    cb(null, "/Public/temp");
  },

  // 🔹 filename: how the file will be named on the server
  // file.originalname = the actual file name from user’s computer
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

// Create and export Upload Middleware
export const upload = multer({
  storage,
});

// Extra concepts (not used in this code but good to know):
// 1. You can customize storage to use memory instead of disk (storage options: diskStorage or memoryStorage)
// 2. upload.single("fieldname") → for single file upload
// 3. upload.array("fieldname", maxCount) → for multiple files
// 4. upload.fields([{ name: "field1" }, { name: "field2" }]) → for mixed uploads
// 5. upload.none() → to accept only text fields, no files
// 6. You can also add file filters, size limits, etc. in multer options
// 7. Always handle errors in file uploads (e.g., file too large, wrong format)
