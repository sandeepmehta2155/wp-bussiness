const { Prisma } = require("@prisma/client");
const httpStatus = require("http-status");
const ApiError = require("../utils/api-error.js");

const errorConverter = (err, _req, _res, _next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || error instanceof Prisma.PrismaClientKnownRequestError ? httpStatus.BAD_REQUEST : httpStatus.INTERNAL_SERVER_ERROR;
    const message = error.message || httpStatus[statusCode];
    error = new ApiError(statusCode, message, false, err.stack);
  }
  _next(error);
};

module.exports = errorConverter;

