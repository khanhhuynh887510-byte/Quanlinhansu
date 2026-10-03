/**
 * Script xuất toàn bộ database ra file SQL
 * Chạy: node server/export_db.mjs
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'quan_li_nhan_su',
  charset: 'utf8mb4',
};

const DB_NAME = process.env.DB_NAME || 'quan_li_nhan_su';
const OUTPUT_FILE = path.resolve(__dirname, '../database_export.sql');

function escapeValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  if (Buffer.isBuffer(val)) return `0x${val.toString('hex')}`;
  // Escape string
  return `'${String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\0/g, '\\0')}'`;
}

async function exportDatabase() {
  const conn = await mysql.createConnection(dbConfig);
  const output = [];
  const timestamp = new Date().toISOString();

  console.log(`🔗 Đã kết nối MySQL: ${dbConfig.host}:${dbConfig.port} | DB: ${DB_NAME}`);

  // Header
  output.push(`-- ============================================================`);
  output.push(`-- Database Export: ${DB_NAME}`);
  output.push(`-- Exported at: ${timestamp}`);
  output.push(`-- Host: ${dbConfig.host}:${dbConfig.port}`);
  output.push(`-- ============================================================`);
  output.push('');
  output.push(`SET NAMES 'utf8mb4';`);
  output.push(`SET CHARACTER_SET_CLIENT = utf8mb4;`);
  output.push(`SET CHARACTER_SET_RESULTS = utf8mb4;`);
  output.push(`SET COLLATION_CONNECTION = utf8mb4_unicode_ci;`);
  output.push(`SET FOREIGN_KEY_CHECKS = 0;`);
  output.push('');
  output.push(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  output.push(`USE \`${DB_NAME}\`;`);
  output.push('');

  // Lấy danh sách bảng
  const [tables] = await conn.query(`SHOW TABLES FROM \`${DB_NAME}\``);
  const tableKey = `Tables_in_${DB_NAME}`;
  const tableNames = tables.map(t => t[tableKey]);
  console.log(`📋 Tìm thấy ${tableNames.length} bảng: ${tableNames.join(', ')}`);

  for (const tableName of tableNames) {
    console.log(`  ⏳ Xuất bảng: ${tableName}...`);

    // CREATE TABLE statement
    const [[createRow]] = await conn.query(`SHOW CREATE TABLE \`${tableName}\``);
    const createSQL = createRow['Create Table'];
    output.push(`-- --------------------------------------------------------`);
    output.push(`-- Cấu trúc bảng: ${tableName}`);
    output.push(`-- --------------------------------------------------------`);
    output.push('');
    output.push(`DROP TABLE IF EXISTS \`${tableName}\`;`);
    output.push(`${createSQL};`);
    output.push('');

    // INSERT data
    const [rows] = await conn.query(`SELECT * FROM \`${tableName}\``);
    if (rows.length > 0) {
      output.push(`-- Dữ liệu của bảng \`${tableName}\` (${rows.length} hàng)`);
      
      const columns = Object.keys(rows[0]).map(c => `\`${c}\``).join(', ');
      
      // Chia thành batch 100 rows
      const BATCH = 100;
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const values = batch.map(row =>
          `(${Object.values(row).map(escapeValue).join(', ')})`
        ).join(',\n  ');
        output.push(`INSERT INTO \`${tableName}\` (${columns}) VALUES`);
        output.push(`  ${values};`);
      }
      output.push('');
      console.log(`  ✅ ${tableName}: ${rows.length} hàng`);
    } else {
      output.push(`-- Bảng \`${tableName}\` trống (0 hàng)`);
      output.push('');
      console.log(`  ✅ ${tableName}: (trống)`);
    }
  }

  // Footer
  output.push('');
  output.push(`SET FOREIGN_KEY_CHECKS = 1;`);
  output.push('');
  output.push(`-- ============================================================`);
  output.push(`-- Kết thúc export: ${DB_NAME}`);
  output.push(`-- Tổng số bảng: ${tableNames.length}`);
  output.push(`-- ============================================================`);

  // Ghi file
  const content = output.join('\n');
  fs.writeFileSync(OUTPUT_FILE, content, 'utf8');

  const sizeKB = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1);
  console.log('');
  console.log(`✅ Xuất thành công!`);
  console.log(`📁 File: ${OUTPUT_FILE}`);
  console.log(`📦 Kích thước: ${sizeKB} KB`);
  console.log(`📊 Tổng bảng: ${tableNames.length}`);

  await conn.end();
}

exportDatabase().catch(err => {
  console.error('❌ Lỗi:', err.message);
  process.exit(1);
});
