const Post = require("../models/Post");
const { checkContent } = require("../utils/aiModeration");
const User = require("../models/User"); 



exports.createPost = async (req, res) => {
  try {
    if (checkContent(req.body.caption)) {
      return res.status(400).json({
        message: "⚠️ Abusive content detected by AI",
      });
    }

    const isTemporary = req.body.isTemporary === "true";

    const postData = {
      user: req.user.id,
      caption: req.body.caption,
      isTemporary,
    };

    if (req.file) {
  postData.image = req.file.filename;   // ✅ SINGLE IMAGE
}

if (req.files?.length) {
  postData.images = req.files.map(f => f.filename); // ✅ MULTI
}


    // ✅ THIS WAS MISSING / BUG SOURCE
    if (isTemporary) {
      postData.expiresAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      );
    } else {
      postData.expiresAt = null;
    }

    const post = await Post.create(postData);
    // 🔥 POPULATE USER (THIS FIXES EVERYTHING)
const populatedPost = await Post.findById(post._id).populate(
  "user",
  "name profileImage"
);
    res.status(201).json(post);
  } catch (err) {
    console.error("Create post error:", err);
    res.status(500).json({ message: "Post failed" });
  }
};

exports.getFeed = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const posts = await Post.find({
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    })
      .populate("user", "name profileImage followers") // 👈 followers added
      .populate("comments.user", "name profileImage")
      .sort({ createdAt: -1 });

    // 🔥 ADD FOLLOW STATUS HERE
    const formattedPosts = posts.map((post) => {
      const isFollowing = post.user.followers?.some(
        (id) => id.toString() === currentUserId
      );

      return {
        ...post._doc,
        user: {
          ...post.user._doc,
          isFollowing, // ✅ frontend-friendly flag
        },
      };
    });

    res.json(formattedPosts);
  } catch (err) {
    console.error("Feed error:", err);
    res.status(500).json(err);
  }
};





exports.likePost = async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post.likes.includes(req.user.id)) {
    post.likes.push(req.user.id);
  } else {
    post.likes.pull(req.user.id);
  }

  await post.save();
  res.json(post);
};

exports.addComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.comments.push({
      user: req.user.id,
      text: req.body.text,
    });

    await post.save();
    res.status(201).json(post.comments);
  } catch (err) {
    res.status(500).json({ message: "Comment failed" });
  }
};


exports.getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("user", "name profileImage")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    console.error("Post Fetch Error:", err.message);
    res.status(500).json({ message: "Server error loading posts" });
  }
};


exports.deletePost = async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  if (post.user.toString() !== req.user.id) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  await post.deleteOne();
  res.json({ message: "Post deleted" });
};


exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.user.id;

    const index = post.likes.indexOf(userId);
    if (index === -1) {
      post.likes.push(userId); // 👍 like
    } else {
      post.likes.splice(index, 1); // 👎 unlike
    }

    await post.save();
    res.json({ likes: post.likes.length });
  } catch (err) {
    res.status(500).json({ message: "Like failed" });
  }
};


exports.toggleSave = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // ❌ 24h post cannot be saved
    if (post.isTemporary) {
      return res.status(400).json({ message: "Temporary post cannot be saved" });
    }

    const userId = req.user.id;
    const index = post.savedBy.indexOf(userId);

    if (index === -1) {
      post.savedBy.push(userId);
    } else {
      post.savedBy.splice(index, 1);
    }

    await post.save();
    res.json({ saved: post.savedBy.includes(userId) });
  } catch (err) {
    res.status(500).json({ message: "Save failed" });
  }
};


exports.getSavedPosts = async (req, res) => {
  try {
    const posts = await Post.find({
      savedBy: req.user.id,
      isTemporary: false,
    })
      .populate("user", "name profileImage")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Failed to load saved posts" });
  }
};


/* ================= 🔥 DELETE COMMENT (NEW) ================= */
exports.deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // 🔐 only comment owner can delete
    if (comment.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    comment.deleteOne(); // remove subdocument
    await post.save();

    res.json({ message: "Comment deleted" });
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ message: "Delete comment failed" });
  }
};


// controllers/post.controller.js

exports.getSinglePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("user", "name profileImage")
      .populate("comments.user", "name profileImage");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
