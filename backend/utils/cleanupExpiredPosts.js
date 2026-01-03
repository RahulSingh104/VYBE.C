const Post = require("../models/Post");

const cleanupExpiredPosts = async () => {
  try {
    await Post.deleteMany({
      expiresAt: { $lte: new Date() },
    });
    console.log("🧹 Expired posts cleaned");
  } catch (err) {
    console.error("Cleanup error:", err.message);
  }
};

module.exports = cleanupExpiredPosts;
