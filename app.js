const express = require("express");
const compression = require("compression");
const helmet = require("helmet");
const cors = require("cors");
const passport = require("passport");
const httpStatus = require("http-status");
const { jwtStrategy } = require("./config/passport");
const routes = require("./routes/v1/index.js");
const ApiError = require("./utils/api-error.js");
const errorConverter = require("./middleware/error-converter.js");
const errorHandler = require("./middleware/error-handler.js");
const { initializePgBoss } = require("./pg-boss");
const { registerJob } = require("./job-registeration.service");
const { registerWorkers } = require("./dynamic-worker");
const app = express();
const bodyParser = require("body-parser");

app.use(bodyParser.json());

app.use(compression());

app.use(express.json({ limit: "50mb" }));

// set security HTTP headers
app.use(helmet());

// parse json request body
app.use(express.json());

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// enable cors
app.use(cors());

// app.options("*", cors());

// Optional fallthrough error handler
app.use(function onError(_err, _req, _res, _next) {
  // The error id is attached to `res.sentry` to be returned
  // and optionally displayed to the user for support.
  _res.statusCode = 500;

  _next();
});

// jwt authentication
app.use(passport.initialize());
passport.use("jwt", jwtStrategy);

// v1 api routes
app.use("/", routes);

// send back a 404 error for any unknown api request
app.use((_req, _res, _next) => {
  _next(new ApiError(httpStatus.NOT_FOUND, "Not found"));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

const initializeBackgroundJobs = async () => {
  try {
    await initializePgBoss();
    await registerJob();
    await registerWorkers();
  } catch (error) {
    console.error('Failed to initialize background jobs:', error);
    process.exit(1);
  }
};

const startServer = async () => {
  try {
    await initializeBackgroundJobs();
    
    app.listen(3000, () => {
      console.log("Server started on port 3000");
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
