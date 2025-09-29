#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runMigrations() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Get list of executed migrations
    const { rows: executedMigrations } = await pool.query(
      'SELECT filename FROM migrations ORDER BY id'
    );
    const executedSet = new Set(executedMigrations.map(row => row.filename));

    // Read migration files
    const migrationsDir = path.join(__dirname, '../migrations/postgres');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`Found ${migrationFiles.length} migration files`);

    // Execute pending migrations
    for (const filename of migrationFiles) {
      if (executedSet.has(filename)) {
        console.log(`Skipping ${filename} (already executed)`);
        continue;
      }

      console.log(`Executing ${filename}...`);
      const filePath = path.join(migrationsDir, filename);
      const sql = fs.readFileSync(filePath, 'utf8');

      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query('INSERT INTO migrations (filename) VALUES ($1)', [filename]);
        await pool.query('COMMIT');
        console.log(`✓ ${filename} executed successfully`);
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };