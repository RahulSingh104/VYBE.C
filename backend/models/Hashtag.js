const mongoose = require("mongoose");

const hashtagSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  count: { type: Number, default: 1 },
});

module.exports = mongoose.model("Hashtag", hashtagSchema);
