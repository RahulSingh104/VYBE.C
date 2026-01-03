const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  college: { type: String, default: "" },
  branch: { type: String, default: "" },
  bio: { type: String, default: "" },
  profileImage: { type: String, default: "" },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  isPrivate: {
  type: Boolean,
  default: false,
  },
  followRequests: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
],
mutedStories: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  isAdmin: {
  type: Boolean,
  default: false,
},

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
