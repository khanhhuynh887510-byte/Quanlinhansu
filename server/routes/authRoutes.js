import express from 'express';
import { getPool, hashPassword, comparePassword } from '../config/db.js';

const router = express.Router();

// 1. Đăng nhập hệ thống (Bảo mật Bcrypt & Kiểm tra trạng thái khóa/mở)
router.post('/login', async (req, res) => {
  try {
    const pool = getPool();
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
    }

    const [users] = await pool.query(
      `SELECT u.id, u.username, u.password, u.role, u.status, u.employee_id,
              e.name as employee_name, e.email as employee_email, e.department as employee_department,
              e.position as employee_position, e.avatar as employee_avatar, e.phone as employee_phone
       FROM \`users\` u
       LEFT JOIN \`employees\` e ON u.employee_id = e.id
       WHERE LOWER(u.username) = LOWER(?)`,
      [username.trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Tên đăng nhập không tồn tại' });
    }

    const user = users[0];

    // Kiểm tra trạng thái tài khoản
    if (user.status === 0) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản này hiện đang bị khóa. Vui lòng liên hệ Quản trị viên (HR Admin) để được hỗ trợ.'
      });
    }

    // So sánh mật khẩu bằng Bcrypt (kèm tương thích mật khẩu cũ)
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Mật khẩu không chính xác' });
    }

    // Nếu mật khẩu cũ lưu dạng plain text, tự động nâng cấp sang bcrypt
    if (user.password === password) {
      const newHash = await hashPassword(password);
      await pool.query('UPDATE `users` SET password = ? WHERE id = ?', [newHash, user.id]);
    }

    // Chuẩn hóa role về chữ thường
    user.role = (user.role || 'employee').toLowerCase();

    // Không trả mật khẩu về client
    delete user.password;

    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      data: user
    });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Đăng ký tài khoản mới (Hỗ trợ Admin, Manager, Employee & Mã hóa Bcrypt)
router.post('/register', async (req, res) => {
  try {
    const pool = getPool();
    const { username, password, role = 'employee', employee_id } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đủ tên đăng nhập và mật khẩu' });
    }

    if (password.length < 3) {
      return res.status(400).json({ success: false, message: 'Mật khẩu tối thiểu 3 ký tự' });
    }

    const normRole = role.toLowerCase();
    if (!['admin', 'manager', 'employee'].includes(normRole)) {
      return res.status(400).json({ success: false, message: 'Vai trò không hợp lệ (admin, manager, employee)' });
    }

    // Kiểm tra username đã tồn tại chưa
    const [existing] = await pool.query('SELECT id FROM `users` WHERE LOWER(username) = LOWER(?)', [username.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập đã được sử dụng' });
    }

    let finalEmployeeId = employee_id;

    // Trường hợp 1: Nhân viên tự đăng ký mới (Self-Registration) không cần admin tạo trước
    if (normRole === 'employee' && (!employee_id || req.body.self_register || req.body.name)) {
      const {
        name,
        email,
        phone,
        department = 'Kỹ thuật & Công nghệ (IT)',
        position = 'Nhân viên',
        dob,
        gender = 'Nam',
        address = '',
        cccd,
        avatar
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập họ và tên nhân viên để tạo hồ sơ.' });
      }

      // Tạo mã nhân viên tiếp theo tự động (ví dụ: NV018)
      const [maxRows] = await pool.query("SELECT MAX(CAST(SUBSTRING(id, 3) AS UNSIGNED)) as maxNum FROM `employees` WHERE id REGEXP '^NV[0-9]{1,4}$'");
      let nextNum = ((maxRows[0]?.maxNum && maxRows[0].maxNum < 1000) ? maxRows[0].maxNum : 0) + 1;
      finalEmployeeId = `NV${String(nextNum).padStart(3, '0')}`;

      let [existingEmp] = await pool.query('SELECT id FROM `employees` WHERE id = ?', [finalEmployeeId]);
      while (existingEmp.length > 0) {
        nextNum++;
        finalEmployeeId = `NV${String(nextNum).padStart(3, '0')}`;
        [existingEmp] = await pool.query('SELECT id FROM `employees` WHERE id = ?', [finalEmployeeId]);
      }

      // Tạo hồ sơ nhân viên trong MySQL
      await pool.query(
        `INSERT INTO \`employees\` 
         (id, name, email, phone, department, position, salary, status, joinDate, dob, gender, address, cccd, avatar, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          finalEmployeeId,
          name.trim(),
          email?.trim() || `${username.trim()}@company.vn`,
          phone?.trim() || '',
          department,
          position,
          15000000,
          'Đang làm việc',
          new Date().toISOString().slice(0, 10),
          dob || null,
          gender,
          address,
          cccd || null,
          avatar || '',
          'Nhân viên tự đăng ký tài khoản từ hệ thống'
        ]
      );

      // Tạo thông báo chào mừng nhân viên mới
      await pool.query(
        `INSERT INTO \`notifications\` 
         (sender_id, sender_name, recipient_role, recipient_id, type, title, message, link_tab, is_read) 
         VALUES ('SYSTEM', 'Ban Giám Đốc', 'employee', ?, 'general', 'Chào mừng thành viên mới!', ?, 'emp_dashboard', FALSE)`,
        [
          finalEmployeeId,
          `Chào mừng ${name.trim()} gia nhập công ty! Bạn có thể sử dụng Cổng nhân viên để điểm danh, tra cứu phiếu lương và cập nhật hồ sơ cá nhân.`
        ]
      );
    } 
    // Trường hợp 2: Liên kết với nhân viên đã có sẵn
    else if (normRole !== 'admin') {
      if (!finalEmployeeId) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn nhân viên liên kết hoặc nhập thông tin đăng ký mới' });
      }
      const [empCheck] = await pool.query('SELECT id FROM `employees` WHERE id = ?', [finalEmployeeId]);
      if (empCheck.length === 0) {
        return res.status(400).json({ success: false, message: 'Mã nhân viên không tồn tại trên hệ thống' });
      }

      // Kiểm tra xem nhân viên này đã có tài khoản chưa
      const [linkedCheck] = await pool.query('SELECT id FROM `users` WHERE employee_id = ?', [finalEmployeeId]);
      if (linkedCheck.length > 0) {
        return res.status(400).json({ success: false, message: 'Nhân viên này đã có tài khoản' });
      }
    }

    const hashedPassword = await hashPassword(password);

    const [result] = await pool.query(
      `INSERT INTO \`users\` (username, password, role, status, employee_id) VALUES (?, ?, ?, 1, ?)`,
      [username.trim(), hashedPassword, normRole, finalEmployeeId || null]
    );

    // Lấy thông tin user vừa tạo
    const [newUsers] = await pool.query(
      `SELECT u.id, u.username, u.role, u.status, u.employee_id,
              e.name as employee_name, e.email as employee_email, e.department as employee_department,
              e.position as employee_position, e.avatar as employee_avatar, e.phone as employee_phone
       FROM \`users\` u
       LEFT JOIN \`employees\` e ON u.employee_id = e.id
       WHERE u.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      data: newUsers[0]
    });
  } catch (error) {
    console.error('Lỗi đăng ký tài khoản:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Lấy danh sách tất cả tài khoản
router.get('/users', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.role, u.status, u.employee_id, u.created_at,
              e.name as employee_name, e.department as employee_department,
              e.position as employee_position, e.avatar as employee_avatar, e.email as employee_email
       FROM \`users\` u
       LEFT JOIN \`employees\` e ON u.employee_id = e.id
       ORDER BY 
         CASE u.role WHEN 'admin' THEN 1 WHEN 'manager' THEN 2 ELSE 3 END ASC,
         u.id ASC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Lỗi lấy danh sách users:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Lấy danh sách nhân viên chưa có tài khoản (Để đăng ký)
router.get('/unregistered-employees', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT e.id, e.name, e.department, e.position, e.email, e.avatar
       FROM \`employees\` e
       LEFT JOIN \`users\` u ON e.id = u.employee_id
       WHERE u.id IS NULL
       ORDER BY e.id ASC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Lỗi lấy danh sách nhân viên chưa đăng ký:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Đổi mật khẩu (Người dùng tự đổi)
router.put('/change-password', async (req, res) => {
  try {
    const pool = getPool();
    const { username, oldPassword, newPassword } = req.body;

    if (!username || !oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin' });
    }

    if (newPassword.length < 3) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới tối thiểu 3 ký tự' });
    }

    const [users] = await pool.query('SELECT id, password FROM `users` WHERE username = ?', [username.trim()]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    const isMatch = await comparePassword(oldPassword, users[0].password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không chính xác' });
    }

    const newHashedPassword = await hashPassword(newPassword);
    await pool.query('UPDATE `users` SET password = ? WHERE id = ?', [newHashedPassword, users[0].id]);

    res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
  } catch (error) {
    console.error('Lỗi đổi mật khẩu:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. Khóa / Mở khóa tài khoản (Admin Toggle Status)
router.put('/users/:id/toggle-status', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    const [users] = await pool.query('SELECT id, username, role, status FROM `users` WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    if (users[0].role === 'admin') {
      return res.status(403).json({ success: false, message: 'Không thể khóa tài khoản Quản trị viên (Admin)' });
    }

    const newStatus = users[0].status === 1 ? 0 : 1;
    await pool.query('UPDATE `users` SET status = ? WHERE id = ?', [newStatus, id]);

    res.json({
      success: true,
      message: `Đã ${newStatus === 1 ? 'mở khóa' : 'khóa'} tài khoản "${users[0].username}"`,
      data: { id, status: newStatus }
    });
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái tài khoản:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. Cập nhật vai trò tài khoản (Admin đổi role)
router.put('/users/:id/role', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { role } = req.body;

    const normRole = (role || '').toLowerCase();
    if (!['admin', 'manager', 'employee'].includes(normRole)) {
      return res.status(400).json({ success: false, message: 'Vai trò không hợp lệ' });
    }

    await pool.query('UPDATE `users` SET role = ? WHERE id = ?', [normRole, id]);

    res.json({ success: true, message: `Đã cập nhật quyền thành: ${normRole}` });
  } catch (error) {
    console.error('Lỗi đổi vai trò:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 8. Admin reset mật khẩu cho nhân viên
router.put('/users/:id/reset-password', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { newPassword = '123' } = req.body;

    const [users] = await pool.query('SELECT id, username, role FROM `users` WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    if (users[0].role === 'admin') {
      return res.status(403).json({ success: false, message: 'Không thể reset mật khẩu tài khoản Admin' });
    }

    const hashedPassword = await hashPassword(newPassword);
    await pool.query('UPDATE `users` SET password = ? WHERE id = ?', [hashedPassword, id]);

    res.json({ success: true, message: `Đã reset mật khẩu tài khoản "${users[0].username}" về: ${newPassword}` });
  } catch (error) {
    console.error('Lỗi reset mật khẩu:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 9. Admin xóa tài khoản
router.delete('/users/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    const [users] = await pool.query('SELECT id, username, role FROM `users` WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    if (users[0].role === 'admin') {
      return res.status(403).json({ success: false, message: 'Không thể xóa tài khoản Admin' });
    }

    await pool.query('DELETE FROM `users` WHERE id = ?', [id]);

    res.json({ success: true, message: `Đã xóa tài khoản "${users[0].username}"` });
  } catch (error) {
    console.error('Lỗi xóa tài khoản:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
