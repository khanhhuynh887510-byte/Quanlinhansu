import express from 'express';
import { getPool } from '../config/db.js';

const router = express.Router();

// 1. Lấy danh sách khen thưởng & kỷ luật
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { month, employee_id, type, from_date, to_date, year } = req.query;

    let query = `
      SELECT 
        rp.*,
        e.name as employee_name,
        e.department as employee_department,
        e.avatar as employee_avatar,
        e.position as employee_position
      FROM \`rewards_penalties\` rp
      JOIN \`employees\` e ON rp.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (month && month !== 'all') {
      query += ` AND rp.month = ?`;
      params.push(month);
    }
    if (from_date) {
      query += ` AND rp.date >= ?`;
      params.push(from_date);
    }
    if (to_date) {
      query += ` AND rp.date <= ?`;
      params.push(to_date);
    }
    if (year) {
      query += ` AND rp.month LIKE ?`;
      params.push(`${year}%`);
    }
    if (employee_id && employee_id !== 'all') {
      query += ` AND rp.employee_id = ?`;
      params.push(employee_id);
    }
    if (type && type !== 'all') {
      query += ` AND rp.type = ?`;
      params.push(type);
    }

    query += ` ORDER BY rp.date DESC, rp.id DESC`;

    const [rows] = await pool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách khen thưởng/kỷ luật:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Thêm mới quyết định khen thưởng hoặc xử phạt
router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    const {
      employee_id,
      type, // 'reward' | 'penalty'
      category, // 'attendance' | 'contribution' | 'late' | 'unexcused' | 'project' | 'discipline' | 'other'
      title,
      amount,
      date,
      reason
    } = req.body;

    if (!employee_id || !type || !title || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu các thông tin bắt buộc: employee_id, type, title, amount'
      });
    }

    const actionDate = date || new Date().toISOString().slice(0, 10);
    const month = actionDate.slice(0, 7);

    const [result] = await pool.query(
      `INSERT INTO \`rewards_penalties\` 
       (employee_id, type, category, title, amount, date, month, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [employee_id, type, category || 'other', title, Number(amount), actionDate, month, reason || '']
    );

    // Tự động đồng bộ cập nhật vào bảng lương tháng nếu đã tồn tại
    const [payrollRows] = await pool.query(
      `SELECT * FROM \`payroll\` WHERE employee_id = ? AND month = ?`,
      [employee_id, month]
    );

    if (payrollRows.length > 0) {
      const pr = payrollRows[0];
      let newAttBonus = pr.attendance_bonus;
      let newPerfBonus = pr.performance_bonus;
      let newLatePenalty = pr.late_penalty;
      let newUnexcusedPenalty = pr.unexcused_penalty;
      const val = Number(amount);

      if (type === 'reward') {
        if (category === 'attendance') newAttBonus += val;
        else newPerfBonus += val;
      } else {
        if (category === 'late') newLatePenalty += val;
        else if (category === 'unexcused') newUnexcusedPenalty += val;
        else newLatePenalty += val;
      }

      const dailyRate = Math.round(pr.base_salary / pr.standard_days);
      const earnedBase = dailyRate * pr.actual_days;
      const newNetSalary = Math.max(0, earnedBase + pr.allowance + newAttBonus + newPerfBonus - newLatePenalty - newUnexcusedPenalty - pr.insurance_deduction);

      await pool.query(
        `UPDATE \`payroll\` SET
          attendance_bonus = ?,
          performance_bonus = ?,
          late_penalty = ?,
          unexcused_penalty = ?,
          net_salary = ?
        WHERE id = ?`,
        [newAttBonus, newPerfBonus, newLatePenalty, newUnexcusedPenalty, newNetSalary, pr.id]
      );
    }

    res.status(201).json({
      success: true,
      message: `Đã ghi nhận ${type === 'reward' ? 'khen thưởng' : 'xử phạt'} thành công!`,
      data: {
        id: result.insertId,
        employee_id,
        type,
        category,
        title,
        amount: Number(amount),
        date: actionDate,
        month,
        reason
      }
    });
  } catch (error) {
    console.error('Lỗi khi thêm khen thưởng/kỷ luật:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Xóa một bản ghi khen thưởng / kỷ luật
router.delete('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const id = req.params.id;

    const [rows] = await pool.query('SELECT * FROM `rewards_penalties` WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bản ghi không tồn tại' });
    }

    await pool.query('DELETE FROM `rewards_penalties` WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Đã xóa bản ghi khen thưởng/kỷ luật thành công'
    });
  } catch (error) {
    console.error('Lỗi khi xóa khen thưởng/kỷ luật:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
