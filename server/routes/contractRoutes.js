import express from 'express';
import { getPool } from '../config/db.js';

const router = express.Router();

// 1. Lấy danh sách hợp đồng lao động
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { status, contract_type } = req.query;

    let query = `
      SELECT 
        c.*,
        e.name as employee_name,
        e.department as employee_department,
        e.position as employee_position,
        e.avatar as employee_avatar,
        e.email as employee_email
      FROM \`contracts\` c
      JOIN \`employees\` e ON c.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND c.status = ?`;
      params.push(status);
    }
    if (contract_type) {
      query += ` AND c.contract_type = ?`;
      params.push(contract_type);
    }

    query += ` ORDER BY c.end_date ASC, c.created_at DESC`;

    const [rows] = await pool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách hợp đồng:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Lấy các hợp đồng sắp hết hạn trong vòng 30 ngày
router.get('/expiring', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT 
        c.*,
        e.name as employee_name,
        e.department as employee_department,
        e.position as employee_position,
        e.avatar as employee_avatar,
        DATEDIFF(c.end_date, CURDATE()) as days_remaining
      FROM \`contracts\` c
      JOIN \`employees\` e ON c.employee_id = e.id
      WHERE c.status = 'active' 
        AND c.end_date IS NOT NULL 
        AND DATEDIFF(c.end_date, CURDATE()) BETWEEN 0 AND 30
      ORDER BY c.end_date ASC`
    );

    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('Lỗi khi lấy hợp đồng sắp hết hạn:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Tạo mới hợp đồng
router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    const {
      id,
      employee_id,
      contract_type,
      start_date,
      end_date,
      salary_rate,
      notes
    } = req.body;

    const contractId = id || `HD-${employee_id}-${Date.now().toString().slice(-4)}`;

    await pool.query(
      `INSERT INTO \`contracts\` 
       (id, employee_id, contract_type, start_date, end_date, salary_rate, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
      [contractId, employee_id, contract_type, start_date, end_date || null, Number(salary_rate) || 0, notes || null]
    );

    res.status(201).json({
      success: true,
      message: 'Tạo hợp đồng lao động thành công',
      data: { id: contractId, employee_id, contract_type, start_date, end_date }
    });
  } catch (error) {
    console.error('Lỗi khi tạo hợp đồng:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Cập nhật / Tái ký hợp đồng
router.put('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const id = req.params.id;
    const { contract_type, start_date, end_date, salary_rate, status, notes } = req.body;

    await pool.query(
      `UPDATE \`contracts\` SET
        contract_type = COALESCE(?, contract_type),
        start_date = COALESCE(?, start_date),
        end_date = ?,
        salary_rate = COALESCE(?, salary_rate),
        status = COALESCE(?, status),
        notes = ?
      WHERE id = ?`,
      [contract_type, start_date, end_date, salary_rate, status, notes, id]
    );

    res.json({ success: true, message: 'Cập nhật hợp đồng thành công' });
  } catch (error) {
    console.error('Lỗi khi cập nhật hợp đồng:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Xóa hợp đồng
router.delete('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const id = req.params.id;
    await pool.query('DELETE FROM \`contracts\` WHERE id = ?', [id]);
    res.json({ success: true, message: 'Đã xóa hợp đồng thành công' });
  } catch (error) {
    console.error('Lỗi khi xóa hợp đồng:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
