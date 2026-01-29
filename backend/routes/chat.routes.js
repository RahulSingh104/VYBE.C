const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const {
  sendMessage,
  getMessages,
  getChatList,
  forwardMessage,
   createGroup,
  sendGroupMessage,
} = require("../controllers/chat.controller");

// SEND MESSAGE
router.post("/", auth, sendMessage);
// GET DM MESSAGES WITH USER
router.get("/messages/:userId", auth, getMessages);
// CHAT LIST (DM ONLY)
router.get("/", auth, getChatList); 
// forward message
router.post("/forward/:id", auth, forwardMessage);
// group chat
router.post("/group", auth, createGroup);
router.post("/group/message", auth, sendGroupMessage);



module.exports = router;
