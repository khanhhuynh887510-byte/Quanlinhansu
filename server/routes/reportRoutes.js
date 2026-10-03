import express from 'express';
import { getPool } from '../config/db.js';

const router = express.Router();

// 1. Lấy danh sách báo cáo công việc
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { employee_id, report_type, from_date, to_date, month, year } = req.query;

    let query = `
      SELECT 
        r.*,
        e.name as employee_name,
        e.department as employee_department,
        e.position as employee_position,
        e.avatar as employee_avatar
      FROM \`work_reports\` r
      JOIN \`employees\` e ON r.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (employee_id && employee_id !== 'all') {
      query += ` AND r.employee_id = ?`;
      params.push(employee_id);
    }
    if (report_type && report_type !== 'all') {
      query += ` AND r.report_type = ?`;
      params.push(report_type);
    }
    if (from_date) {
      query += ` AND r.date >= ?`;
      params.push(from_date);
    }
    if (to_date) {
      query += ` AND r.date <= ?`;
      params.push(to_date);
    }
    if (month && month !== 'all') {
      query += ` AND r.date LIKE ?`;
      params.push(`${month}%`);
    }
    if (year && year !== 'all') {
      query += ` AND r.date LIKE ?`;
      params.push(`${year}%`);
    }

    query += ` ORDER BY r.date DESC, r.created_at DESC`;

    const [rows] = await pool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('Lỗi khi lấy báo cáo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Nhân viên nộp báo cáo mới -> Tự động trigger thông báo tới Admin!
router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    const { employee_id, report_type = 'daily', title, content, date } = req.body;

    if (!employee_id || !title || !content) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ tiêu đề và nội dung báo cáo' });
    }

    const reportDate = date || new Date().toISOString().slice(0, 10);

    // Lấy tên nhân viên
    const [empRows] = await pool.query('SELECT name FROM `employees` WHERE id = ?', [employee_id]);
    const empName = empRows[0]?.name || employee_id;

    const [result] = await pool.query(
      `INSERT INTO \`work_reports\` (employee_id, report_type, title, content, date, status)
       VALUES (?, ?, ?, ?, ?, 'submitted')`,
      [employee_id, report_type, title, content, reportDate]
    );

    // Tự động tạo thông báo gửi tới Admin
    const typeLabel = {
      daily: 'Báo cáo hàng ngày',
      weekly: 'Báo cáo tuần',
      incident: 'Báo cáo sự cố / Giải trình',
      suggestion: 'Đề xuất sáng kiến'
    }[report_type] || 'Báo cáo công việc';

    await pool.query(
      `INSERT INTO \`notifications\` 
       (sender_id, sender_name, recipient_role, recipient_id, type, title, message, link_tab, is_read)
       VALUES (?, ?, 'admin', NULL, 'work_report', ?, ?, 'reports', FALSE)`,
      [
        employee_id,
        empName,
        `Báo cáo mới từ ${empName}`,
        `${empName} vừa nộp [${typeLabel}]: "${title}"`,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Nộp báo cáo thành công và đã gửi thông báo đến Quản trị viên!',
      data: { id: result.insertId, title }
    });
  } catch (error) {
    console.error('Lỗi nộp báo cáo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Quản lý gửi nhận xét/phản hồi báo cáo -> Tự động thông báo tới Nhân viên!
router.put('/:id/feedback', async (req, res) => {
  try {
    const pool = getPool();
    const id = req.params.id;
    const { manager_feedback } = req.body;

    // Lấy thông tin báo cáo
    const [reports] = await pool.query('SELECT * FROM `work_reports` WHERE id = ?', [id]);
    if (reports.length === 0) {
      return res.status(404).json({ success: false, message: 'Báo cáo không tồn tại' });
    }

    const report = reports[0];

    await pool.query(
      `UPDATE \`work_reports\` SET manager_feedback = ?, status = 'reviewed' WHERE id = ?`,
      [manager_feedback, id]
    );

    // Gửi thông báo tới nhân viên
    await pool.query(
      `INSERT INTO \`notifications\` 
       (sender_id, sender_name, recipient_role, recipient_id, type, title, message, link_tab, is_read)
       VALUES ('ADMIN', 'Quản lý', 'employee', ?, 'work_report', 'Báo cáo của bạn đã được nhận xét', ?, 'emp_reports', FALSE)`,
      [
        report.employee_id,
        `Quản lý đã xem và gửi nhận xét về báo cáo: "${report.title}"`,
      ]
    );

    res.json({ success: true, message: 'Đã lưu phản hồi nhận xét và thông báo cho nhân viên' });
  } catch (error) {
    console.error('Lỗi phản hồi báo cáo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Xóa báo cáo
router.delete('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const id = req.params.id;
    await pool.query('DELETE FROM `work_reports` WHERE id = ?', [id]);
    res.json({ success: true, message: 'Đã xóa báo cáo' });
  } catch (error) {
    console.error('Lỗi xóa báo cáo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
