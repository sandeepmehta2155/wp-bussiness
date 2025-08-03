const catchAsync = require("../middleware/catch-async.js");

const getHelloWorld = catchAsync(async (_req, res) => {
  res.status(200).json({ 
    code: 200, 
    message: "Hello World!" 
  });
});

module.exports = {
  getHelloWorld,
};
