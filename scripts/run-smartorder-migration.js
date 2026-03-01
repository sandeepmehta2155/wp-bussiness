#!/usr/bin/env node

/**
 * Run SmartOrder Database Migration
 *
 * Usage: node scripts/run-smartorder-migration.js
 *        npm run smartorder:migrate
 *
 * This script runs the CREATE_SMART_ORDER_TABLES.sql migration
 */

const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const MIGRATION_FILE = path.join(__dirname, "../migrations/CREATE_SMART_ORDER_TABLES.sql");
const DATABASE_URL = process.env.DATABASE_PG_BOSS_URL || process.env.DATABASE_URL;

const runMigration = () => {
  if (!fs.existsSync(MIGRATION_FILE)) {
    console.error(`❌ Migration file not found: ${MIGRATION_FILE}`);
    process.exit(1);
  }

  if (!DATABASE_URL) {
    console.error("❌ DATABASE_PG_BOSS_URL or DATABASE_URL must be set");
    console.error("Please set the environment variable in your .env file");
    process.exit(1);
  }

  console.log("Running SmartOrder Database Migration...");
  console.log(`Migration file: ${MIGRATION_FILE}`);
  console.log(`Database: ${DATABASE_URL.substring(0, 25)}...`);

  // Build the psql command
  const psqlCommand = `psql "${DATABASE_URL}" -f "${MIGRATION_FILE}"`;

  exec(psqlCommand, (error, stdout, stderr) => {
    if (error) {
      console.error("❌ Migration failed:");
      console.error(error.message);
      console.error(stderr);
      process.exit(1);
    }

    console.log(stdout);

    if (stderr) {
      console.warn("Warnings:");
      console.warn(stderr);
    }

    console.log("\n✅ Migration completed successfully!");
  });
};

runMigration();
