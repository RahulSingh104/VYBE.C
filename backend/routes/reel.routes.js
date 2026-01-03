const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const upload = require("../middleware/upload");
const {
  createReel,
  getReels,
  likeReel,
} = require("../controllers/reel.controller");

router.post("/upload", auth, upload.single("video"), createReel);
router.get("/feed", auth, getReels);
router.post("/like/:id", auth, likeReel);

module.exports = router;
