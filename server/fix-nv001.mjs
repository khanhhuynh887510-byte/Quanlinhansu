/**
 * Fix: Đặt lại username của NV001 (Nguyễn Hoàng Nam) về "nv001"
 * do bị đổi thành email trong quá trình test trước đó
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'quan_li_nhan_su',
});

try {
  const [before] = await conn.query('SELECT id, username, employee_id FROM `users` WHERE employee_id = ?', ['NV001']);
  console.log('Trước:', before[0]);

  await conn.query(
    'UPDATE `users` SET username = ? WHERE employee_id = ?',
    ['nv001', 'NV001']
  );

  const [after] = await conn.query('SELECT id, username, employee_id FROM `users` WHERE employee_id = ?', ['NV001']);
  console.log('Sau:', after[0]);
  console.log('✅ Đã fix username NV001 → "nv001"');
} catch (err) {
  console.error('❌ Lỗi:', err.message);
} finally {
  await conn.end();
}
