import { Router } from 'express';
import { getPool } from '../config/db.js';

const router = Router();

// 1. Lấy danh sách tất cả các phòng ban (kèm số lượng nhân viên và thông tin Trưởng phòng)
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(`
      SELECT d.*, 
             COUNT(e.id) as employee_count,
             COALESCE(mgr.name, d.manager) as manager_name,
             mgr.email as manager_email,
             mgr.avatar as manager_avatar
      FROM \`departments\` d
      LEFT JOIN \`employees\` e ON d.name = e.department OR d.id = e.department
      LEFT JOIN \`employees\` mgr ON d.manager_id = mgr.id
      GROUP BY d.id
      ORDER BY d.id ASC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách phòng ban:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 2. Thêm phòng ban mới
router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    let { id, name, code, manager, manager_id, color = '#6366f1' } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Tên phòng ban và mã code là bắt buộc.' });
    }

    if (!id) {
      id = `PB_${code.toUpperCase().replace(/\s+/g, '_')}`;
    }

    const [existing] = await pool.query('SELECT id FROM `departments` WHERE id = ?', [id]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: `Mã phòng ban "${id}" đã tồn tại.` });
    }

    // Nếu có manager_id, lấy tên Trưởng phòng từ bảng employees
    if (manager_id) {
      const [mgrRow] = await pool.query('SELECT name FROM `employees` WHERE id = ?', [manager_id]);
      if (mgrRow.length > 0) {
        manager = mgrRow[0].name;
      }
    }

    await pool.query(`
      INSERT INTO \`departments\` (id, name, code, manager, manager_id, color)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, name, code.toUpperCase(), manager || null, manager_id || null, color]);

    res.status(201).json({
      success: true,
      message: 'Thêm phòng ban mới thành công!',
      data: { id, name, code: code.toUpperCase(), manager, manager_id, color }
    });
  } catch (error) {
    console.error('Lỗi thêm phòng ban:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 3. Cập nhật phòng ban
router.put('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    let { name, code, manager, manager_id, color } = req.body;

    const [existing] = await pool.query('SELECT * FROM `departments` WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Phòng ban không tồn tại.' });
    }

    if (manager_id) {
      const [mgrRow] = await pool.query('SELECT name FROM `employees` WHERE id = ?', [manager_id]);
      if (mgrRow.length > 0) {
        manager = mgrRow[0].name;
      }
    }

    await pool.query(`
      UPDATE \`departments\`
      SET name = ?, code = ?, manager = ?, manager_id = ?, color = ?
      WHERE id = ?
    `, [
      name || existing[0].name,
      code ? code.toUpperCase() : existing[0].code,
      manager !== undefined ? manager : existing[0].manager,
      manager_id !== undefined ? manager_id : existing[0].manager_id,
      color || existing[0].color,
      id
    ]);

    res.json({
      success: true,
      message: 'Cập nhật phòng ban thành công!'
    });
  } catch (error) {
    console.error('Lỗi cập nhật phòng ban:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 4. Xóa phòng ban
router.delete('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    const [existing] = await pool.query('SELECT id, name FROM `departments` WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Phòng ban không tồn tại.' });
    }

    const deptName = existing[0].name;
    // Kiểm tra có nhân viên nào trong phòng ban này không
    const [empCheck] = await pool.query(
      'SELECT id, name FROM `employees` WHERE department = ? OR department = ? LIMIT 1',
      [id, deptName]
    );

    if (empCheck.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa vì còn nhân viên "${empCheck[0].name}" thuộc phòng ban này.`
      });
    }

    await pool.query('DELETE FROM `departments` WHERE id = ?', [id]);

    res.json({ success: true, message: `Đã xóa phòng ban "${deptName}" thành công.` });
  } catch (error) {
    console.error('Lỗi xóa phòng ban:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

export default router;
