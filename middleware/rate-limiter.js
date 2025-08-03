const rateLimit = require("express-rate-limit");

module.exports = {
  authLimiter: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    skipSuccessfulRequests: true,
  }),
};
