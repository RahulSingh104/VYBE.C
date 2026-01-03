const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  caption: { type: String },
  image: { type: String },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: String,
    createdAt: { type: Date, default: Date.now },
  },],
  savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
,
  expiresAt: {
  type: Date,
  default: null,
},

isTemporary: {
  type: Boolean,
  default: false,
},

images: [
  {
    type: String,
  }
],



}, { timestamps: true });

module.exports = mongoose.model("Post", postSchema);
