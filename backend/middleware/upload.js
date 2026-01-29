// const multer = require("multer");
// const path = require("path");

// const storage = multer.diskStorage({
//   destination: "uploads/",
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname));
//   }
// });

// const upload = multer({ storage });

// module.exports = upload;


// const multer = require("multer");
// const path = require("path");

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "uploads/");
//   },
//   filename: function (req, file, cb) {
//     cb(
//       null,
//       Date.now() + path.extname(file.originalname)
//     );
//   },
// });

// const fileFilter = (req, file, cb) => {
//   if (file.mimetype.startsWith("image")) {
//     cb(null, true);
//   } else {
//     cb(new Error("Only images allowed"), false);
//   }
// };

// const upload = multer({
//   storage,
//   fileFilter,
// });

// module.exports = upload;


const multer = require("multer");
const cloudinary = require("../utils/cloudinary");

// ✅ correct import (VERY IMPORTANT)
const CloudinaryStorage =
  require("multer-storage-cloudinary").CloudinaryStorage;

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:
      file.fieldname === "profileImage"
        ? "vybe_profiles"
        : "vybe_posts",
    resource_type: "auto",
    allowed_formats: ["jpg", "png", "jpeg", "mp4", "mov", "webm"],
  }),
});

const upload = multer({ storage });

module.exports = upload;

