const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5433/nexuscare' });

async function run() {
  const { rows } = await pool.query('SELECT password_hash FROM USERS WHERE email = $1', ['admin@nexuscare.com']);
  const hash = rows[0].password_hash;
  console.log('Hash from DB:', hash);
  const isMatch = await bcrypt.compare('password123', hash);
  console.log('Match?', isMatch);
}

run().catch(console.error).finally(() => pool.end());
