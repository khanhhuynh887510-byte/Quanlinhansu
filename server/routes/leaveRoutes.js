import express from 'express';
import { getPool } from '../config/db.js';

const router = express.Router();

// 1. Lấy danh sách đơn nghỉ phép (Hỗ trợ lọc theo trạng thái, nhân viên, hoặc phòng ban cho Manager)
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { status, employee_id, department, from_date, to_date, month, year } = req.query;

    let query = `
      SELECT 
        l.*,
        e.name as employee_name,
        e.department as employee_department,
        e.position as employee_position,
        e.avatar as employee_avatar
      FROM \`leave_requests\` l
      JOIN \`employees\` e ON l.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ` AND l.status = ?`;
      params.push(status);
    }
    if (employee_id && employee_id !== 'all') {
      query += ` AND l.employee_id = ?`;
      params.push(employee_id);
    }
    if (department && department !== 'all') {
      query += ` AND e.department = ?`;
      params.push(department);
    }
    if (from_date) {
      query += ` AND l.to_date >= ?`;
      params.push(from_date);
    }
    if (to_date) {
      query += ` AND l.from_date <= ?`;
      params.push(to_date);
    }
    if (month && month !== 'all') {
      query += ` AND (l.from_date LIKE ? OR l.to_date LIKE ?)`;
      params.push(`${month}%`, `${month}%`);
    }
    if (year && year !== 'all') {
      query += ` AND (l.from_date LIKE ? OR l.to_date LIKE ?)`;
      params.push(`${year}%`, `${year}%`);
    }

    query += ` ORDER BY l.created_at DESC`;

    const [rows] = await pool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách nghỉ phép:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Tạo đơn xin nghỉ phép mới
router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    const {
      employee_id,
      leave_type,
      from_date,
      to_date,
      days_count,
      reason
    } = req.body;

    if (!employee_id || !leave_type || !from_date || !to_date || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin đơn nghỉ phép'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO \`leave_requests\` 
       (employee_id, leave_type, from_date, to_date, days_count, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [employee_id, leave_type, from_date, to_date, Number(days_count) || 1.0, reason]
    );

    // Lấy thông tin nhân viên
    const [empRows] = await pool.query('SELECT name, department FROM `employees` WHERE id = ?', [employee_id]);
    const empName = empRows[0]?.name || employee_id;
    const empDept = empRows[0]?.department || '';

    // Gửi thông báo tới Admin & Manager
    await pool.query(
      `INSERT INTO \`notifications\` 
       (sender_id, sender_name, recipient_role, recipient_id, type, title, message, link_tab, is_read)
       VALUES (?, ?, 'all', NULL, 'leave_request', 'Đơn xin nghỉ phép mới', ?, 'leaves', FALSE)`,
      [
        employee_id,
        empName,
        `Nhân viên ${empName} (${empDept}) vừa gửi đơn xin nghỉ phép từ ${from_date} đến ${to_date} (${days_count} ngày). Lý do: ${reason}`
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Gửi đơn xin nghỉ phép thành công. Đang chờ quản lý phê duyệt!',
      data: {
        id: result.insertId,
        employee_id,
        leave_type,
        from_date,
        to_date,
        days_count,
        reason,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Lỗi tạo đơn nghỉ phép:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Phê duyệt hoặc Từ chối đơn nghỉ phép (Hỗ trợ Admin và Department Manager)
router.put('/:id/status', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { status, approver_id, approver_name } = req.body;

    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ (approved, rejected, pending)'
      });
    }

    const [leaves] = await pool.query(
      `SELECT l.*, e.name as employee_name 
       FROM \`leave_requests\` l
       JOIN \`employees\` e ON l.employee_id = e.id
       WHERE l.id = ?`,
      [id]
    );

    if (leaves.length === 0) {
      return res.status(404).json({ success: false, message: 'Đơn nghỉ phép không tồn tại' });
    }

    const leave = leaves[0];

    await pool.query(
      `UPDATE \`leave_requests\` 
       SET status = ?, approver_id = ?, approver_name = ?
       WHERE id = ?`,
      [status, approver_id || null, approver_name || null, id]
    );

    // Gửi thông báo đến nhân viên về kết quả xét duyệt
    const statusText = status === 'approved' ? 'chấp thuận (Đã duyệt)' : 'từ chối';
    await pool.query(
      `INSERT INTO \`notifications\` 
       (sender_id, sender_name, recipient_role, recipient_id, type, title, message, link_tab, is_read)
       VALUES (?, ?, 'employee', ?, 'leave_request', 'Kết quả xét duyệt đơn nghỉ phép', ?, 'emp_leaves', FALSE)`,
      [
        approver_id || 'SYSTEM',
        approver_name || 'Người Quản Lý',
        leave.employee_id,
        `Đơn xin nghỉ phép từ ${leave.from_date} đến ${leave.to_date} của bạn đã được ${approver_name || 'Quản lý'} ${statusText}.`
      ]
    );

    res.json({
      success: true,
      message: `Đã ${status === 'approved' ? 'phê duyệt' : 'từ chối'} đơn nghỉ phép thành công!`
    });
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái đơn nghỉ phép:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Xóa đơn nghỉ phép
router.delete('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    await pool.query('DELETE FROM \`leave_requests\` WHERE id = ?', [id]);
    res.json({ success: true, message: 'Đã xóa đơn nghỉ phép' });
  } catch (error) {
    console.error('Lỗi xóa đơn nghỉ phép:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
