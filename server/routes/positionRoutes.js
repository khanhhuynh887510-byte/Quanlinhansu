import { Router } from 'express';
import { getPool } from '../config/db.js';

const router = Router();

// 1. Lấy danh sách tất cả các chức vụ
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM `positions` ORDER BY `id` ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách chức vụ:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh mục chức vụ', error: error.message });
  }
});

// 2. Thêm mới chức vụ
router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    let { id, name } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Tên chức vụ là bắt buộc.' });
    }

    if (!id) {
      // Tự động sinh mã CV_xxx
      const [maxRows] = await pool.query('SELECT COUNT(*) as count FROM `positions`');
      id = `CV_${String(maxRows[0].count + 1).padStart(2, '0')}`;
    }

    // Kiểm tra trùng id
    const [existing] = await pool.query('SELECT id FROM `positions` WHERE id = ?', [id.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: `Mã chức vụ "${id}" đã tồn tại.` });
    }

    await pool.query('INSERT INTO `positions` (id, name) VALUES (?, ?)', [id.trim(), name.trim()]);

    res.status(201).json({
      success: true,
      message: 'Thêm chức vụ mới thành công!',
      data: { id: id.trim(), name: name.trim() }
    });
  } catch (error) {
    console.error('Lỗi khi thêm chức vụ:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 3. Cập nhật chức vụ
router.put('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Tên chức vụ là bắt buộc.' });
    }

    const [existing] = await pool.query('SELECT id FROM `positions` WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Chức vụ không tồn tại.' });
    }

    await pool.query('UPDATE `positions` SET name = ? WHERE id = ?', [name.trim(), id]);

    res.json({
      success: true,
      message: 'Cập nhật chức vụ thành công!',
      data: { id, name: name.trim() }
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật chức vụ:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

// 4. Xóa chức vụ
router.delete('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    const [existing] = await pool.query('SELECT id, name FROM `positions` WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Chức vụ không tồn tại.' });
    }

    // Kiểm tra xem có nhân viên nào đang giữ chức vụ này không
    const posName = existing[0].name;
    const [empCheck] = await pool.query(
      'SELECT id, name FROM `employees` WHERE position = ? OR position = ? LIMIT 1',
      [id, posName]
    );

    if (empCheck.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa vì nhân viên "${empCheck[0].name}" đang giữ chức vụ này.`
      });
    }

    await pool.query('DELETE FROM `positions` WHERE id = ?', [id]);

    res.json({
      success: true,
      message: `Đã xóa chức vụ "${posName}" thành công.`
    });
  } catch (error) {
    console.error('Lỗi khi xóa chức vụ:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
});

export default router;
