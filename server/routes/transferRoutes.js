import { Router } from 'express';
import { getPool } from '../config/db.js';

const router = Router();

// 1. Lấy tất cả lịch sử điều chuyển toàn công ty
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(`
      SELECT t.*, 
             e.name as employee_name, 
             e.avatar as employee_avatar, 
             e.email as employee_email,
             e.phone as employee_phone,
             e.salary as current_salary
      FROM \`employee_transfers\` t
      LEFT JOIN \`employees\` e ON t.employee_id = e.id
      ORDER BY t.effective_date DESC, t.id DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Lỗi lấy danh sách điều chuyển:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// Thống kê nhanh biến động nhân sự & điều chuyển
router.get('/stats', async (req, res) => {
  try {
    const pool = getPool();
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    const [totalRows] = await pool.query('SELECT COUNT(*) as count FROM `employee_transfers`');
    const [monthRows] = await pool.query(
      'SELECT COUNT(*) as count FROM `employee_transfers` WHERE effective_date LIKE ?',
      [`${currentMonth}%`]
    );
    const [deptRows] = await pool.query(`
      SELECT new_department, COUNT(*) as count 
      FROM \`employee_transfers\` 
      GROUP BY new_department 
      ORDER BY count DESC 
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        total: totalRows[0]?.count || 0,
        thisMonth: monthRows[0]?.count || 0,
        topDepartments: deptRows || []
      }
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê điều chuyển:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 2. Lấy lịch sử điều chuyển của một nhân viên cụ thể
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const pool = getPool();
    const { employeeId } = req.params;

    const [rows] = await pool.query(`
      SELECT t.*, 
             e.name as employee_name, 
             e.avatar as employee_avatar,
             e.email as employee_email
      FROM \`employee_transfers\` t
      LEFT JOIN \`employees\` e ON t.employee_id = e.id
      WHERE t.employee_id = ?
      ORDER BY t.effective_date DESC, t.id DESC
    `, [employeeId]);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Lỗi lấy lịch sử điều chuyển nhân viên:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 3. Lấy chi tiết một quyết định điều chuyển theo ID
router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    const [rows] = await pool.query(`
      SELECT t.*, 
             e.name as employee_name, 
             e.avatar as employee_avatar, 
             e.email as employee_email,
             e.phone as employee_phone,
             e.joinDate as employee_join_date,
             e.cccd as employee_cccd
      FROM \`employee_transfers\` t
      LEFT JOIN \`employees\` e ON t.employee_id = e.id
      WHERE t.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi điều chuyển.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Lỗi lấy chi tiết điều chuyển:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 4. Thực hiện quyết định điều chuyển / thăng chức / giáng chức / cách chức mới
router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    const {
      employee_id,
      decision_type = 'transfer', // 'promotion', 'transfer', 'demotion', 'dismissal'
      new_department,
      new_position,
      new_salary,
      effective_date,
      reason,
      decision_maker_id,
      decision_maker_name
    } = req.body;

    if (!employee_id || !new_department || !new_position || !effective_date || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ: Nhân viên, Phòng ban mới, Chức vụ mới, Ngày hiệu lực và Lý do quyết định.'
      });
    }

    // Lấy thông tin hiện tại của nhân viên
    const [empRows] = await pool.query('SELECT * FROM `employees` WHERE id = ?', [employee_id]);
    if (empRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên trên hệ thống.' });
    }

    const currentEmp = empRows[0];
    const old_department = currentEmp.department;
    const old_position = currentEmp.position;

    // 1. Lưu bản ghi vào bảng employee_transfers
    const [result] = await pool.query(`
      INSERT INTO \`employee_transfers\` 
      (employee_id, decision_type, old_department, new_department, old_position, new_position, effective_date, reason, decision_maker_id, decision_maker_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      employee_id,
      decision_type,
      old_department,
      new_department,
      old_position,
      new_position,
      effective_date,
      reason,
      decision_maker_id || 'ADMIN',
      decision_maker_name || 'Admin HR'
    ]);

    // 2. Cập nhật ngay phòng ban và chức vụ mới cho nhân viên (cùng lương mới nếu có)
    if (new_salary !== undefined && new_salary !== null && Number(new_salary) > 0) {
      await pool.query(`
        UPDATE \`employees\`
        SET department = ?, position = ?, salary = ?
        WHERE id = ?
      `, [new_department, new_position, Number(new_salary), employee_id]);
    } else {
      await pool.query(`
        UPDATE \`employees\`
        SET department = ?, position = ?
        WHERE id = ?
      `, [new_department, new_position, employee_id]);
    }

    // 3. Gửi thông báo đến nhân viên phù hợp với loại quyết định
    const typeTitles = {
      promotion: '🎉 Quyết định Bổ nhiệm & Thăng chức',
      demotion: '⚠️ Quyết định Giáng chức / Hạ cấp bậc',
      dismissal: '⛔ Quyết định Thi hành Kỷ luật Cách chức',
      transfer: '🔄 Quyết định Điều động & Luân chuyển công tác'
    };
    const title = typeTitles[decision_type] || 'Quyết định Điều chuyển công tác';

    await pool.query(`
      INSERT INTO \`notifications\` 
      (sender_id, sender_name, recipient_role, recipient_id, type, title, message, link_tab, is_read)
      VALUES ('SYSTEM', 'Phòng Nhân Sự', 'employee', ?, 'general', ?, ?, 'emp_dashboard', FALSE)
    `, [
      employee_id,
      title,
      `Bạn vừa nhận ${title} từ vị trí "${old_position} - ${old_department}" sang vị trí mới "${new_position} - ${new_department}". Hiệu lực từ: ${effective_date}. Lý do: ${reason}`
    ]);

    const actionText = {
      promotion: 'bổ nhiệm thăng chức',
      demotion: 'giáng chức hạ bậc',
      dismissal: 'kỷ luật cách chức',
      transfer: 'điều chuyển'
    }[decision_type] || 'điều chuyển';

    res.status(201).json({
      success: true,
      message: `Đã ban hành quyết định ${actionText} đối với nhân viên ${currentEmp.name} thành công!`,
      data: {
        id: result.insertId,
        employee_id,
        decision_type,
        old_department,
        new_department,
        old_position,
        new_position,
        effective_date,
        reason
      }
    });
  } catch (error) {
    console.error('Lỗi khi thực hiện điều chuyển:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 5. Cập nhật thông tin quyết định điều chuyển
router.put('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { effective_date, reason, decision_maker_name } = req.body;

    const [existing] = await pool.query('SELECT * FROM `employee_transfers` WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Bản ghi điều chuyển không tồn tại.' });
    }

    await pool.query(`
      UPDATE \`employee_transfers\`
      SET effective_date = COALESCE(?, effective_date),
          reason = COALESCE(?, reason),
          decision_maker_name = COALESCE(?, decision_maker_name)
      WHERE id = ?
    `, [effective_date, reason, decision_maker_name, id]);

    res.json({ success: true, message: 'Cập nhật quyết định điều chuyển thành công!' });
  } catch (error) {
    console.error('Lỗi cập nhật điều chuyển:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 6. Xóa một bản ghi lịch sử điều chuyển
router.delete('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    const [existing] = await pool.query('SELECT id FROM `employee_transfers` WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Bản ghi điều chuyển không tồn tại.' });
    }

    await pool.query('DELETE FROM `employee_transfers` WHERE id = ?', [id]);

    res.json({ success: true, message: 'Đã xóa bản ghi lịch sử điều chuyển.' });
  } catch (error) {
    console.error('Lỗi xóa bản ghi điều chuyển:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

export default router;
