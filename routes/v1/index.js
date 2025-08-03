const express = require("express");
const wpRoute = require("./wp.route.js");

const router = express.Router();

const defaultRoutes = [
  {
    path: "/",
    route: wpRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
