const Filter = require("bad-words");
const filter = new Filter();

exports.checkContent = (text) => {
  return filter.isProfane(text); // TRUE if abusive
};
