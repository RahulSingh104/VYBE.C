const router = require("express").Router();
const upload = require("../middleware/upload");
const auth = require("../middleware/auth.middleware");

const {
  createPost,
  getFeed,
  addComment,
  getAllPosts,
  deletePost,
  toggleLike,
  toggleSave,
  getSavedPosts,
  deleteComment,
  getSinglePost,
} = require("../controllers/post.controller");

router.post("/upload", auth, upload.single("image"), createPost);
router.get("/feed", auth, getFeed);

router.post("/:id/comment", auth, addComment);
router.delete(
  "/:postId/comment/:commentId",
  auth,
  deleteComment
);


router.get("/", getAllPosts);
router.delete("/:id", auth, deletePost);
router.post("/:id/like", auth, toggleLike);
router.post("/:id/save", auth, toggleSave);
router.get("/saved/me", auth, getSavedPosts);
router.get("/:id", getSinglePost);



module.exports = router;
