import { Router } from 'express';
import { getPool, hashPassword } from '../config/db.js';

const router = Router();

// 1. Lấy danh sách tất cả nhân viên (Hỗ trợ lọc theo phòng ban)
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { department } = req.query;

    let query = 'SELECT * FROM `employees`';
    const params = [];

    if (department && department !== 'all') {
      query += ' WHERE `department` = ?';
      params.push(department);
    }

    query += ' ORDER BY `id` ASC';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách nhân viên:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy dữ liệu nhân viên', error: error.message });
  }
});

// 2. Lấy chi tiết một nhân viên
router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM `employees` WHERE `id` = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết nhân viên:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 3. Thêm mới nhân viên (Bao gồm CCCD và tạo tài khoản an toàn)
router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    let {
      id,
      name,
      email,
      phone,
      department,
      position,
      salary,
      status,
      joinDate,
      dob,
      gender,
      address,
      cccd,
      avatar,
      notes
    } = req.body;

    if (!name || !department || !position) {
      return res.status(400).json({ success: false, message: 'Họ tên, phòng ban và chức vụ là bắt buộc.' });
    }

    if (!id) {
      const [maxRows] = await pool.query('SELECT MAX(CAST(SUBSTRING(id, 3) AS UNSIGNED)) as maxNum FROM `employees` WHERE id LIKE "NV%"');
      const nextNum = (maxRows[0]?.maxNum || 0) + 1;
      id = `NV${String(nextNum).padStart(3, '0')}`;
    }

    const [existing] = await pool.query('SELECT id FROM `employees` WHERE id = ?', [id]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: `Mã nhân viên "${id}" đã tồn tại trên hệ thống.` });
    }

    await pool.query(
      `INSERT INTO \`employees\` 
       (id, name, email, phone, department, position, salary, status, joinDate, dob, gender, address, cccd, avatar, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        email || '',
        phone || '',
        department,
        position,
        Number(salary) || 0,
        status || 'Đang làm việc',
        joinDate || new Date().toISOString().slice(0, 10),
        dob || null,
        gender || 'Nam',
        address || '',
        cccd || null,
        avatar || '',
        notes || ''
      ]
    );

    // Tự động tạo tài khoản đăng nhập cho nhân viên mới
    const defaultUsername = (email || id).trim().toLowerCase();
    const defaultPassword = '123';
    let accountCreated = null;

    const [existingUser] = await pool.query(
      'SELECT id FROM `users` WHERE username = ? OR employee_id = ?',
      [defaultUsername, id]
    );
    if (existingUser.length === 0) {
      const hashed = await hashPassword(defaultPassword);
      await pool.query(
        'INSERT INTO `users` (username, password, role, status, employee_id) VALUES (?, ?, ?, 1, ?)',
        [defaultUsername, hashed, 'employee', id]
      );
      accountCreated = { username: defaultUsername, password: defaultPassword };
    }

    const [created] = await pool.query('SELECT * FROM `employees` WHERE id = ?', [id]);
    res.status(201).json({
      success: true,
      message: accountCreated
        ? `Thêm nhân viên thành công! Đã tạo tài khoản: "${accountCreated.username}" / mật khẩu: "${accountCreated.password}".`
        : 'Thêm nhân viên thành công',
      data: created[0],
      account_created: accountCreated
    });
  } catch (error) {
    console.error('Lỗi khi thêm nhân viên:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi thêm nhân viên', error: error.message });
  }
});

// 4. Cập nhật thông tin nhân viên
router.put('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const empId = req.params.id;
    const {
      name,
      email,
      phone,
      department,
      position,
      salary,
      status,
      joinDate,
      dob,
      gender,
      address,
      cccd,
      avatar,
      notes
    } = req.body;

    const [existing] = await pool.query('SELECT id, email FROM `employees` WHERE id = ?', [empId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên cần cập nhật' });
    }

    const oldEmail = existing[0].email;
    const newEmail = email || '';

    await pool.query(
      `UPDATE \`employees\` SET 
        name = ?, email = ?, phone = ?, department = ?, position = ?, 
        salary = ?, status = ?, joinDate = ?, dob = ?, gender = ?, 
        address = ?, cccd = ?, avatar = ?, notes = ? 
       WHERE id = ?`,
      [
        name,
        newEmail,
        phone || '',
        department,
        position,
        Number(salary) || 0,
        status || 'Đang làm việc',
        joinDate || null,
        dob || null,
        gender || 'Nam',
        address || '',
        cccd || null,
        avatar || '',
        notes || '',
        empId
      ]
    );

    // Đồng bộ email với username nếu email thay đổi
    let usernameUpdated = null;
    if (newEmail && newEmail !== oldEmail) {
      const [userRows] = await pool.query(
        'SELECT id, username FROM `users` WHERE employee_id = ?',
        [empId]
      );
      if (userRows.length > 0) {
        const [conflict] = await pool.query(
          'SELECT id FROM `users` WHERE username = ? AND id != ?',
          [newEmail, userRows[0].id]
        );
        if (conflict.length === 0) {
          await pool.query('UPDATE `users` SET username = ? WHERE employee_id = ?', [newEmail, empId]);
          usernameUpdated = { oldUsername: userRows[0].username, newUsername: newEmail };
        }
      }
    }

    const [updated] = await pool.query('SELECT * FROM `employees` WHERE id = ?', [empId]);
    res.json({
      success: true,
      message: usernameUpdated
        ? `Cập nhật thành công! Tên đăng nhập đã đổi thành "${usernameUpdated.newUsername}".`
        : 'Cập nhật thông tin nhân viên thành công',
      data: updated[0],
      username_updated: usernameUpdated
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật nhân viên:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật nhân viên', error: error.message });
  }
});

// 5. Nhân viên tự cập nhật thông tin cá nhân (Self-Service Profile)
router.put('/:id/profile', async (req, res) => {
  try {
    const pool = getPool();
    const empId = req.params.id;
    const { phone, address, dob, cccd, avatar } = req.body;

    const [existing] = await pool.query('SELECT id FROM `employees` WHERE id = ?', [empId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    }

    const fields = [];
    const params = [];
    if (phone !== undefined) { fields.push('phone = ?'); params.push(phone || ''); }
    if (address !== undefined) { fields.push('address = ?'); params.push(address || ''); }
    if (dob !== undefined) { fields.push('dob = ?'); params.push(dob || null); }
    if (cccd !== undefined) { fields.push('cccd = ?'); params.push(cccd || null); }
    if (avatar !== undefined) { fields.push('avatar = ?'); params.push(avatar || ''); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'Không có trường nào để cập nhật' });
    }

    params.push(empId);
    await pool.query(`UPDATE \`employees\` SET ${fields.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.query('SELECT * FROM `employees` WHERE id = ?', [empId]);
    res.json({ success: true, message: 'Cập nhật hồ sơ thành công!', data: updated[0] });
  } catch (error) {
    console.error('Lỗi cập nhật hồ sơ cá nhân:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. Xóa nhân viên
router.delete('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const empId = req.params.id;

    const [existing] = await pool.query('SELECT id, name FROM `employees` WHERE id = ?', [empId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên cần xóa' });
    }

    await pool.query('DELETE FROM `employees` WHERE id = ?', [empId]);
    res.json({ success: true, message: `Đã xóa nhân viên ${existing[0].name} (${empId}) thành công.` });
  } catch (error) {
    console.error('Lỗi khi xóa nhân viên:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xóa nhân viên', error: error.message });
  }
});

export default router;
