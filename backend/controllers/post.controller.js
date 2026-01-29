const Post = require("../models/Post");
const { checkContent } = require("../utils/aiModeration");
const User = require("../models/User");
const { getCache, setCache } = require("../utils/cache");
const Hashtag = require("../models/Hashtag");
const cloudinary = require("../utils/cloudinary");

exports.createPost = async (req, res) => {
  try {
    if (checkContent(req.body.caption)) {
      return res.status(400).json({
        message: "⚠️ Abusive content detected by AI",
      });
    }

    const isTemporary = req.body.isTemporary === "true";

    const isDiscussion = req.body.isDiscussion === "true"; // ✅ NEW
    const mood = req.body.mood || "happy"; // ✅ NEW
    const tags = req.body.tags
      ? req.body.tags.split(",").map((t) => t.trim().toLowerCase())
      : [];

    // 🔍 Extract hashtags from caption
    const captionTags =
      req.body.caption
        ?.match(/#\w+/g)
        ?.map((t) => t.replace("#", "").toLowerCase()) || [];

    // 🔥 Merge UI tags + caption tags (unique)
    const finalTags = [...new Set([...tags, ...captionTags])];

    // postData.tags = finalTags;

    const postData = {
      user: req.user.id,
      createdBy: req.user.id,
      caption: req.body.caption || "",
      isTemporary: req.body.isTemporary === "true",
      isDiscussion: req.body.isDiscussion === "true", // ✅ NEW
      isAnonymous: req.body.isAnonymous === "true", // ✅ new
      tags: finalTags, // ✅ array of tags
      mood: req.body.mood || "happy", // ✅ NEW
    };

  //   if (req.file) {
  //      postData.image = {
  //   url: req.file.path,
  //   public_id: req.file.filename,
  // };// ✅ SINGLE IMAGE
  //   }

  //   if (req.files && req.files.length > 0) {
  //     postData.images = req.files.map((f) => f.path);

  //     console.log("FILE:", req.file);

  //     // 🔥 IMPORTANT: also set image for backward compatibility
  //     if (!postData.image) {
  //       postData.image = postData.images[0];
  //     }
  //   }

  if (req.file) {
  postData.image = {
    url: req.file.path,
    public_id: req.file.filename,
  };
}

if (req.files && req.files.length > 0) {
  postData.images = req.files.map((f) => ({
    url: f.path,
    public_id: f.filename,
  }));

  // backward compatibility
  if (!postData.image) {
    postData.image = postData.images[0];
  }
}

    // ✅ THIS WAS MISSING / BUG SOURCE
    if (isTemporary) {
      postData.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else {
      postData.expiresAt = null;
    }

    const post = await Post.create(postData);

    // 🔥 HASHTAG COUNTER (SAFE ADD)
    if (finalTags.length > 0) {
      for (const tag of finalTags) {
        await Hashtag.findOneAndUpdate(
          { name: tag },
          { $inc: { count: 1 } },
          { upsert: true, new: true },
        );
      }
    }

    // 🔥 POPULATE USER (THIS FIXES EVERYTHING)
    const populatedPost = await Post.findById(post._id).populate(
      "user",
      "name profileImage",
    );

    res.status(201).json(populatedPost);
  } catch (err) {
    console.error("Create post error:", err);
    res.status(500).json({ message: "Post failed" });
  }
};

exports.getFeed = async (req, res) => {
  console.log("🟢 /posts/feed called by", req.user.id);

  try {
    const moodFilter = req.query.mood; // ✅ ADD

    const query = {
      user: { $ne: req.user.id }, // 🔥 AUTHOR EXCLUDED
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    };

    if (moodFilter) {
      query.mood = moodFilter; // ✅ OPTIONAL
    }

    const posts = await Post.find(query)
      .populate("user", "name profileImage")
      .populate("comments.user", "name profileImage")
      .sort({ createdAt: -1 })
      .lean();

    setCache("feed", posts, 15000);

    const currentUser = await User.findById(req.user.id)
      .select("following")
      .lean();

    const followingIds =
      currentUser?.following?.map((id) => id.toString()) || [];

    const formattedPosts = posts.map((post) => {
      if (post.isAnonymous) {
        return {
          ...post,
          user: {
            _id: null,
            name: "Anonymous",
            profileImage: null,
            isFollowing: false,
          },
        };
      }

      return {
        ...post,
        user: {
          ...post.user,
          isFollowing: followingIds.includes(post.user?._id?.toString()),
        },
      };
    });

    res.json(formattedPosts);
  } catch (err) {
    console.error("🔥 FEED CRASH:", err);
    res.status(500).json({
      message: "Feed crashed",
      error: err.message,
    });
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

  if (post.image?.public_id) {
  await cloudinary.uploader.destroy(post.image.public_id);
}
// 🔥 delete multiple images (future proof)
  if (Array.isArray(post.images)) {
    for (const img of post.images) {
      if (img?.public_id) {
        await cloudinary.uploader.destroy(img.public_id);
      }
    }
  }

  await post.deleteOne();
  res.json({ message: "Post deleted" });
};

exports.toggleLike = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    // 🔹 1. RAW POST (NO POPULATE)
    const post = await Post.findById(postId).lean();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const alreadyLiked = post.likes.some((id) => id.toString() === userId);

    let updateQuery;

    if (alreadyLiked) {
      updateQuery = { $pull: { likes: userId } };
    } else {
      updateQuery = { $addToSet: { likes: userId } };

      // 🔥 preserve anonymous logic
      if (post.isAnonymous && post.user) {
        await User.findByIdAndUpdate(post.user, {
          $inc: { anonymousScore: 1 },
        });
      }
    }

    // 🔹 2. ATOMIC UPDATE (NO save())
    const updatedPost = await Post.findByIdAndUpdate(postId, updateQuery, {
      new: true,
    })
      .populate("user", "name profileImage")
      .populate("comments.user", "name profileImage");

    // 🔴 SOCKET LIVE LIKE EVENT
    const io = req.app.get("io");
    if (io) {
      io.emit("post:like:update", {
        postId: updatedPost._id.toString(),
        likes: updatedPost.likes,
      });
    }

    res.json({
      ...updatedPost.toObject(),
      isLiked: !alreadyLiked,
      likesCount: updatedPost.likes.length,
    });
  } catch (err) {
    console.error("Like error:", err);
    res.status(500).json({ message: "Like failed" });
  }
};

exports.toggleSave = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.isTemporary) {
      return res
        .status(400)
        .json({ message: "Temporary post cannot be saved" });
    }

    // 🔥 SAFE DEFAULT
    if (!Array.isArray(post.savedBy)) {
      post.savedBy = [];
    }

    const userId = req.user.id;
    const index = post.savedBy.indexOf(userId);

    if (index === -1) {
      post.savedBy.push(userId);
    } else {
      post.savedBy.splice(index, 1);
    }

    await post.save();

    res.json({
      saved: post.savedBy.includes(userId),
    });
    const io = req.app.get("io");
    if (io && index !== -1) {
      io.emit("post:unsave:update", {
        postId: post._id.toString(),
      });
    }
  } catch (err) {
    console.error("Save error:", err);
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
    if (post.isAnonymous) {
      post.user = {
        _id: null,
        name: "Anonymous",
        profileImage: null,
      };
    }

    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.searchHashtags = async (req, res) => {
  const q = req.query.q || "";
  const tags = await Hashtag.find({
    name: { $regex: q, $options: "i" },
  })
    .sort({ count: -1 })
    .limit(20);

  res.json(tags);
};

exports.trendingHashtags = async (req, res) => {
  const tags = await Hashtag.find().sort({ count: -1 }).limit(10);

  res.json(tags);
};
