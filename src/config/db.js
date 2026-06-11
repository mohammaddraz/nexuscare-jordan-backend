const { Client } = require('pg');
require('dotenv').config();

const pgclient = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pgclient.connect()
  .then(() => console.log('✅ Connected to PostgreSQL'))
  .catch((err) => {
    console.error('❌ PostgreSQL connection error:', err);
    process.exit(-1);
  });

module.exports = pgclient;
