const { getPgBoss } = require("../pg-boss.js");
const CONSTANT = require("../utils/constants.js");


const registerJob = async () => {
  const pgBoss = getPgBoss();

  // Create the queue if it doesn't exist
  await pgBoss.createQueue(CONSTANT.JOB_NAME).catch(console.error);

  // Single cron schedule that triggers at all three times
  await pgBoss.schedule(
    CONSTANT.JOB_NAME,
    "38 12,18 * * *", // Runs at 6AM, 6PM
    { subdomain: "test" },
    { tz: CONSTANT.CST_TIMEZONE },
  );
};

module.exports = {
    registerJob
}