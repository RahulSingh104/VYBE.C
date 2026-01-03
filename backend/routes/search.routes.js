const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const { searchUsers } = require("../controllers/search.controller");

router.get("/", auth, searchUsers);

module.exports = router;