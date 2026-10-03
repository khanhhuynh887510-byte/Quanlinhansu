import express from 'express';
import { getPool } from '../config/db.js';

const router = express.Router();

// 1. Lấy bảng lương theo tháng (Mặc định là tháng hiện tại nếu không truyền)
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    const [rows] = await pool.query(
      `SELECT 
        p.*,
        e.name as employee_name,
        e.email as employee_email,
        e.phone as employee_phone,
        e.department as employee_department,
        e.position as employee_position,
        e.avatar as employee_avatar
      FROM \`payroll\` p
      JOIN \`employees\` e ON p.employee_id = e.id
      WHERE p.month = ?
      ORDER BY e.department ASC, p.net_salary DESC`,
      [month]
    );

    res.json({
      success: true,
      month,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Lỗi khi lấy bảng lương:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Lấy chi tiết một phiếu lương
router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT 
        p.*,
        e.name as employee_name,
        e.email as employee_email,
        e.phone as employee_phone,
        e.department as employee_department,
        e.position as employee_position,
        e.avatar as employee_avatar,
        e.address as employee_address
      FROM \`payroll\` p
      JOIN \`employees\` e ON p.employee_id = e.id
      WHERE p.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu lương' });
    }

    // Lấy kèm danh sách thưởng phạt của nhân viên trong tháng đó
    const item = rows[0];
    const [rpRows] = await pool.query(
      `SELECT * FROM \`rewards_penalties\` WHERE employee_id = ? AND month = ? ORDER BY date DESC`,
      [item.employee_id, item.month]
    );

    res.json({
      success: true,
      data: {
        ...item,
        rewards_penalties: rpRows
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết phiếu lương:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Tự động tính toán hoặc tính lại bảng lương tháng dựa trên Chấm công và Thưởng/Phạt
router.post('/calculate', async (req, res) => {
  try {
    const pool = getPool();
    const month = req.body.month || new Date().toISOString().slice(0, 7);

    // Lấy danh sách nhân viên
    const [employees] = await pool.query('SELECT * FROM `employees`');

    const calculatedPayrolls = [];

    for (const emp of employees) {
      const baseSalary = Number(emp.salary) || 10000000;
      const standardDays = 26;

      // 1. Phân tích chấm công trong tháng
      const [attRows] = await pool.query(
        `SELECT status, COUNT(*) as count FROM \`attendance\` 
         WHERE employee_id = ? AND date LIKE ? GROUP BY status`,
        [emp.id, `${month}%`]
      );

      let lateCount = 0;
      let absentCount = 0;
      let presentCount = 0;

      for (const row of attRows) {
        if (row.status === 'late') lateCount += row.count;
        if (row.status === 'absent') absentCount += row.count;
        if (row.status === 'present') presentCount += row.count;
      }

      // 2. Lấy các khoản thưởng & phạt trong tháng
      const [rpRows] = await pool.query(
        `SELECT type, category, SUM(amount) as total FROM \`rewards_penalties\`
         WHERE employee_id = ? AND month = ? GROUP BY type, category`,
        [emp.id, month]
      );

      let performanceBonus = 0;
      let customRewardAttendance = 0;
      let customLatePenalty = 0;
      let customUnexcusedPenalty = 0;

      for (const r of rpRows) {
        const amt = Number(r.total) || 0;
        if (r.type === 'reward') {
          if (r.category === 'attendance') {
            customRewardAttendance += amt;
          } else {
            performanceBonus += amt;
          }
        } else if (r.type === 'penalty') {
          if (r.category === 'late') {
            customLatePenalty += amt;
          } else if (r.category === 'unexcused') {
            customUnexcusedPenalty += amt;
          } else {
            customLatePenalty += amt;
          }
        }
      }

      // 3. Quy chế tính toán
      // Thưởng chuyên cần: nếu đi làm đủ 26 ngày (hoặc vắng 0, muộn 0) -> 1,000,000 VNĐ
      let attendanceBonus = customRewardAttendance;
      if (attendanceBonus === 0 && lateCount === 0 && absentCount === 0) {
        attendanceBonus = 1000000;
      }

      // Phạt đi muộn: nếu có phạt ghi nhận thì lấy, không thì tính 100k / lần
      let latePenalty = customLatePenalty > 0 ? customLatePenalty : lateCount * 100000;

      // Nghỉ không phép: trừ lương thực tế + phạt
      let actualDays = Math.max(0, standardDays - absentCount);
      const dailyRate = Math.round(baseSalary / standardDays);
      let unexcusedPenalty = customUnexcusedPenalty + (absentCount * dailyRate);

      // Phụ cấp chuẩn: 1,200,000 VNĐ (cơm trưa, điện thoại, xăng xe)
      const allowance = 1200000;

      // Bảo hiểm Xã hội bắt buộc (10.5% lương cơ bản)
      const insuranceDeduction = Math.round(baseSalary * 0.105);

      // Tính tổng thực lĩnh
      const earnedBase = dailyRate * actualDays;
      const netSalary = Math.max(0, earnedBase + allowance + attendanceBonus + performanceBonus - latePenalty - unexcusedPenalty - insuranceDeduction);

      const payrollId = `PR-${month}-${emp.id}`;

      // Tạo ghi chú tự động
      const notesList = [];
      if (attendanceBonus > 0) notesList.push(`Thưởng chuyên cần +${attendanceBonus.toLocaleString('vi-VN')}đ`);
      if (performanceBonus > 0) notesList.push(`Thưởng đóng góp/KPI +${performanceBonus.toLocaleString('vi-VN')}đ`);
      if (latePenalty > 0) notesList.push(`Phạt đi muộn -${latePenalty.toLocaleString('vi-VN')}đ (${lateCount} lần)`);
      if (unexcusedPenalty > 0) notesList.push(`Trừ nghỉ không phép -${unexcusedPenalty.toLocaleString('vi-VN')}đ`);

      // Cập nhật hoặc thêm mới (Upsert)
      await pool.query(
        `INSERT INTO \`payroll\` 
        (id, employee_id, month, base_salary, standard_days, actual_days, late_count, absent_unexcused, absent_excused, allowance, attendance_bonus, performance_bonus, late_penalty, unexcused_penalty, insurance_deduction, net_salary, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
        ON DUPLICATE KEY UPDATE
          base_salary = VALUES(base_salary),
          actual_days = VALUES(actual_days),
          late_count = VALUES(late_count),
          absent_unexcused = VALUES(absent_unexcused),
          allowance = VALUES(allowance),
          attendance_bonus = VALUES(attendance_bonus),
          performance_bonus = VALUES(performance_bonus),
          late_penalty = VALUES(late_penalty),
          unexcused_penalty = VALUES(unexcused_penalty),
          insurance_deduction = VALUES(insurance_deduction),
          net_salary = VALUES(net_salary),
          notes = VALUES(notes)`,
        [
          payrollId,
          emp.id,
          month,
          baseSalary,
          standardDays,
          actualDays,
          lateCount,
          absentCount,
          0,
          allowance,
          attendanceBonus,
          performanceBonus,
          latePenalty,
          unexcusedPenalty,
          insuranceDeduction,
          netSalary,
          notesList.join(' | ') || 'Đầy đủ công chuẩn'
        ]
      );

      calculatedPayrolls.push({
        id: payrollId,
        employee_id: emp.id,
        employee_name: emp.name,
        net_salary: netSalary
      });
    }

    res.json({
      success: true,
      message: `Đã tự động tính toán bảng lương tháng ${month} cho ${calculatedPayrolls.length} nhân viên`,
      data: calculatedPayrolls
    });
  } catch (error) {
    console.error('Lỗi tính toán bảng lương:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Cập nhật trạng thái hoặc điều chỉnh thông số phiếu lương
router.put('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const id = req.params.id;
    const {
      status,
      attendance_bonus,
      performance_bonus,
      late_penalty,
      unexcused_penalty,
      allowance,
      notes
    } = req.body;

    // Lấy thông tin hiện tại
    const [existing] = await pool.query('SELECT * FROM `payroll` WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu lương' });
    }

    const current = existing[0];
    const newAttBonus = attendance_bonus !== undefined ? Number(attendance_bonus) : current.attendance_bonus;
    const newPerfBonus = performance_bonus !== undefined ? Number(performance_bonus) : current.performance_bonus;
    const newLatePenalty = late_penalty !== undefined ? Number(late_penalty) : current.late_penalty;
    const newUnexcusedPenalty = unexcused_penalty !== undefined ? Number(unexcused_penalty) : current.unexcused_penalty;
    const newAllowance = allowance !== undefined ? Number(allowance) : current.allowance;
    const newStatus = status || current.status;
    const paymentDate = newStatus === 'paid' && !current.payment_date 
      ? new Date().toISOString().replace('T', ' ').slice(0, 16) 
      : current.payment_date;

    // Tính lại Net Salary
    const dailyRate = Math.round(current.base_salary / current.standard_days);
    const earnedBase = dailyRate * current.actual_days;
    const netSalary = Math.max(0, earnedBase + newAllowance + newAttBonus + newPerfBonus - newLatePenalty - newUnexcusedPenalty - current.insurance_deduction);

    await pool.query(
      `UPDATE \`payroll\` SET
        status = ?,
        payment_date = ?,
        attendance_bonus = ?,
        performance_bonus = ?,
        late_penalty = ?,
        unexcused_penalty = ?,
        allowance = ?,
        net_salary = ?,
        notes = ?
      WHERE id = ?`,
      [
        newStatus,
        paymentDate,
        newAttBonus,
        newPerfBonus,
        newLatePenalty,
        newUnexcusedPenalty,
        newAllowance,
        netSalary,
        notes !== undefined ? notes : current.notes,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Cập nhật phiếu lương thành công',
      data: {
        id,
        status: newStatus,
        payment_date: paymentDate,
        net_salary: netSalary
      }
    });
  } catch (error) {
    console.error('Lỗi cập nhật phiếu lương:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Thanh toán hàng loạt phiếu lương tháng
router.post('/bulk-pay', async (req, res) => {
  try {
    const pool = getPool();
    const { month } = req.body;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const [result] = await pool.query(
      `UPDATE \`payroll\` SET status = 'paid', payment_date = ? WHERE month = ?`,
      [now, month]
    );

    res.json({
      success: true,
      message: `Đã xác nhận thanh toán toàn bộ bảng lương tháng ${month} (${result.affectedRows} nhân viên)`,
      payment_date: now
    });
  } catch (error) {
    console.error('Lỗi thanh toán bảng lương:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
