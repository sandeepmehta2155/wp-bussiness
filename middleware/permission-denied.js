class PermissionDeniedError extends Error {
    statusCode;
    accessPermission;
    isOperational;
  
    constructor(statusCode, message, isOperational = true, stack = "", data = { categoryPermissionDenied: false }) {
      super(message);
      this.statusCode = statusCode;
      this.isOperational = isOperational;
      this.accessPermission = data;
      this.stack = stack;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  export default PermissionDeniedError;
  