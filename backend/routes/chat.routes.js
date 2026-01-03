const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const {
  sendMessage,
  getMessages,
  getChatList,
} = require("../controllers/chat.controller");

router.post("/", auth, sendMessage);
router.get("/:userId", auth, getMessages);
router.get("/", auth, getChatList); 

module.exports = router;
