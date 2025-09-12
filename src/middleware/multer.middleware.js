import multer from "multer";

// Set The Storage Engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "Public/temp");
  },

  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

// Create and export Upload Middleware
export const upload = multer({
  storage,
});
