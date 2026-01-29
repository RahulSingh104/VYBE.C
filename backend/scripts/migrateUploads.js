const mongoose = require("mongoose");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const cloudinary = require("cloudinary").v2;

const Post = require("../models/Post");
const User = require("../models/User");

dotenv.config();

/* ---------------- CLOUDINARY CONFIG ---------------- */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ---------------- MONGODB CONNECT ---------------- */
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected for migration");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

/* ---------------- UPLOAD FUNCTION ---------------- */
const uploadToCloudinary = async (localPath, folder) => {
  return cloudinary.uploader.upload(localPath, {
    folder,
    resource_type: "image",
  });
};

/* ---------------- MIGRATION ---------------- */
const migrateUploads = async () => {
  await connectDB();

  const uploadsDir = path.join(process.cwd(), "uploads");

  console.log("📦 Reading local uploads...");

  if (!fs.existsSync(uploadsDir)) {
    console.log("⚠️ uploads folder not found");
    process.exit(0);
  }

  /* -------- POSTS -------- */
  const posts = await Post.find({ image: { $exists: true, $ne: "" } });

//   for (const post of posts) {
//     if (!post.image || post.image.startsWith("http")) continue;

//     const localPath = path.join(uploadsDir, post.image);
//     if (!fs.existsSync(localPath)) continue;

//     const result = await uploadToCloudinary(localPath, "vybe/posts");
//     post.image = result.secure_url;
//     await post.save();

//     console.log(`✅ Post image migrated: ${post._id}`);
//   }

for (const post of posts) {
  try {
    if (!post.image) continue;

    // skip already-migrated images
    if (post.image.startsWith("http")) {
      console.log("⏭️ Already migrated:", post._id);
      continue;
    }

    const localPath = path.join(
      __dirname,
      "..",
      "uploads",
      post.image
    );

    if (!fs.existsSync(localPath)) {
      console.log("⚠️ File not found, skipping:", post.image);
      continue;
    }

    const result = await uploadToCloudinary(localPath);

    post.image = result.secure_url;
    await post.save();

    console.log("✅ Post image migrated:", post._id);
  } catch (err) {
    console.error(
      "❌ Failed to migrate post:",
      post._id,
      err.message || err
    );
  }
}



  /* -------- USERS (PROFILE IMAGE) -------- */
  const users = await User.find({
    profileImage: { $exists: true, $ne: "" },
  });

  for (const user of users) {
    if (!user.profileImage || user.profileImage.startsWith("http")) continue;

    const localPath = path.join(uploadsDir, user.profileImage);
    if (!fs.existsSync(localPath)) continue;

    const result = await uploadToCloudinary(localPath, "vybe/profiles");
    user.profileImage = result.secure_url;
    await user.save();

    console.log(`✅ Profile image migrated: ${user._id}`);
  }

  console.log("🎉 MIGRATION COMPLETE");
  process.exit(0);
};

migrateUploads()
  .then(() => {
    console.log("🎉 MIGRATION COMPLETE");
    process.exit(0);
  })
  .catch((err) => {
    console.error("🔥 MIGRATION FAILED:", err);
    process.exit(1);
  });

