const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: String,
    isForwarded: {
      type: Boolean,
      default: false,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    chatRoom: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "ChatRoom",
  default: null,
},

  },
  { timestamps: true },
);

module.exports = mongoose.model("Message", messageSchema);
