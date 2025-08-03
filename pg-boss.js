const PgBoss = require("pg-boss");

let bossInstance = null;

const initializePgBoss = async () => {
  if (bossInstance) {
    return bossInstance;
  }

  bossInstance = new PgBoss({
    connectionString: process.env.DATABASE_PG_BOSS_URL,
    schema: "pgboss",
    application_name: "pgboss",
    max: 5, // Limit connection pool size
  });

  bossInstance.on("error", (error) => {
    console.error("PgBoss error:", error);
  });

  await bossInstance.start();
  console.log("PgBoss started");
  
  return bossInstance;
}

const getPgBoss = () => {
  if (!bossInstance) {
    throw new Error('PgBoss has not been initialized. Call initializePgBoss() first.');
  }
  return bossInstance;
};

module.exports = {
  initializePgBoss,
  getPgBoss
};