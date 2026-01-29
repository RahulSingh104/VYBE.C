const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  caption: { type: String },
  image: {
  url: { type: String },
  public_id: { type: String },
},

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
    url: { type: String },
    public_id: { type: String },
  }
],


tag: {
  type: String,
  enum: ["college", "tech", "memes", "placements", "confession"],
  default: "college"
},
isDiscussion: {
  type: Boolean,
  default: false,
},
createdBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  required: true,
},
isAnonymous: {
  type: Boolean,
  default: false,
},
mood: {
  type: String,
  enum: ["happy", "sad", "angry", "motivated", "stressed"],
  default: "happy",
}


}, { timestamps: true });

module.exports = mongoose.model("Post", postSchema);
