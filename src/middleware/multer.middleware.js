import multer from "multer";

// Set The Storage Engine
const storage = multer.diskStorage({
  // Public/temp is a folder which is created manually in the root directory
  destination: function (req, file, cb) {
    cb(null, "Public/temp");
  },

  // file.originalname = the actual file name from client side
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

// Create and export Upload Middleware
export const upload = multer({
  storage,
});
