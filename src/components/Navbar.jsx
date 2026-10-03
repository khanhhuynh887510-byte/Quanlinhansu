import React from 'react';
import { Sun, Moon, UserPlus, LogIn, UserCheck, Shield, ChevronDown } from 'lucide-react';
import { NotificationDropdown } from './notifications/NotificationDropdown';

export const Navbar = ({ 
  activeTab, 
  theme, 
  toggleTheme, 
  onOpenAddModal, 
  dbStatus = 'connecting', 
  dbName = 'quan_li_nhan_su',
  currentUser,
  onOpenLoginModal,
  onNavigate
}) => {
  const getTabTitle = () => {
    if (currentUser?.role === 'employee') {
      return { 
        title: `Cổng Nhân Viên: ${currentUser.employee_name || currentUser.username}`, 
        sub: `Mã NV: ${currentUser.employee_id} • ${currentUser.employee_position || 'Nhân sự'} • ${currentUser.employee_department || ''}` 
      };
    }

    switch (activeTab) {
      case 'dashboard':
        return { title: 'Bảng Điều Khiển Tổng Quan', sub: 'Thống kê tổng quan tình hình nhân sự toàn công ty' };
      case 'employees':
        return { title: 'Quản Lý Hồ Sơ Nhân Sự', sub: 'Danh sách, thông tin liên lạc và vị trí công tác' };
      case 'departments':
        return { title: 'Cơ Cấu Phòng Ban', sub: 'Danh sách các bộ phận chuyên trách và trưởng phòng' };
      case 'attendance':
        return { title: 'Bảng Chấm Công & Điểm Danh', sub: 'Theo dõi tình trạng làm việc hàng ngày' };
      case 'payroll':
        return { title: 'Quản Lý Bảng Lương & Thưởng Phạt', sub: 'Tính toán lương tự động, thưởng chuyên cần, đóng góp & các khoản trừ' };
      case 'leaves':
        return { title: 'Quản Lý Nghỉ Phép & Đơn Từ', sub: 'Xét duyệt đơn nghỉ phép năm, nghỉ ốm, thai sản và chế độ' };
      case 'contracts':
        return { title: 'Quản Lý Hợp Đồng Lao Động', sub: 'Theo dõi hợp đồng, chế độ tiền lương và cảnh báo hết hạn 30 ngày' };
      case 'reports':
        return { title: 'Báo Cáo Công Việc & Đề Xuất', sub: 'Tiếp nhận báo cáo định kỳ và phản hồi đánh giá nhân sự' };
      default:
        return { title: 'Quản Lý Nhân Sự', sub: 'Hệ thống quản lý nội bộ' };
    }
  };

  const { title, sub } = getTabTitle();

  return (
    <header className="navbar" id="top-navbar">
      <div className="nav-title-wrap">
        <h2>{title}</h2>
        <p>{sub}</p>
      </div>

      <div className="navbar-actions">
        {/* MySQL Database Status Indicator */}
        <div 
          className={`db-status-badge ${dbStatus === 'connected' ? 'connected' : dbStatus === 'error' ? 'error' : 'connecting'}`}
          title={dbStatus === 'connected' ? `Cơ sở dữ liệu MySQL: Đã kết nối (${dbName || 'quan_li_nhan_su'})` : 'Chưa kết nối được MySQL'}
        >
          <span className="status-indicator-dot"></span>
          <span className="status-indicator-text">
            {dbStatus === 'connected' ? 'MySQL Online' : dbStatus === 'error' ? 'MySQL Lỗi' : 'Kết nối MySQL...'}
          </span>
        </div>

        {/* Quả chuông thông báo thời gian thực */}
        <NotificationDropdown 
          currentUser={currentUser}
          onNavigate={onNavigate}
        />

        {/* Theme Toggle */}
        <button
          className="btn-icon"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
          id="theme-toggle-btn"
          aria-label="Đổi giao diện sáng/tối"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User Account / Role Switcher Pill */}
        <button
          className="user-role-badge-btn"
          onClick={onOpenLoginModal}
          title="Bấm để đổi tài khoản hoặc đăng nhập với vai trò khác"
        >
          {currentUser?.role === 'admin' ? (
            <Shield size={16} color="var(--primary)" />
          ) : (
            <UserCheck size={16} color="#10b981" />
          )}
          <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
            <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {currentUser?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
            </span>
            <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
              {currentUser?.role === 'admin' ? 'Admin HR' : (currentUser?.employee_name || currentUser?.username)}
            </strong>
          </div>
          <ChevronDown size={14} color="var(--text-muted)" />
        </button>

        {/* Admin only: Add employee button */}
        {currentUser?.role === 'admin' && (
          <button
            className="btn btn-primary"
            onClick={onOpenAddModal}
            id="navbar-add-employee-btn"
          >
            <UserPlus size={18} />
            <span>Thêm nhân viên</span>
          </button>
        )}
      </div>
    </header>
  );
};
