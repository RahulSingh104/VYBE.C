export const log = (...args) => {
  if (__DEV__) console.log(...args);
};

export const error = (...args) => {
  console.error(...args);
};
