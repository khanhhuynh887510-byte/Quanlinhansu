import { Router } from 'express';
import { getPool, seedDefaultData } from '../config/db.js';

const router = Router();

// Kiểm tra trạng thái máy chủ và kết nối MySQL
router.get('/health', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT VERSION() as version, DATABASE() as current_db');
    const [empCount] = await pool.query('SELECT COUNT(*) as count FROM `employees`');
    
    res.json({
      success: true,
      status: 'online',
      database: 'connected',
      mysqlVersion: rows[0]?.version,
      currentDatabase: rows[0]?.current_db,
      totalEmployees: empCount[0]?.count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'error',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Khôi phục lại toàn bộ dữ liệu mẫu ban đầu vào MySQL
router.post('/reset', async (req, res) => {
  try {
    const pool = getPool();
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query('TRUNCATE TABLE `attendance`');
    await pool.query('TRUNCATE TABLE `employees`');
    await pool.query('TRUNCATE TABLE `departments`');
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

    await seedDefaultData();

    const [rows] = await pool.query('SELECT * FROM `employees` ORDER BY `id` ASC');
    res.json({
      success: true,
      message: 'Đã khôi phục dữ liệu mẫu thành công trong cơ sở dữ liệu MySQL!',
      data: rows
    });
  } catch (error) {
    console.error('Lỗi khi khôi phục dữ liệu:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi khôi phục dữ liệu', error: error.message });
  }
});

export default router;
