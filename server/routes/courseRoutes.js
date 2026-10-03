import { Router } from 'express';
import { getPool } from '../config/db.js';

const router = Router();

// 1. Lấy danh sách tất cả các khóa học đào tạo (kèm số học viên đã đăng ký)
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(`
      SELECT c.*, 
             COUNT(ca.id) as attendees_count,
             SUM(CASE WHEN ca.status = 'Đạt chứng chỉ' OR ca.status = 'Hoàn thành' THEN 1 ELSE 0 END) as passed_count
      FROM \`courses\` c
      LEFT JOIN \`course_attendees\` ca ON c.id = ca.course_id
      GROUP BY c.id
      ORDER BY c.start_date DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách khóa học:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 2. Lấy danh sách khóa học của một nhân viên cụ thể (Cổng Nhân viên Self-Service)
router.get('/my-courses/:employeeId', async (req, res) => {
  try {
    const pool = getPool();
    const { employeeId } = req.params;

    const [rows] = await pool.query(`
      SELECT c.*, 
             ca.id as attendee_id,
             ca.status as learning_status,
             ca.score,
             ca.certificate_code,
             ca.registration_date
      FROM \`course_attendees\` ca
      JOIN \`courses\` c ON ca.course_id = c.id
      WHERE ca.employee_id = ?
      ORDER BY c.start_date DESC
    `, [employeeId]);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Lỗi lấy khóa học của nhân viên:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 3. Lấy chi tiết một khóa học (kèm danh sách học viên)
router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    const [courses] = await pool.query('SELECT * FROM `courses` WHERE id = ?', [id]);
    if (courses.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học' });
    }

    const [attendees] = await pool.query(`
      SELECT ca.*, 
             e.name as employee_name, 
             e.email as employee_email, 
             e.department as employee_department,
             e.position as employee_position,
             e.avatar as employee_avatar
      FROM \`course_attendees\` ca
      JOIN \`employees\` e ON ca.employee_id = e.id
      WHERE ca.course_id = ?
      ORDER BY ca.id ASC
    `, [id]);

    res.json({
      success: true,
      data: {
        ...courses[0],
        attendees
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết khóa học:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 4. Tạo khóa học mới
router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    let {
      id,
      title,
      description,
      format,
      instructor,
      start_date,
      end_date,
      budget,
      status
    } = req.body;

    if (!title || !instructor || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Tên khóa học, giảng viên, ngày bắt đầu và ngày kết thúc là bắt buộc.'
      });
    }

    if (!id) {
      const [maxRows] = await pool.query('SELECT COUNT(*) as count FROM `courses`');
      id = `KH${String(maxRows[0].count + 1).padStart(3, '0')}`;
    }

    const [existing] = await pool.query('SELECT id FROM `courses` WHERE id = ?', [id.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: `Mã khóa học "${id}" đã tồn tại.` });
    }

    await pool.query(`
      INSERT INTO \`courses\` 
      (id, title, description, format, instructor, start_date, end_date, budget, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id.trim(),
      title.trim(),
      description || '',
      format || 'Trực tiếp',
      instructor.trim(),
      start_date,
      end_date,
      Number(budget) || 0,
      status || 'upcoming'
    ]);

    // Tạo thông báo phát động khóa học mới cho toàn thể nhân viên
    await pool.query(`
      INSERT INTO \`notifications\` 
      (sender_id, sender_name, recipient_role, recipient_id, type, title, message, link_tab, is_read)
      VALUES ('SYSTEM', 'Phòng Đào Tạo', 'all', NULL, 'general', 'Khóa đào tạo mới được mở đăng ký!', ?, 'emp_dashboard', FALSE)
    `, [`Khóa học "${title}" (${format}) do ${instructor} giảng dạy sẽ bắt đầu từ ${start_date}. Hãy nhanh tay đăng ký tham gia!`]);

    res.status(201).json({
      success: true,
      message: 'Tạo khóa học mới thành công!',
      data: { id: id.trim(), title: title.trim() }
    });
  } catch (error) {
    console.error('Lỗi khi tạo khóa học:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 5. Cập nhật khóa học
router.put('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const {
      title,
      description,
      format,
      instructor,
      start_date,
      end_date,
      budget,
      status
    } = req.body;

    const [existing] = await pool.query('SELECT id FROM `courses` WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học.' });
    }

    await pool.query(`
      UPDATE \`courses\`
      SET title = ?, description = ?, format = ?, instructor = ?, start_date = ?, end_date = ?, budget = ?, status = ?
      WHERE id = ?
    `, [
      title,
      description || '',
      format || 'Trực tiếp',
      instructor,
      start_date,
      end_date,
      Number(budget) || 0,
      status || 'upcoming',
      id
    ]);

    res.json({ success: true, message: 'Cập nhật khóa học thành công!' });
  } catch (error) {
    console.error('Lỗi khi cập nhật khóa học:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 6. Xóa khóa học
router.delete('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    const [existing] = await pool.query('SELECT id, title FROM `courses` WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học.' });
    }

    await pool.query('DELETE FROM `courses` WHERE id = ?', [id]);
    res.json({ success: true, message: `Đã xóa khóa học "${existing[0].title}" thành công.` });
  } catch (error) {
    console.error('Lỗi khi xóa khóa học:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 7. Ghi danh / Đăng ký học viên vào khóa (Học viên tự đăng ký hoặc Manager đề xuất)
router.post('/:id/enroll', async (req, res) => {
  try {
    const pool = getPool();
    const { id: course_id } = req.params;
    const { employee_id, status = 'Đã đăng ký' } = req.body;

    if (!employee_id) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn nhân viên cần ghi danh.' });
    }

    // Kiểm tra khóa học có tồn tại
    const [cCheck] = await pool.query('SELECT title FROM `courses` WHERE id = ?', [course_id]);
    if (cCheck.length === 0) {
      return res.status(404).json({ success: false, message: 'Khóa học không tồn tại.' });
    }

    // Kiểm tra học viên đã đăng ký chưa
    const [existing] = await pool.query(
      'SELECT id FROM `course_attendees` WHERE course_id = ? AND employee_id = ?',
      [course_id, employee_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Nhân viên này đã được ghi danh vào khóa học rồi.' });
    }

    await pool.query(`
      INSERT INTO \`course_attendees\` (course_id, employee_id, status)
      VALUES (?, ?, ?)
    `, [course_id, employee_id, status]);

    // Gửi thông báo đến học viên
    await pool.query(`
      INSERT INTO \`notifications\` 
      (sender_id, sender_name, recipient_role, recipient_id, type, title, message, link_tab, is_read)
      VALUES ('SYSTEM', 'Phòng Đào Tạo', 'employee', ?, 'general', 'Ghi danh khóa học thành công', ?, 'emp_dashboard', FALSE)
    `, [
      employee_id,
      `Bạn đã được ghi danh vào khóa học "${cCheck[0].title}". Trạng thái: ${status}. Vui lòng theo dõi lịch học!`
    ]);

    res.status(201).json({ success: true, message: 'Đăng ký khóa học thành công!' });
  } catch (error) {
    console.error('Lỗi ghi danh khóa học:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 8. Cập nhật kết quả / chấm điểm / cấp chứng chỉ cho học viên
router.put('/:id/attendees/:employeeId', async (req, res) => {
  try {
    const pool = getPool();
    const { id: course_id, employeeId } = req.params;
    const { status, score, certificate_code } = req.body;

    const [existing] = await pool.query(
      'SELECT id FROM `course_attendees` WHERE course_id = ? AND employee_id = ?',
      [course_id, employeeId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Học viên chưa đăng ký khóa học này.' });
    }

    let certCode = certificate_code;
    // Tự động cấp mã chứng chỉ nếu đạt
    if ((status === 'Đạt chứng chỉ' || status === 'Hoàn thành') && !certCode) {
      certCode = `CERT-${course_id}-${employeeId}-${Date.now().toString().slice(-4)}`;
    }

    await pool.query(`
      UPDATE \`course_attendees\`
      SET status = ?, score = ?, certificate_code = ?
      WHERE course_id = ? AND employee_id = ?
    `, [
      status || 'Đang học',
      score !== undefined && score !== '' ? Number(score) : null,
      certCode || null,
      course_id,
      employeeId
    ]);

    res.json({
      success: true,
      message: 'Cập nhật tiến độ học tập và chứng chỉ thành công!',
      data: { status, score, certificate_code: certCode }
    });
  } catch (error) {
    console.error('Lỗi cập nhật học viên:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 9. Hủy ghi danh / Xóa học viên khỏi khóa
router.delete('/:id/attendees/:employeeId', async (req, res) => {
  try {
    const pool = getPool();
    const { id: course_id, employeeId } = req.params;

    await pool.query(
      'DELETE FROM `course_attendees` WHERE course_id = ? AND employee_id = ?',
      [course_id, employeeId]
    );

    res.json({ success: true, message: 'Đã hủy ghi danh học viên khỏi khóa học.' });
  } catch (error) {
    console.error('Lỗi hủy ghi danh:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

export default router;
