-- ========================================================
-- Schema Cơ sở dữ liệu Quản lý Nhân sự (quan_li_nhan_su)
-- Chuẩn hóa theo Đặc tả Yêu cầu Hệ thống HRM Toàn diện
-- ========================================================

CREATE DATABASE IF NOT EXISTS `quan_li_nhan_su` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `quan_li_nhan_su`;

-- 1. Bảng Phòng ban (departments - PhongBan)
CREATE TABLE IF NOT EXISTS `departments` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `manager` VARCHAR(100) DEFAULT NULL,
  `manager_id` VARCHAR(20) DEFAULT NULL,
  `color` VARCHAR(20) DEFAULT '#6366f1',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng Danh mục Chức vụ (positions - ChucVu)
CREATE TABLE IF NOT EXISTS `positions` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng Nhân viên (employees - NhanVien)
CREATE TABLE IF NOT EXISTS `employees` (
  `id` VARCHAR(20) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(25) NOT NULL,
  `department` VARCHAR(100) NOT NULL,
  `position` VARCHAR(100) NOT NULL,
  `salary` BIGINT NOT NULL DEFAULT 0,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Đang làm việc', -- 'Đang làm việc', 'Đã nghỉ việc', 'Đang nghỉ thai sản'
  `joinDate` VARCHAR(20) DEFAULT NULL,
  `dob` VARCHAR(20) DEFAULT NULL,
  `gender` VARCHAR(10) DEFAULT 'Nam',
  `address` VARCHAR(255) DEFAULT NULL,
  `cccd` VARCHAR(25) DEFAULT NULL,
  `avatar` MEDIUMTEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng Lịch sử Điều chuyển & Thăng chức (employee_transfers - DieuChuyenNhanVien)
CREATE TABLE IF NOT EXISTS `employee_transfers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` VARCHAR(20) NOT NULL,
  `decision_type` VARCHAR(50) NOT NULL DEFAULT 'transfer', -- 'promotion' (thăng chức), 'transfer' (điều chuyển), 'demotion' (giáng chức), 'dismissal' (cách chức)
  `old_department` VARCHAR(100) NOT NULL,
  `new_department` VARCHAR(100) NOT NULL,
  `old_position` VARCHAR(100) NOT NULL,
  `new_position` VARCHAR(100) NOT NULL,
  `effective_date` VARCHAR(20) NOT NULL,
  `reason` TEXT NOT NULL,
  `decision_maker_id` VARCHAR(50) DEFAULT NULL,
  `decision_maker_name` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_transfer_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bảng Điểm danh & Chấm công (attendance - ChamCong)
CREATE TABLE IF NOT EXISTS `attendance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` VARCHAR(20) NOT NULL,
  `date` VARCHAR(10) NOT NULL, -- YYYY-MM-DD
  `check_in_time` VARCHAR(10) DEFAULT NULL, -- HH:mm:ss
  `check_out_time` VARCHAR(10) DEFAULT NULL, -- HH:mm:ss
  `status` ENUM('present', 'late', 'absent', 'excused') NOT NULL DEFAULT 'present',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_emp_date` (`employee_id`, `date`),
  CONSTRAINT `fk_attendance_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Bảng Lương & Chi trả (payroll - BangLuong)
CREATE TABLE IF NOT EXISTS `payroll` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `employee_id` VARCHAR(20) NOT NULL,
  `month` VARCHAR(7) NOT NULL, -- Định dạng YYYY-MM
  `base_salary` BIGINT NOT NULL DEFAULT 0,
  `standard_days` INT NOT NULL DEFAULT 26,
  `actual_days` INT NOT NULL DEFAULT 26,
  `late_count` INT NOT NULL DEFAULT 0,
  `absent_unexcused` INT NOT NULL DEFAULT 0,
  `absent_excused` INT NOT NULL DEFAULT 0,
  `allowance` BIGINT NOT NULL DEFAULT 0,
  `attendance_bonus` BIGINT NOT NULL DEFAULT 0,
  `performance_bonus` BIGINT NOT NULL DEFAULT 0,
  `late_penalty` BIGINT NOT NULL DEFAULT 0,
  `unexcused_penalty` BIGINT NOT NULL DEFAULT 0,
  `insurance_deduction` BIGINT NOT NULL DEFAULT 0,
  `net_salary` BIGINT NOT NULL DEFAULT 0,
  `status` ENUM('draft', 'approved', 'paid') NOT NULL DEFAULT 'draft',
  `payment_date` VARCHAR(20) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_emp_month` (`employee_id`, `month`),
  CONSTRAINT `fk_payroll_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Bảng Khen thưởng & Kỷ luật (rewards_penalties)
CREATE TABLE IF NOT EXISTS `rewards_penalties` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` VARCHAR(20) NOT NULL,
  `type` ENUM('reward', 'penalty') NOT NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'other',
  `title` VARCHAR(255) NOT NULL,
  `amount` BIGINT NOT NULL DEFAULT 0,
  `date` VARCHAR(10) NOT NULL,
  `month` VARCHAR(7) NOT NULL,
  `reason` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_rp_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Bảng Đơn xin Nghỉ phép (leave_requests - DonXinNghi)
CREATE TABLE IF NOT EXISTS `leave_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` VARCHAR(20) NOT NULL,
  `leave_type` ENUM('annual', 'sick', 'unpaid', 'unexcused', 'maternity') NOT NULL DEFAULT 'annual',
  `from_date` VARCHAR(20) NOT NULL,
  `to_date` VARCHAR(20) NOT NULL,
  `days_count` DECIMAL(4,1) NOT NULL DEFAULT 1.0,
  `reason` TEXT NOT NULL,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `approver_id` VARCHAR(50) DEFAULT NULL,
  `approver_name` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_leave_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Bảng Hợp đồng Lao động (contracts - HopDongLaoDong)
CREATE TABLE IF NOT EXISTS `contracts` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `employee_id` VARCHAR(20) NOT NULL,
  `contract_type` VARCHAR(50) NOT NULL DEFAULT '1 năm',
  `start_date` VARCHAR(10) NOT NULL,
  `end_date` VARCHAR(10) DEFAULT NULL,
  `salary_rate` BIGINT NOT NULL DEFAULT 0,
  `status` ENUM('active', 'expired', 'terminated') NOT NULL DEFAULT 'active',
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_contract_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Bảng Tài khoản & Phân quyền (users - TaiKhoan)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'employee', -- 'admin', 'manager', 'employee'
  `status` TINYINT NOT NULL DEFAULT 1, -- 1: Đang hoạt động, 0: Đã khóa
  `employee_id` VARCHAR(20) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_user_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Bảng Khóa học Đào tạo (courses - KhoaHoc)
CREATE TABLE IF NOT EXISTS `courses` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `format` VARCHAR(50) NOT NULL DEFAULT 'Trực tiếp', -- 'Trực tiếp', 'Trực tuyến E-learning', 'Workshop'
  `instructor` VARCHAR(100) NOT NULL,
  `start_date` VARCHAR(20) NOT NULL,
  `end_date` VARCHAR(20) NOT NULL,
  `budget` BIGINT NOT NULL DEFAULT 0,
  `status` VARCHAR(50) NOT NULL DEFAULT 'upcoming', -- 'upcoming', 'in_progress', 'completed', 'cancelled'
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Bảng Danh sách Học viên Đào tạo (course_attendees - ChiTietDaoTao)
CREATE TABLE IF NOT EXISTS `course_attendees` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `course_id` VARCHAR(50) NOT NULL,
  `employee_id` VARCHAR(20) NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Đã đăng ký', -- 'Đã đăng ký', 'Đang học', 'Hoàn thành', 'Đạt chứng chỉ', 'Trượt'
  `score` DECIMAL(4,1) DEFAULT NULL,
  `certificate_code` VARCHAR(50) DEFAULT NULL,
  `registration_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_course_emp` (`course_id`, `employee_id`),
  CONSTRAINT `fk_attendee_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendee_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Bảng Thông báo (notifications)
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sender_id` VARCHAR(50) DEFAULT NULL,
  `sender_name` VARCHAR(100) DEFAULT NULL,
  `recipient_role` ENUM('admin', 'manager', 'employee', 'all') NOT NULL DEFAULT 'admin',
  `recipient_id` VARCHAR(50) DEFAULT NULL,
  `type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `link_tab` VARCHAR(50) DEFAULT NULL,
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Bảng Báo cáo Công việc (work_reports)
CREATE TABLE IF NOT EXISTS `work_reports` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` VARCHAR(20) NOT NULL,
  `report_type` ENUM('daily', 'weekly', 'incident', 'suggestion') NOT NULL DEFAULT 'daily',
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `date` VARCHAR(10) NOT NULL,
  `status` ENUM('submitted', 'reviewed') NOT NULL DEFAULT 'submitted',
  `manager_feedback` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_report_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- 15. Khởi tạo Views tương thích Đặc tả Tiếng Việt
-- ========================================================
CREATE OR REPLACE VIEW `DieuChuyenNhanVien` AS SELECT * FROM `employee_transfers`;
CREATE OR REPLACE VIEW `NhanVien` AS SELECT * FROM `employees`;
CREATE OR REPLACE VIEW `PhongBan` AS SELECT * FROM `departments`;
CREATE OR REPLACE VIEW `ChucVu` AS SELECT * FROM `positions`;
CREATE OR REPLACE VIEW `ChamCong` AS SELECT * FROM `attendance`;
CREATE OR REPLACE VIEW `BangLuong` AS SELECT * FROM `payroll`;
CREATE OR REPLACE VIEW `DonXinNghi` AS SELECT * FROM `leave_requests`;
CREATE OR REPLACE VIEW `HopDongLaoDong` AS SELECT * FROM `contracts`;
CREATE OR REPLACE VIEW `TaiKhoan` AS SELECT * FROM `users`;
CREATE OR REPLACE VIEW `KhoaHoc` AS SELECT * FROM `courses`;
CREATE OR REPLACE VIEW `ChiTietDaoTao` AS SELECT * FROM `course_attendees`;

