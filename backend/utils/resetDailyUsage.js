const User = require("../models/User");

module.exports = async () => {
  await User.updateMany({}, {
    dailyUsage: 0,
    lastUsageReset: new Date()
  });
};
