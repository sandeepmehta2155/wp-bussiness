const { inHTMLData } = require("xss-filters");

/**
 * Clean for xss.
 * @param {string/object} data - The value to sanitize
 * @return {string/object} The sanitized value
 */
const clean = (data = "") => {
  let isObject = false;
  if (typeof data === "object") {
    data = JSON.stringify(data);
    isObject = true;
  }

  data = inHTMLData(data).trim();
  if (isObject) {
    try {
      data = JSON.parse(data);
    } catch {
      console.log("error in middleware -> xss.ts line 21");

      data = "";
    }
  }

  return data;
};

const middleware = () => {
  return (_req, _res, next) => {
    if (_req.body) _req.body = clean(_req.body);
    if (_req.query) _req.query = clean(_req.query);
    if (_req.params) _req.params = clean(_req.params);
    next();
  };
};

module.exports = middleware;
