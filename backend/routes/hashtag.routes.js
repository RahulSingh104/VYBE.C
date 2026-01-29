const express = require("express");
const router = express.Router();
const {
  searchHashtags,
  trendingHashtags,
} = require("../controllers/post.controller");

router.get("/search", searchHashtags);
router.get("/trending", trendingHashtags);

module.exports = router;
