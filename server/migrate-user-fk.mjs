/**
 * Migration: Đổi FK users.employee_id từ ON DELETE CASCADE → ON DELETE SET NULL
 * Chạy: node server/migrate-user-fk.mjs
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
  // 1. Xoá FK cũ
  await conn.query('ALTER TABLE `users` DROP FOREIGN KEY `fk_user_employee`');
  console.log('✅ Đã xoá FK cũ (ON DELETE CASCADE)');

  // 2. Tạo lại FK mới với ON DELETE SET NULL
  await conn.query(`
    ALTER TABLE \`users\`
    ADD CONSTRAINT \`fk_user_employee\`
    FOREIGN KEY (\`employee_id\`) REFERENCES \`employees\` (\`id\`)
    ON DELETE SET NULL
  `);
  console.log('✅ Đã tạo FK mới (ON DELETE SET NULL)');
  console.log('🎉 Migration hoàn tất! Từ giờ xóa nhân viên sẽ KHÔNG xóa tài khoản đăng nhập của họ.');
} catch (err) {
  console.error('❌ Lỗi migration:', err.message);
} finally {
  await conn.end();
}
