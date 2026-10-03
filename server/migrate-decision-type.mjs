import { initDatabase, getPool } from './config/db.js';

async function migrate() {
  await initDatabase();
  const pool = getPool();
  try {
    await pool.query("ALTER TABLE `employee_transfers` ADD COLUMN `decision_type` VARCHAR(50) NOT NULL DEFAULT 'transfer' AFTER `employee_id`");
    console.log('Successfully added decision_type column!');
  } catch (err) {
    console.log('Notice:', err.message);
  }
  const [cols] = await pool.query('DESCRIBE `employee_transfers`');
  console.log('Columns in employee_transfers:', cols.map(c => c.Field));
  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
