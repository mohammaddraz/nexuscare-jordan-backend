const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5433,
  database: 'nexuscare',
  user: 'postgres',
  password: 'postgres'
});

async function runSeed() {
  try {
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const seedPath = path.join(__dirname, 'database', 'seed.sql');
    
    console.log('Reading schema...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('Running schema...');
    await pool.query(schemaSql);
    
    console.log('Reading seed...');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    console.log('Running seed...');
    await pool.query(seedSql);
    
    console.log('Database seeded successfully!');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    await pool.end();
  }
}

runSeed();
