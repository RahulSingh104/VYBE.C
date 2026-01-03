// const router = require("express").Router();
// const auth = require("../middleware/auth.middleware");
// const admin = require("../middleware/admin.middleware");

// const User = require("../models/User");
// const Post = require("../models/Post");
// const Reel = require("../models/Reel");
// const Story = require("../models/Story");

// /* ✅ DASHBOARD STATS */
// router.get("/stats", auth, admin, async (req, res) => {
//   const users = await User.countDocuments();
//   const posts = await Post.countDocuments();
//   const reels = await Reel.countDocuments();
//   const stories = await Story.countDocuments();

//   res.json({ users, posts, reels, stories });
// });

// /* ✅ GET ALL USERS */
// router.get("/users", auth, admin, async (req, res) => {
//   const users = await User.find().select("-password");
//   res.json(users);
// });

// /* ✅ BLOCK / UNBLOCK USER */
// router.put("/block/:id", auth, admin, async (req, res) => {
//   const user = await User.findById(req.params.id);
//   user.isBlocked = !user.isBlocked;
//   await user.save();
//   res.json(user);
// });

// /* ✅ DELETE ANY POST */
// router.delete("/post/:id", auth, admin, async (req, res) => {
//   await Post.findByIdAndDelete(req.params.id);
//   res.json("Post removed");
// });

// /* ✅ DELETE ANY REEL */
// router.delete("/reel/:id", auth, admin, async (req, res) => {
//   await Reel.findByIdAndDelete(req.params.id);
//   res.json("Reel removed");
// });

// module.exports = router;


const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const admin = require("../middleware/admin.middleware");
const User = require("../models/User");
const Post = require("../models/Post");

router.get("/stats", auth, admin, async (req, res) => {
  const users = await User.countDocuments();
  const posts = await Post.countDocuments();

  res.json({
    users,
    posts,
    reels: 0,
    stories: 0,
  });
});

router.get("/users", auth, admin, async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

router.put("/block/:id", auth, admin, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { isBlocked: true });
  res.json("User blocked");
});

router.delete("/post/:id", auth, admin, async (req, res) => {
  await Post.findByIdAndDelete(req.params.id);
  res.json("Post deleted");
});

module.exports = router;
