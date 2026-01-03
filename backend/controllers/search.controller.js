const User = require("../models/User");

/*
  GET /api/search?q=rahul
*/
exports.searchUsers = async (req, res) => {
  try {
    const query = req.query.q;

    if (!query) {
      return res.json([]);
    }

    const users = await User.find({
      name: { $regex: query, $options: "i" },
    })
      .select("name profileImage")
      .limit(20);

    res.json(users);
  } catch (err) {
    console.error("Search error:", err.message);
    res.status(500).json({ message: "Search failed" });
  }
};
