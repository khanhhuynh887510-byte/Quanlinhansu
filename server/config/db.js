import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const DB_NAME = process.env.DB_NAME || 'quan_li_nhan_su';

let pool = null;

export async function hashPassword(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plainPassword, salt);
}

export async function comparePassword(plainPassword, hashedPassword) {
  // Hỗ trợ cả mật khẩu chưa mã hóa cũ (plain text) lẫn bcrypt
  if (!hashedPassword) return false;
  if (hashedPassword === plainPassword) return true;
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch {
    return false;
  }
}

export async function initDatabase() {
  try {
    // 1. Kết nối tạm để tạo Database nếu chưa tồn tại
    const rootConnection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port
    });

    await rootConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await rootConnection.end();

    // 2. Tạo connection pool kết nối trực tiếp đến database
    pool = mysql.createPool({
      ...dbConfig,
      database: DB_NAME
    });

    // 3. Khởi tạo cấu trúc các bảng
    // 3.1. Bảng departments (Phòng ban)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`departments\` (
        \`id\` VARCHAR(50) NOT NULL PRIMARY KEY,
        \`name\` VARCHAR(100) NOT NULL,
        \`code\` VARCHAR(20) NOT NULL,
        \`manager\` VARCHAR(100) DEFAULT NULL,
        \`manager_id\` VARCHAR(20) DEFAULT NULL,
        \`color\` VARCHAR(20) DEFAULT '#6366f1',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3.2. Bảng positions (Danh mục chức vụ)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`positions\` (
        \`id\` VARCHAR(50) NOT NULL PRIMARY KEY,
        \`name\` VARCHAR(100) NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3.3. Bảng employees (Nhân viên)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`employees\` (
        \`id\` VARCHAR(20) NOT NULL PRIMARY KEY,
        \`name\` VARCHAR(100) NOT NULL,
        \`email\` VARCHAR(100) NOT NULL,
        \`phone\` VARCHAR(25) NOT NULL,
        \`department\` VARCHAR(100) NOT NULL,
        \`position\` VARCHAR(100) NOT NULL,
        \`salary\` BIGINT NOT NULL DEFAULT 0,
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'Đang làm việc',
        \`joinDate\` VARCHAR(20) DEFAULT NULL,
        \`dob\` VARCHAR(20) DEFAULT NULL,
        \`gender\` VARCHAR(10) DEFAULT 'Nam',
        \`address\` VARCHAR(255) DEFAULT NULL,
        \`cccd\` VARCHAR(25) DEFAULT NULL,
        \`avatar\` MEDIUMTEXT DEFAULT NULL,
        \`notes\` TEXT DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3.4. Bảng employee_transfers (Lịch sử Điều chuyển & Thăng chức)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`employee_transfers\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`employee_id\` VARCHAR(20) NOT NULL,
        \`old_department\` VARCHAR(100) NOT NULL,
        \`new_department\` VARCHAR(100) NOT NULL,
        \`old_position\` VARCHAR(100) NOT NULL,
        \`new_position\` VARCHAR(100) NOT NULL,
        \`effective_date\` VARCHAR(20) NOT NULL,
        \`reason\` TEXT NOT NULL,
        \`decision_maker_id\` VARCHAR(50) DEFAULT NULL,
        \`decision_maker_name\` VARCHAR(100) DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`fk_transfer_employee\` FOREIGN KEY (\`employee_id\`) REFERENCES \`employees\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3.5. Bảng attendance (Chấm công & Điểm danh)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`attendance\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`employee_id\` VARCHAR(20) NOT NULL,
        \`date\` VARCHAR(10) NOT NULL,
        \`check_in_time\` VARCHAR(10) DEFAULT NULL,
        \`check_out_time\` VARCHAR(10) DEFAULT NULL,
        \`status\` ENUM('present', 'late', 'absent', 'excused') NOT NULL DEFAULT 'present',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`unique_emp_date\` (\`employee_id\`, \`date\`),
        CONSTRAINT \`fk_attendance_employee\` FOREIGN KEY (\`employee_id\`) REFERENCES \`employees\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3.6. Bảng payroll (Bảng lương)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`payroll\` (
        \`id\` VARCHAR(50) NOT NULL PRIMARY KEY,
        \`employee_id\` VARCHAR(20) NOT NULL,
        \`month\` VARCHAR(7) NOT NULL,
        \`base_salary\` BIGINT NOT NULL DEFAULT 0,
        \`standard_days\` INT NOT NULL DEFAULT 26,
        \`actual_days\` INT NOT NULL DEFAULT 26,
        \`late_count\` INT NOT NULL DEFAULT 0,
        \`absent_unexcused\` INT NOT NULL DEFAULT 0,
        \`absent_excused\` INT NOT NULL DEFAULT 0,
        \`allowance\` BIGINT NOT NULL DEFAULT 0,
        \`attendance_bonus\` BIGINT NOT NULL DEFAULT 0,
        \`performance_bonus\` BIGINT NOT NULL DEFAULT 0,
        \`late_penalty\` BIGINT NOT NULL DEFAULT 0,
        \`unexcused_penalty\` BIGINT NOT NULL DEFAULT 0,
        \`insurance_deduction\` BIGINT NOT NULL DEFAULT 0,
        \`net_salary\` BIGINT NOT NULL DEFAULT 0,
        \`status\` ENUM('draft', 'approved', 'paid') NOT NULL DEFAULT 'draft',
        \`payment_date\` VARCHAR(20) DEFAULT NULL,
        \`notes\` TEXT DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`unique_emp_month\` (\`employee_id\`, \`month\`),
        CONSTRAINT \`fk_payroll_employee\` FOREIGN KEY (\`employee_id\`) REFERENCES \`employees\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3.7. Bảng rewards_penalties (Khen thưởng & Kỷ luật)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`rewards_penalties\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`employee_id\` VARCHAR(20) NOT NULL,
        \`type\` ENUM('reward', 'penalty') NOT NULL,
        \`category\` VARCHAR(50) NOT NULL DEFAULT 'other',
        \`title\` VARCHAR(255) NOT NULL,
        \`amount\` BIGINT NOT NULL DEFAULT 0,
        \`date\` VARCHAR(10) NOT NULL,
        \`month\` VARCHAR(7) NOT NULL,
        \`reason\` TEXT DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`fk_rp_employee\` FOREIGN KEY (\`employee_id\`) REFERENCES \`employees\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3.8. Bảng leave_requests (Đơn xin nghỉ phép)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`leave_requests\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`employee_id\` VARCHAR(20) NOT NULL,
        \`leave_type\` ENUM('annual', 'sick', 'unpaid', 'unexcused', 'maternity') NOT NULL DEFAULT 'annual',
        \`from_date\` VARCHAR(20) NOT NULL,
        \`to_date\` VARCHAR(20) NOT NULL,
        \`days_count\` DECIMAL(4,1) NOT NULL DEFAULT 1.0,
        \`reason\` TEXT NOT NULL,
        \`status\` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        \`approver_id\` VARCHAR(50) DEFAULT NULL,
        \`approver_name\` VARCHAR(100) DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`fk_leave_employee\` FOREIGN KEY (\`employee_id\`) REFERENCES \`employees\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3.9. Bảng contracts (Hợp đồng lao động)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`contracts\` (
        \`id\` VARCHAR(50) NOT NULL PRIMARY KEY,
        \`employee_id\` VARCHAR(20) NOT NULL,
        \`contract_type\` VARCHAR(50) NOT NULL DEFAULT '1 năm',
        \`start_date\` VARCHAR(10) NOT NULL,
        \`end_date\` VARCHAR(10) DEFAULT NULL,
        \`salary_rate\` BIGINT NOT NULL DEFAULT 0,
        \`status\` ENUM('active', 'expired', 'terminated') NOT NULL DEFAULT 'active',
        \`notes\` TEXT DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`fk_contract_employee\` FOREIGN KEY (\`employee_id\`) REFERENCES \`employees\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3.10. Bảng users (Tài khoản & Phân quyền)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`username\` VARCHAR(50) NOT NULL UNIQUE,
        \`password\` VARCHAR(255) NOT NULL,
        \`role\` VARCHAR(20) NOT NULL DEFAULT 'employee',
        \`status\` TINYINT NOT NULL DEFAULT 1,
        \`employee_id\` VARCHAR(20) DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`fk_user_employee\` FOREIGN KEY (\`employee_id\`) REFERENCES \`employees\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3.11. Bảng courses (Khóa học đào tạo)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`courses\` (
        \`id\` VARCHAR(50) NOT NULL PRIMARY KEY,
        \`title\` VARCHAR(255) NOT NULL,
        \`description\` TEXT DEFAULT NULL,
        \`format\` VARCHAR(50) NOT NULL DEFAULT 'Trực tiếp',
        \`instructor\` VARCHAR(100) NOT NULL,
        \`start_date\` VARCHAR(20) NOT NULL,
        \`end_date\` VARCHAR(20) NOT NULL,
        \`budget\` BIGINT NOT NULL DEFAULT 0,
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'upcoming',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3.12. Bảng course_attendees (Danh sách học viên đào tạo)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`course_attendees\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`course_id\` VARCHAR(50) NOT NULL,
        \`employee_id\` VARCHAR(20) NOT NULL,
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'Đã đăng ký',
        \`score\` DECIMAL(4,1) DEFAULT NULL,
        \`certificate_code\` VARCHAR(50) DEFAULT NULL,
        \`registration_date\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`unique_course_emp\` (\`course_id\`, \`employee_id\`),
        CONSTRAINT \`fk_attendee_course\` FOREIGN KEY (\`course_id\`) REFERENCES \`courses\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_attendee_employee\` FOREIGN KEY (\`employee_id\`) REFERENCES \`employees\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3.13. Bảng notifications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`notifications\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`sender_id\` VARCHAR(50) DEFAULT NULL,
        \`sender_name\` VARCHAR(100) DEFAULT NULL,
        \`recipient_role\` ENUM('admin', 'manager', 'employee', 'all') NOT NULL DEFAULT 'admin',
        \`recipient_id\` VARCHAR(50) DEFAULT NULL,
        \`type\` VARCHAR(50) NOT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`message\` TEXT NOT NULL,
        \`link_tab\` VARCHAR(50) DEFAULT NULL,
        \`is_read\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3.14. Bảng work_reports
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`work_reports\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`employee_id\` VARCHAR(20) NOT NULL,
        \`report_type\` ENUM('daily', 'weekly', 'incident', 'suggestion') NOT NULL DEFAULT 'daily',
        \`title\` VARCHAR(255) NOT NULL,
        \`content\` TEXT NOT NULL,
        \`date\` VARCHAR(10) NOT NULL,
        \`status\` ENUM('submitted', 'reviewed') NOT NULL DEFAULT 'submitted',
        \`manager_feedback\` TEXT DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`fk_report_employee\` FOREIGN KEY (\`employee_id\`) REFERENCES \`employees\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Chạy migration an toàn để bổ sung các cột mới cho database đã có dữ liệu
    await applyMigrations();

    // 4. Seed dữ liệu ban đầu
    await seedDefaultData();

    console.log(`[MySQL] Kết nối cơ sở dữ liệu "${DB_NAME}" thành công!`);
    return pool;
  } catch (error) {
    console.error('[MySQL Error] Lỗi khởi tạo cơ sở dữ liệu:', error.message);
    throw error;
  }
}

// Bổ sung các cột nếu thiếu trên bảng cũ
async function applyMigrations() {
  if (!pool) return;
  const safeAlter = async (sql) => {
    try {
      await pool.query(sql);
    } catch {
      // Bỏ qua lỗi nếu cột đã tồn tại hoặc không thể alter
    }
  };

  // Employees: cccd & avatar MEDIUMTEXT
  await safeAlter('ALTER TABLE `employees` ADD COLUMN `cccd` VARCHAR(25) DEFAULT NULL AFTER `address`');
  await safeAlter('ALTER TABLE `employees` MODIFY COLUMN `avatar` MEDIUMTEXT DEFAULT NULL');
  // Departments: manager_id
  await safeAlter('ALTER TABLE `departments` ADD COLUMN `manager_id` VARCHAR(20) DEFAULT NULL AFTER `manager`');
  // Attendance: check_in_time, check_out_time
  await safeAlter('ALTER TABLE `attendance` ADD COLUMN `check_in_time` VARCHAR(10) DEFAULT NULL AFTER `date`');
  await safeAlter('ALTER TABLE `attendance` ADD COLUMN `check_out_time` VARCHAR(10) DEFAULT NULL AFTER `check_in_time`');
  // Leave_requests: approver_id, approver_name
  await safeAlter('ALTER TABLE `leave_requests` ADD COLUMN `approver_id` VARCHAR(50) DEFAULT NULL');
  await safeAlter('ALTER TABLE `leave_requests` ADD COLUMN `approver_name` VARCHAR(100) DEFAULT NULL');
  // Users: role đổi sang VARCHAR để hỗ trợ 'manager', thêm status
  await safeAlter('ALTER TABLE `users` MODIFY COLUMN `role` VARCHAR(20) NOT NULL DEFAULT \'employee\'');
  await safeAlter('ALTER TABLE `users` ADD COLUMN `status` TINYINT NOT NULL DEFAULT 1 AFTER `role`');
  // Employee_transfers: decision_type (promotion, transfer, demotion, dismissal)
  await safeAlter('ALTER TABLE `employee_transfers` ADD COLUMN `decision_type` VARCHAR(50) NOT NULL DEFAULT \'transfer\' AFTER `employee_id`');

  // Chuẩn hóa tên Tiếng Việt (Views) theo Đặc tả nghiệp vụ HRM
  await safeAlter('CREATE OR REPLACE VIEW `DieuChuyenNhanVien` AS SELECT * FROM `employee_transfers`');
  await safeAlter('CREATE OR REPLACE VIEW `NhanVien` AS SELECT * FROM `employees`');
  await safeAlter('CREATE OR REPLACE VIEW `PhongBan` AS SELECT * FROM `departments`');
  await safeAlter('CREATE OR REPLACE VIEW `ChucVu` AS SELECT * FROM `positions`');
  await safeAlter('CREATE OR REPLACE VIEW `ChamCong` AS SELECT * FROM `attendance`');
  await safeAlter('CREATE OR REPLACE VIEW `BangLuong` AS SELECT * FROM `payroll`');
  await safeAlter('CREATE OR REPLACE VIEW `DonXinNghi` AS SELECT * FROM `leave_requests`');
  await safeAlter('CREATE OR REPLACE VIEW `HopDongLaoDong` AS SELECT * FROM `contracts`');
  await safeAlter('CREATE OR REPLACE VIEW `TaiKhoan` AS SELECT * FROM `users`');
  await safeAlter('CREATE OR REPLACE VIEW `KhoaHoc` AS SELECT * FROM `courses`');
  await safeAlter('CREATE OR REPLACE VIEW `ChiTietDaoTao` AS SELECT * FROM `course_attendees`');
}

export async function seedDefaultData() {
  if (!pool) return;

  // 1. Seed positions (Danh mục chức vụ)
  const [posRows] = await pool.query('SELECT COUNT(*) as count FROM `positions`');
  if (posRows[0].count === 0) {
    const defaultPositions = [
      ['CV_GD', 'Giám đốc Điều hành'],
      ['CV_TP', 'Trưởng phòng'],
      ['CV_PP', 'Phó phòng'],
      ['CV_TL_DA', 'Trưởng nhóm Dự án'],
      ['CV_NV', 'Nhân viên'],
      ['CV_TT', 'Thực tập sinh']
    ];
    for (const [id, name] of defaultPositions) {
      await pool.query('INSERT IGNORE INTO `positions` (id, name) VALUES (?, ?)', [id, name]);
    }
    console.log('[MySQL] Đã khởi tạo danh mục chức vụ.');
  }

  // 2. Seed departments (Phòng ban)
  const [deptRows] = await pool.query('SELECT COUNT(*) as count FROM `departments`');
  if (deptRows[0].count === 0) {
    const defaultDepts = [
      ['PB_IT', 'Kỹ thuật & Công nghệ (IT)', 'IT', 'Nguyễn Hoàng Nam', 'NV001', '#6366f1'],
      ['PB_SALES', 'Kinh doanh & Bán hàng', 'SALES', 'Trần Thị Mỹ Linh', 'NV002', '#10b981'],
      ['PB_MKT', 'Marketing & Truyền thông', 'MKT', 'Lê Quốc Bảo', 'NV003', '#f59e0b'],
      ['PB_HR', 'Quản trị Nhân sự', 'HR', 'Phạm Thị Thùy Dung', 'NV004', '#ec4899'],
      ['PB_ACC', 'Kế toán & Tài chính', 'ACC', 'Võ Minh Quân', 'NV005', '#8b5cf6'],
      ['PB_R_D', 'Phòng R&D - Nghiên cứu & Phát triển', 'R&D', 'Nguyễn Văn An', 'NV2026001', '#06b6d4']
    ];

    for (const d of defaultDepts) {
      await pool.query(
        'INSERT IGNORE INTO `departments` (id, name, code, manager, manager_id, color) VALUES (?, ?, ?, ?, ?, ?)',
        d
      );
    }
    console.log('[MySQL] Đã khởi tạo dữ liệu phòng ban mặc định.');
  }

  // 3. Seed employees
  const [empRows] = await pool.query('SELECT COUNT(*) as count FROM `employees`');
  if (empRows[0].count === 0) {
    const defaultEmployees = [
      {
        id: 'NV001',
        name: 'Nguyễn Hoàng Nam',
        email: 'nam.nguyen@company.vn',
        phone: '0912 345 678',
        department: 'Kỹ thuật & Công nghệ (IT)',
        position: 'Trưởng phòng',
        salary: 38000000,
        status: 'Đang làm việc',
        joinDate: '2021-03-15',
        dob: '1990-08-22',
        gender: 'Nam',
        address: 'Cầu Giấy, Hà Nội',
        cccd: '001090012345',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
        notes: 'Kỹ sư trưởng với hơn 10 năm kinh nghiệm kiến trúc hệ thống'
      },
      {
        id: 'NV002',
        name: 'Trần Thị Mỹ Linh',
        email: 'linh.tran@company.vn',
        phone: '0988 765 432',
        department: 'Kinh doanh & Bán hàng',
        position: 'Trưởng phòng',
        salary: 32000000,
        status: 'Đang làm việc',
        joinDate: '2021-07-01',
        dob: '1992-11-14',
        gender: 'Nữ',
        address: 'Đống Đa, Hà Nội',
        cccd: '001192004567',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80',
        notes: 'Đạt giải Top Sales xuất sắc năm 2023 & 2024'
      },
      {
        id: 'NV2026001',
        name: 'Nguyễn Văn An',
        email: 'nv.an@minhkhanh.vn',
        phone: '0905123456',
        department: 'Phòng R&D - Nghiên cứu & Phát triển',
        position: 'Trưởng nhóm Dự án',
        salary: 28000000,
        status: 'Đang làm việc',
        joinDate: '2026-02-01',
        dob: '1998-05-12',
        gender: 'Nam',
        address: 'Thanh Xuân, Hà Nội',
        cccd: '048198001234',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
        notes: 'Bổ nhiệm Trưởng nhóm R&D từ tháng 07/2026'
      }
    ];

    for (const emp of defaultEmployees) {
      await pool.query(
        `INSERT IGNORE INTO \`employees\` 
         (id, name, email, phone, department, position, salary, status, joinDate, dob, gender, address, cccd, avatar, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          emp.id, emp.name, emp.email, emp.phone, emp.department, emp.position,
          emp.salary, emp.status, emp.joinDate, emp.dob, emp.gender,
          emp.address, emp.cccd, emp.avatar, emp.notes
        ]
      );
    }
  }

  // Đảm bảo nhân viên mẫu NV2026001 luôn tồn tại theo đặc tả
  await pool.query(`
    INSERT IGNORE INTO \`employees\` 
    (id, name, email, phone, department, position, salary, status, joinDate, dob, gender, address, cccd, avatar, notes) 
    VALUES ('NV2026001', 'Nguyễn Văn An', 'nv.an@minhkhanh.vn', '0905123456', 
            'Phòng R&D - Nghiên cứu & Phát triển', 'Trưởng nhóm Dự án', 28000000, 
            'Đang làm việc', '2026-02-01', '1998-05-12', 'Nam', 'Thanh Xuân, Hà Nội', '048198001234', 
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80', 
            'Bổ nhiệm Trưởng nhóm R&D từ tháng 07/2026')
  `);

  // 4. Seed sample transfer record (DieuChuyenNhanVien mẫu theo tài liệu)
  const [transferRows] = await pool.query('SELECT COUNT(*) as count FROM `employee_transfers`');
  if (transferRows[0].count === 0) {
    await pool.query(
      `INSERT INTO \`employee_transfers\` 
       (employee_id, old_department, new_department, old_position, new_position, effective_date, reason, decision_maker_id, decision_maker_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'NV2026001',
        'Kỹ thuật & Công nghệ (IT)',
        'Phòng R&D - Nghiên cứu & Phát triển',
        'Nhân viên',
        'Trưởng nhóm Dự án',
        '2026-07-01',
        'Bổ nhiệm làm Trưởng nhóm phát triển sản phẩm mới tại bộ phận R&D theo quyết định số 45/QĐ-BGD.',
        '1',
        'Admin HR'
      ]
    );
    console.log('[MySQL] Đã khởi tạo dữ liệu mẫu Điều chuyển nhân sự.');
  }

  // 5. Seed courses (Khóa học đào tạo)
  const [courseRows] = await pool.query('SELECT COUNT(*) as count FROM `courses`');
  if (courseRows[0].count === 0) {
    const defaultCourses = [
      [
        'KH001',
        'Kỹ năng Lãnh đạo & Quản trị Nhân sự Hiện đại',
        'Trang bị tư duy quản trị nhân sự theo mô hình Agile, phát triển kỹ năng tạo động lực và đánh giá hiệu suất nhân viên.',
        'Workshop',
        'ThS. Nguyễn Mai Phương',
        '2026-10-01',
        '2026-10-15',
        15000000,
        'upcoming'
      ],
      [
        'KH002',
        'An toàn Thông tin & Bảo mật Dữ liệu Doanh nghiệp',
        'Đào tạo chuẩn ISO 27001, các biện pháp phòng chống rò rỉ dữ liệu, ứng phó sự cố an ninh mạng nội bộ.',
        'Trực tuyến E-learning',
        'Chuyên gia Trần Hải Long',
        '2026-09-01',
        '2026-09-30',
        8000000,
        'in_progress'
      ],
      [
        'KH003',
        'Ứng dụng AI & Tự động hóa Quy trình Làm việc',
        'Hướng dẫn ứng dụng các công cụ AI (LLM, Agent) để tự động hóa báo cáo, viết code và quản lý dự án.',
        'Trực tiếp',
        'TS. Lê Hoàng Nam',
        '2026-08-10',
        '2026-08-25',
        20000000,
        'completed'
      ]
    ];

    for (const c of defaultCourses) {
      await pool.query(
        `INSERT IGNORE INTO \`courses\` 
         (id, title, description, format, instructor, start_date, end_date, budget, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        c
      );
    }

    // Seed học viên cho các khóa học
    const defaultAttendees = [
      ['KH002', 'NV001', 'Đang học', 8.5, null],
      ['KH002', 'NV2026001', 'Đang học', 9.0, null],
      ['KH003', 'NV001', 'Đạt chứng chỉ', 9.5, 'CERT-AI-2026-001'],
      ['KH003', 'NV002', 'Đạt chứng chỉ', 9.0, 'CERT-AI-2026-002']
    ];

    for (const att of defaultAttendees) {
      await pool.query(
        `INSERT IGNORE INTO \`course_attendees\` 
         (course_id, employee_id, status, score, certificate_code)
         VALUES (?, ?, ?, ?, ?)`,
        att
      );
    }
    console.log('[MySQL] Đã khởi tạo dữ liệu danh mục khóa học & học viên đào tạo.');
  }

  // 6. Seed users (Tài khoản người dùng: Admin, Manager, Employee)
  const defaultPassHash = await hashPassword('123');

  // Kiểm tra tài khoản Admin
  const [adminUser] = await pool.query("SELECT id FROM `users` WHERE username = 'admin'");
  if (adminUser.length === 0) {
    await pool.query(
      `INSERT INTO \`users\` (username, password, role, status, employee_id) VALUES (?, ?, ?, ?, ?)`,
      ['admin', defaultPassHash, 'admin', 1, null]
    );
  }

  // Kiểm tra tài khoản Manager mẫu
  const [mgrUser] = await pool.query("SELECT id FROM `users` WHERE username = 'manager'");
  if (mgrUser.length === 0) {
    await pool.query(
      `INSERT INTO \`users\` (username, password, role, status, employee_id) VALUES (?, ?, ?, ?, ?)`,
      ['manager', defaultPassHash, 'manager', 1, 'NV001']
    );
  }

  // Đồng bộ tài khoản cho các nhân viên nếu chưa có
  const [allEmps] = await pool.query('SELECT id FROM `employees`');
  for (const emp of allEmps) {
    const username = emp.id.toLowerCase();
    const [existing] = await pool.query('SELECT id FROM `users` WHERE username = ?', [username]);
    if (existing.length === 0) {
      await pool.query(
        `INSERT INTO \`users\` (username, password, role, status, employee_id) VALUES (?, ?, ?, ?, ?)`,
        [username, defaultPassHash, 'employee', 1, emp.id]
      );
    }
  }
}

export function getPool() {
  if (!pool) {
    throw new Error('Database pool chưa được khởi tạo. Vui lòng gọi initDatabase() trước.');
  }
  return pool;
}
