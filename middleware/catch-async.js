const catchAsync = (fn) => (_req, _res, _next) => {
  Promise.resolve(fn(_req, _res, _next)).catch(async (_err) => {
    _next(_err);
  });
};

module.exports = catchAsync;
