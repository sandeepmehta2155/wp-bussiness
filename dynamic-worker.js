const { myDynamicJobHandler } = require("./dynamic-job-handler.js");
const { getPgBoss } = require("./pg-boss.js");
const CONSTANT = require("./utils/constants.js");

// Register a single worker to handle all dynamic jobs based on their name
const registerWorkers = async () => {
  const pgBoss = await getPgBoss();

  pgBoss.work(CONSTANT.JOB_NAME, async (jobs) => {
    for (const job of jobs) {
      console.log("Processing job:", job);
      await myDynamicJobHandler(job);
    }
  });
};

module.exports = {
  registerWorkers,
};
