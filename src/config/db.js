const { Client } = require('pg');
require('dotenv').config();

// Railway provides DATABASE_URL; local dev uses individual DB_* vars
const connectionConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_DATABASE,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    };

const pgclient = new Client(connectionConfig);

pgclient.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch((err) => {
    console.error('PostgreSQL connection error:', err);
    process.exit(-1);
  });

module.exports = pgclient;
