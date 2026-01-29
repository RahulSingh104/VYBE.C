const Message = require("../models/Message");
const User = require("../models/User");
const ChatRoom = require("../models/ChatRoom");
const { checkContent } = require("../utils/aiModeration");



exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, text } = req.body;

     // 🔥 AI MODERATION (ADD HERE)
    if (checkContent(text)) {
      return res.status(400).json({
        message: "⚠️ Message blocked by AI moderation",
      });
    }


    const message = await Message.create({
      sender: req.user.id,
      receiver: receiverId,
      text,
      replyTo: req.body.replyTo || null,
    });

    // 🔥 POPULATE SENDER BEFORE RETURNING
    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name profileImage")
      .populate("receiver", "name profileImage");

    res.status(201).json(populatedMessage);
  } catch (err) {
    res.status(500).json(err.message);
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: userId },
        { sender: userId, receiver: req.user.id },
      ],
    })
      .sort({ createdAt: 1 })
      // 🔥 ALWAYS POPULATE
      .populate("sender", "name profileImage")
      .populate("receiver", "name profileImage");

    res.json(messages);
  } catch (err) {
    res.status(500).json(err.message);
  }
};




exports.addComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    post.comments.push({
      user: req.user.id,
      text: req.body.text,
    });

    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json(err.message);
  }
};

exports.getChatList = async (req, res) => {
  try {
    const userId = req.user.id;

    // get all messages where user is sender or receiver
    const messages = await Message.find({
      chatRoom: null, // ✅ IMPORTANT
  $or: [{ sender: req.user.id }, { receiver:req.user.id }],
})
  .sort({ createdAt: -1 })
  .populate("sender", "name profileImage")
  .populate("receiver", "name profileImage");


    // unique users
    const usersMap = {};

    messages.forEach((msg) => {
      if (!msg.sender || !msg.receiver) return;

      const senderId = msg.sender._id.toString();
      const receiverId = msg.receiver._id.toString();

      const otherUser =
        senderId === userId ? receiverId : senderId;

      if (!usersMap[otherUser]) {
        usersMap[otherUser] = msg;
      }
    });

    const chatList = await Promise.all(
      Object.keys(usersMap).map(async (id) => {
        const user = await User.findById(id).select(
          "name profileImage"
        );

        if (!user) return null;

        return {
          user,
          lastMessage: usersMap[id].text,
        };
      })
    );

   res.json(chatList.filter(Boolean));
  } catch (err) {
    res.status(500).json(err.message);
  }
};


exports.forwardMessage = async (req, res) => {
  const original = await Message.findById(req.params.id);

  const newMessage = await Message.create({
    sender: req.user.id,
    receiver: req.body.receiverId,
    text: original.text,
    isForwarded: true,
  });

  res.json(newMessage);
};

exports.createGroup = async (req, res) => {
  const { users } = req.body;

  if (!users || users.length < 2 || users.length > 5) {
    return res.status(400).json({
      message: "Group must have 2–5 users only",
    });
  }

  const room = await ChatRoom.create({
    participants: [req.user.id, ...users],
    isGroup: true,
  });

  res.json(room);
};


exports.sendGroupMessage = async (req, res) => {
  const { roomId, text } = req.body;

   // 🔥 AI CHECK (ADD HERE)
  if (checkContent(text)) {
    return res.status(400).json({
      message: "⚠️ Message blocked by AI moderation",
    });
  }

  const message = await Message.create({
    sender: req.user.id,
    chatRoom: roomId,
    text,
  });

  const populated = await message.populate(
    "sender",
    "name profileImage"
  );

  res.json(populated);
};

// exports.getChats = async (req, res) => {
//   try {
//     const messages = await Message.find({
//       chatRoom: null,
//       $or: [
//         { sender: req.user.id },
//         { receiver: req.user.id },
//       ],
//     })
//       .populate("sender", "name profileImage")
//       .populate("receiver", "name profileImage")
//       .sort({ createdAt: -1 });

//     res.json(messages);
//   } catch (err) {
//     console.error("CHAT LIST ERROR:", err);
//     res.status(500).json({ message: "Chat load failed" });
//   }
// };

