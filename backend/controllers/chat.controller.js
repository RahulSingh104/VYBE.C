const Message = require("../models/Message");
const User = require("../models/User");

exports.sendMessage = async (req, res) => {
  const { receiverId, text } = req.body;

  const message = await Message.create({
    sender: req.user.id,
    receiver: receiverId,
    text,
  });

  res.status(201).json(message);
};

exports.getMessages = async (req, res) => {
  const { userId } = req.params;

  const messages = await Message.find({
    $or: [
      { sender: req.user.id, receiver: userId },
      { sender: userId, receiver: req.user.id },
    ],
  }).sort({ createdAt: 1 });

  res.json(messages);
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
      $or: [{ sender: userId }, { receiver: userId }],
    }).sort({ createdAt: -1 });

    // unique users
    const usersMap = {};

    messages.forEach((msg) => {
      const otherUser =
        msg.sender.toString() === userId
          ? msg.receiver.toString()
          : msg.sender.toString();

      if (!usersMap[otherUser]) {
        usersMap[otherUser] = msg;
      }
    });

    const chatList = await Promise.all(
      Object.keys(usersMap).map(async (id) => {
        const user = await User.findById(id).select(
          "name profileImage"
        );
        return {
          user,
          lastMessage: usersMap[id].text,
        };
      })
    );

    res.json(chatList);
  } catch (err) {
    res.status(500).json(err.message);
  }
};