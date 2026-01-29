const User = require("../models/User");
const Post = require("../models/Post");
const cloudinary = require("../utils/cloudinary");




/* =========================
   GET LOGGED-IN USER PROFILE
========================= */
exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("followers following", "name profileImage");

    const posts = await Post.find({ user: req.user.id,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
     });

    res.json({ user, posts });
  } catch (err) {
    res.status(500).json(err.message);
  }
};

/* =========================
   GET OTHER USER PROFILE
========================= */
exports.getProfile = async (req, res) => {
  try {
    const profileUser = await User.findById(req.params.id)
      .select("-password")
      .populate("followers following", "name profileImage");

    const currentUser = await User.findById(req.user.id);

    const isFollowing = currentUser.following.includes(profileUser._id);

    const posts = await Post.find({ user: profileUser._id ,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    });

    console.log("PROFILE POSTS:", posts.map(p => ({
  image: p.image,
  images: p.images
})));


    res.json({
      user: {
        ...profileUser._doc,
        isFollowing, // 🔥 SOURCE OF TRUTH
      },
      posts,
    });
  } catch (err) {
    res.status(500).json(err.message);
  }
};

/* =========================
   GET FOLLOWERS
========================= */
// exports.getFollowers = async (req, res) => {
//   try {
//     const user = await User.findById(req.params.id)
//       .populate("followers", "name profileImage")
//       .lean();

//     const currentUserId = req.user.id;

//     const followers = user.followers.map(u => ({
//       _id: u._id,
//       name: u.name,
//       profileImage: u.profileImage,
//       isFollowing: u.followers?.includes(currentUserId) // 🔥 KEY FIX
//     }));

//     res.json(followers);
//   } catch (err) {
//     res.status(500).json(err.message);
//   }
// };

exports.getFollowers = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("followers", "name profileImage")
      .lean();

    res.json(user.followers || []);
  } catch (err) {
    res.status(500).json({ message: "Failed to load followers" });
  }
};


/* =========================
   GET FOLLOWING
========================= */
// exports.getFollowing = async (req, res) => {
//   try {
//     const user = await User.findById(req.params.id)
//       .populate("followers following", "name profileImage");


//     const following = user.following.map(u => ({
//       ...u._doc,
//       isFollowing: true
//     }));

//     res.json(following);
//   } catch (err) {
//     res.status(500).json(err.message);
//   }
// };

exports.getFollowing = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("following", "name profileImage")
      .lean();

    const currentUserId = req.user.id;

    const following = (user.following || []).map(u => ({
      ...u,
      isFollowing: true, // 🔥 KEY FIX
    }));

    res.json(following);
  } catch (err) {
    res.status(500).json({ message: "Failed to load following" });
  }
};



exports.followUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!user) return res.status(404).json("User not found");

    // 🔒 PRIVATE ACCOUNT
    if (user.isPrivate && !user.followers.includes(req.user.id)) {
      if (!user.followRequests.includes(req.user.id)) {
        user.followRequests.push(req.user.id);
        await user.save();
      }
      return res.json({ requested: true });
    }

    // 🔁 FOLLOW / UNFOLLOW
    if (!user.followers.includes(req.user.id)) {
      user.followers.push(req.user.id);
      currentUser.following.push(req.params.id);
    } else {
      user.followers.pull(req.user.id);
      currentUser.following.pull(req.params.id);
    }

    await user.save();
    await currentUser.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json(err.message);
  }
};

exports.acceptRequest = async (req, res) => {
  const user = await User.findById(req.user.id);
  const requester = await User.findById(req.params.id);

  user.followRequests.pull(req.params.id);
  user.followers.push(req.params.id);
  requester.following.push(req.user.id);

  await user.save();
  await requester.save();

  res.json("Request accepted");
};

exports.toggleMute = async (req, res) => {
  const user = await User.findById(req.user.id);

  if (user.mutedStories.includes(req.params.id)) {
    user.mutedStories.pull(req.params.id);
  } else {
    user.mutedStories.push(req.params.id);
  }

  await user.save();
  res.json({ success: true });
};


/* =========================
   UPDATE MY PROFILE
========================= */
// exports.updateMyProfile = async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // update text fields
//     if (req.body.name) user.name = req.body.name;
//     if (req.body.bio !== undefined) user.bio = req.body.bio;

//     // update profile image (IMPORTANT)
//     if (req.file) {
//       user.profileImage = req.file.filename;
//     }

//     await user.save();

//     res.json({
//       success: true,
//       user,
//     });
//   } catch (err) {
//     console.error("PROFILE UPDATE ERROR:", err);
//     res.status(500).json({ message: "Profile update failed" });
//   }
// };


exports.updateMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.body.name) user.name = req.body.name;
    if (req.body.bio !== undefined) user.bio = req.body.bio;

    if (req.file) {
      // delete old image if exists
      if (user.profileImage?.public_id) {
        await cloudinary.uploader.destroy(user.profileImage.public_id);
      }

      user.profileImage = {
        url: req.file.path,
        public_id: req.file.filename,
      };
    }

    await user.save();

    res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("PROFILE UPDATE ERROR:", err);
    res.status(500).json({ message: "Profile update failed" });
  }
};



// exports.toggleFollow = async (req, res) => {
//   const targetUserId = req.params.id;
//   const currentUserId = req.user.id;

//   if (targetUserId === currentUserId) {
//     return res.status(400).json({ message: "Cannot follow yourself" });
//   }

//   const currentUser = await User.findById(currentUserId);
//   const targetUser = await User.findById(targetUserId);

//   const isFollowing = currentUser.following.includes(targetUserId);

//   if (isFollowing) {
//     currentUser.following.pull(targetUserId);
//     targetUser.followers.pull(currentUserId);
//   } else {
//     currentUser.following.push(targetUserId);
//     targetUser.followers.push(currentUserId);
//   }

//   await currentUser.save();
//   await targetUser.save();

//   res.json({
//     following: !isFollowing,
//     followersCount: targetUser.followers.length,
//   });
// };


exports.toggleFollow = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const isFollowing = currentUser.following.includes(targetUserId);

    if (isFollowing) {
      // 🔴 UNFOLLOW (BOTH SIDES)
      currentUser.following.pull(targetUserId);
      targetUser.followers.pull(currentUserId);
    } else {
      // 🟢 FOLLOW (BOTH SIDES)
      currentUser.following.push(targetUserId);
      targetUser.followers.push(currentUserId);
    }

    await currentUser.save();
    await targetUser.save();

    res.json({
      following: !isFollowing,
    });
  } catch (err) {
    console.error("Follow error:", err);
    res.status(500).json({ message: "Follow failed" });
  }
};

