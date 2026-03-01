const express = require("express");
const wpRoute = require("./wp.route.js");
const smartOrderRoute = require("./smart-order.route.js");

const router = express.Router();

const defaultRoutes = [
  {
    path: "/",
    route: wpRoute,
  },
  {
    path: "/api",
    route: smartOrderRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
