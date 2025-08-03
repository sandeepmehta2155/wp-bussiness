const httpStatus = require("http-status");
const config = require("../config/config.js");

const errorHandler = (err, _req, res, _next) => {
  let statusCode = httpStatus.INTERNAL_SERVER_ERROR;
  let message = 'Internal Server Error';
  
  if (err.statusCode) {
    statusCode = err.statusCode;
  }
  
  if (err.message) {
    message = err.message;
  }

  // In production, don't leak error details
  if (config.env === 'production' && !err.isOperational) {
    message = httpStatus[statusCode];
  }

  const response = {
    code: statusCode,
    message,
    ...(config.env === 'development' && { 
      stack: err.stack,
      error: err 
    })
  };

  if (config.env === 'development') {
    console.error('Error:', err);
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;