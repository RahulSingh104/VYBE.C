const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const User = require("../models/User");
const Post = require("../models/Post");
const upload = require("../middleware/upload");


// 1. Fixed: Added missing controller functions to the import
const {
  getProfile,
  getFollowers,
  getFollowing,
  getMyProfile, // Added this in case you prefer the controller version
  // acceptRequest,
  updateMyProfile,
  toggleFollow,
} = require("../controllers/user.controller");

/* =========================
   LOGGED-IN USER PROFILE
========================= */
// This handles the "me" route specifically
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("followers following"); // Combined logic from both your /me blocks

    const posts = await Post.find({ user: req.user.id }).sort({ createdAt: -1 });

    res.json({ user, posts });
  } catch (err) {
    console.error("ME ERROR:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   OTHER USER PROFILE
========================= */
// IMPORTANT: ":id" must come AFTER "/me", otherwise Express thinks "me" is an ID
router.get("/:id", auth, getProfile);

/* =========================
   FOLLOW / SOCIAL ROUTES
========================= */
router.post("/:id/follow", auth, toggleFollow);
router.get("/:id/followers", auth, getFollowers);
router.get("/:id/following", auth, getFollowing);

// router.post("/accept/:id", auth, acceptRequest);
// router.post("/mute/:id", auth, toggleMute);



/* =========================
   UPDATE LOGGED-IN USER PROFILE
========================= */
router.put(
  "/me",
  auth,
  upload.single("profileImage"), // 🔥 MUST MATCH FRONTEND
  updateMyProfile
);



module.exports = router;