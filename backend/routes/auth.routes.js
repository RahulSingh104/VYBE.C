const router = require("express").Router();
const { register, login } = require("../controllers/auth.controller");

router.post("/register", register);
router.post("/login", login);
router.post("/create-admin", async (req, res) => {
  const user = new User({
    name: "Super Admin",
    email: "admin@gmail.com",
    password: await bcrypt.hash("admin123", 10),
    isAdmin: true
  });

  await user.save();
  res.json("Admin created");
});


module.exports = router;
