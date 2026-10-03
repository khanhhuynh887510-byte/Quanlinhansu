import express from 'express';
import { getPool } from '../config/db.js';

const router = express.Router();

// 1. Lấy danh sách thông báo theo vai trò và ID người nhận
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { role = 'admin', employee_id } = req.query;

    let query = '';
    let params = [];

    if (role === 'admin') {
      query = `
        SELECT * FROM \`notifications\` 
        WHERE recipient_role IN ('admin', 'all')
        ORDER BY created_at DESC
        LIMIT 80
      `;
    } else {
      query = `
        SELECT * FROM \`notifications\` 
        WHERE (recipient_role = 'employee' AND recipient_id = ?) 
           OR recipient_role = 'all'
        ORDER BY created_at DESC
        LIMIT 80
      `;
      params = [employee_id || ''];
    }

    const [rows] = await pool.query(query, params);
    const unreadCount = rows.filter(r => !r.is_read).length;

    res.json({
      success: true,
      unread_count: unreadCount,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Lỗi khi lấy thông báo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Gửi thông báo mới
router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    const {
      sender_id,
      sender_name,
      recipient_role = 'admin',
      recipient_id,
      type,
      title,
      message,
      link_tab
    } = req.body;

    if (!title || !message || !type) {
      return res.status(400).json({ success: false, message: 'Thiếu tiêu đề, nội dung hoặc loại thông báo' });
    }

    const [result] = await pool.query(
      `INSERT INTO \`notifications\` 
       (sender_id, sender_name, recipient_role, recipient_id, type, title, message, link_tab, is_read)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
      [
        sender_id || 'SYSTEM',
        sender_name || 'Hệ thống',
        recipient_role,
        recipient_id || null,
        type,
        title,
        message,
        link_tab || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Gửi thông báo thành công!',
      data: { id: result.insertId, title, message }
    });
  } catch (error) {
    console.error('Lỗi gửi thông báo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Admin gửi thông báo cá nhân đến nhân viên cụ thể
router.post('/send-to-employee', async (req, res) => {
  try {
    const pool = getPool();
    const { employee_id, title, message, type = 'general', link_tab } = req.body;

    if (!employee_id || !title || !message) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin nhân viên, tiêu đề hoặc nội dung' });
    }

    // Kiểm tra nhân viên tồn tại
    const [empRows] = await pool.query('SELECT name FROM `employees` WHERE id = ?', [employee_id]);
    if (empRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Nhân viên không tồn tại' });
    }

    const [result] = await pool.query(
      `INSERT INTO \`notifications\` 
       (sender_id, sender_name, recipient_role, recipient_id, type, title, message, link_tab, is_read)
       VALUES ('ADMIN', 'Ban Quản Trị', 'employee', ?, ?, ?, ?, ?, FALSE)`,
      [employee_id, type, title, message, link_tab || null]
    );

    res.status(201).json({
      success: true,
      message: `Đã gửi thông báo đến ${empRows[0].name}!`,
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Lỗi gửi thông báo cá nhân:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Admin phát thông báo đến TẤT CẢ nhân viên (broadcast)
router.post('/broadcast', async (req, res) => {
  try {
    const pool = getPool();
    const { title, message, type = 'general', link_tab } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Thiếu tiêu đề hoặc nội dung' });
    }

    const [result] = await pool.query(
      `INSERT INTO \`notifications\` 
       (sender_id, sender_name, recipient_role, recipient_id, type, title, message, link_tab, is_read)
       VALUES ('ADMIN', 'Ban Quản Trị', 'all', NULL, ?, ?, ?, ?, FALSE)`,
      [type, title, message, link_tab || null]
    );

    res.status(201).json({
      success: true,
      message: 'Đã gửi thông báo đến tất cả nhân viên!',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Lỗi broadcast thông báo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ⚠️ QUAN TRỌNG: Route "read-all" phải đặt TRƯỚC route "/:id/read"
// 4. Đánh dấu tất cả đã đọc (phải trước /:id để tránh bị match nhầm)
router.put('/read-all', async (req, res) => {
  try {
    const pool = getPool();
    const { role = 'admin', employee_id } = req.body;

    if (role === 'admin') {
      await pool.query("UPDATE `notifications` SET is_read = TRUE WHERE recipient_role IN ('admin', 'all')");
    } else {
      await pool.query(
        "UPDATE `notifications` SET is_read = TRUE WHERE (recipient_role = 'employee' AND recipient_id = ?) OR recipient_role = 'all'",
        [employee_id]
      );
    }

    res.json({ success: true, message: 'Đã đánh dấu tất cả là đã đọc' });
  } catch (error) {
    console.error('Lỗi đánh dấu tất cả đã đọc:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Xóa tất cả thông báo theo vai trò
router.delete('/clear-all', async (req, res) => {
  try {
    const pool = getPool();
    const { role = 'admin', employee_id } = req.body;

    if (role === 'admin') {
      await pool.query("DELETE FROM `notifications` WHERE recipient_role IN ('admin', 'all')");
    } else {
      await pool.query(
        "DELETE FROM `notifications` WHERE (recipient_role = 'employee' AND recipient_id = ?)",
        [employee_id]
      );
    }

    res.json({ success: true, message: 'Đã xóa tất cả thông báo' });
  } catch (error) {
    console.error('Lỗi xóa tất cả thông báo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. Đánh dấu một thông báo đã đọc
router.put('/:id/read', async (req, res) => {
  try {
    const pool = getPool();
    const id = req.params.id;
    await pool.query('UPDATE `notifications` SET is_read = TRUE WHERE id = ?', [id]);
    res.json({ success: true, message: 'Đã đánh dấu đã đọc' });
  } catch (error) {
    console.error('Lỗi cập nhật thông báo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. Xóa thông báo
router.delete('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const id = req.params.id;
    await pool.query('DELETE FROM `notifications` WHERE id = ?', [id]);
    res.json({ success: true, message: 'Đã xóa thông báo' });
  } catch (error) {
    console.error('Lỗi xóa thông báo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
