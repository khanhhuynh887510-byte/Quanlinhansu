import { Router } from 'express';
import { getPool } from '../config/db.js';

const router = Router();

// 1. Lấy danh sách điểm danh theo ngày (mặc định là hôm nay)
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    const [rows] = await pool.query(
      `SELECT a.*, e.name as employee_name, e.department, e.position, e.avatar
       FROM \`attendance\` a
       JOIN \`employees\` e ON a.employee_id = e.id
       WHERE a.date = ?`,
      [date]
    );

    // Vừa trả về map vừa trả về danh sách chi tiết
    const attendanceMap = {};
    rows.forEach(r => {
      attendanceMap[r.employee_id] = r.status;
    });

    res.json({
      success: true,
      date,
      data: attendanceMap,
      details: rows
    });
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu điểm danh:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 2. Lấy trạng thái điểm danh hôm nay của một nhân viên (Self-Service)
router.get('/today/:employeeId', async (req, res) => {
  try {
    const pool = getPool();
    const { employeeId } = req.params;
    const today = new Date().toISOString().slice(0, 10);

    const [rows] = await pool.query(
      'SELECT * FROM `attendance` WHERE employee_id = ? AND date = ?',
      [employeeId, today]
    );

    res.json({
      success: true,
      data: rows.length > 0 ? rows[0] : null
    });
  } catch (error) {
    console.error('Lỗi lấy điểm danh hôm nay:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 3. Lấy lịch sử điểm danh của một nhân viên
router.get('/history/:employeeId', async (req, res) => {
  try {
    const pool = getPool();
    const { employeeId } = req.params;

    const [rows] = await pool.query(
      'SELECT * FROM `attendance` WHERE employee_id = ? ORDER BY date DESC LIMIT 60',
      [employeeId]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Lỗi lấy lịch sử điểm danh:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 4. Nhân viên thực hiện Check-in (Vào ca)
router.post('/check-in', async (req, res) => {
  try {
    const pool = getPool();
    const { employee_id } = req.body;

    if (!employee_id) {
      return res.status(400).json({ success: false, message: 'Mã nhân viên là bắt buộc' });
    }

    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8); // HH:mm:ss
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Quy định: Vào sau 08:30 là tính đi muộn (late)
    const isLate = hours > 8 || (hours === 8 && minutes > 30);
    const status = isLate ? 'late' : 'present';

    const [existing] = await pool.query(
      'SELECT * FROM `attendance` WHERE employee_id = ? AND date = ?',
      [employee_id, date]
    );

    if (existing.length > 0 && existing[0].check_in_time) {
      return res.status(400).json({
        success: false,
        message: `Bạn đã check-in hôm nay lúc ${existing[0].check_in_time}`
      });
    }

    await pool.query(`
      INSERT INTO \`attendance\` (employee_id, date, check_in_time, status)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        check_in_time = VALUES(check_in_time),
        status = VALUES(status),
        updated_at = CURRENT_TIMESTAMP
    `, [employee_id, date, timeStr, status]);

    res.json({
      success: true,
      message: `Check-in thành công lúc ${timeStr}! Trạng thái: ${isLate ? 'Đi muộn' : 'Đúng giờ'}`,
      data: { date, check_in_time: timeStr, status }
    });
  } catch (error) {
    console.error('Lỗi check-in:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 5. Nhân viên thực hiện Check-out (Tan ca)
router.post('/check-out', async (req, res) => {
  try {
    const pool = getPool();
    const { employee_id } = req.body;

    if (!employee_id) {
      return res.status(400).json({ success: false, message: 'Mã nhân viên là bắt buộc' });
    }

    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8);

    const [existing] = await pool.query(
      'SELECT * FROM `attendance` WHERE employee_id = ? AND date = ?',
      [employee_id, date]
    );

    if (existing.length === 0) {
      // Nếu chưa check-in mà đã check-out
      await pool.query(`
        INSERT INTO \`attendance\` (employee_id, date, check_out_time, status)
        VALUES (?, ?, ?, 'present')
      `, [employee_id, date, timeStr]);
    } else {
      await pool.query(`
        UPDATE \`attendance\`
        SET check_out_time = ?, updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = ? AND date = ?
      `, [timeStr, employee_id, date]);
    }

    res.json({
      success: true,
      message: `Check-out thành công lúc ${timeStr}! Chúc bạn buổi tối vui vẻ.`,
      data: { date, check_out_time: timeStr }
    });
  } catch (error) {
    console.error('Lỗi check-out:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 6. Admin cập nhật trạng thái chấm công thủ công
router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    const { employee_id, date, status } = req.body;

    if (!employee_id || !status) {
      return res.status(400).json({ success: false, message: 'employee_id và status là bắt buộc' });
    }

    const targetDate = date || new Date().toISOString().slice(0, 10);

    await pool.query(
      `INSERT INTO \`attendance\` (employee_id, date, status)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = CURRENT_TIMESTAMP`,
      [employee_id, targetDate, status]
    );

    res.json({ success: true, message: 'Đã cập nhật trạng thái điểm danh' });
  } catch (error) {
    console.error('Lỗi khi lưu điểm danh:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 7. Nhân viên gửi khiếu nại / giải trình điểm danh
router.post('/appeal', async (req, res) => {
  try {
    const pool = getPool();
    const { employee_id, date, reason, requested_status = 'present' } = req.body;

    if (!employee_id || !reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã nhân viên và lý do giải trình' });
    }

    const targetDate = date || new Date().toISOString().slice(0, 10);

    const [empRows] = await pool.query('SELECT name FROM `employees` WHERE id = ?', [employee_id]);
    const empName = empRows[0]?.name || employee_id;

    await pool.query(
      `INSERT INTO \`notifications\` 
       (sender_id, sender_name, recipient_role, recipient_id, type, title, message, link_tab, is_read)
       VALUES (?, ?, 'admin', NULL, 'attendance_appeal', ?, ?, 'attendance', FALSE)`,
      [
        employee_id,
        empName,
        `Giải trình chấm công ngày ${targetDate} từ ${empName}`,
        `${empName} gửi giải trình chấm công ngày ${targetDate}: "${reason}". Đề xuất công nhận: ${requested_status === 'present' ? 'Đúng giờ' : requested_status}`
      ]
    );

    res.json({
      success: true,
      message: 'Đã gửi giải trình chấm công thành công đến Quản trị viên!'
    });
  } catch (error) {
    console.error('Lỗi khi gửi giải trình điểm danh:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

export default router;
