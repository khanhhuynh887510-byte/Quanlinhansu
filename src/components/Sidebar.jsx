import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, Users, Building2, CalendarCheck, 
  RotateCcw, Download, DollarSign, CalendarDays, FileText,
  User, Send, LogOut, Shield, UserCheck, MessageSquare,
  Bell, Award, Home, Clock, KeyRound, Shuffle
} from 'lucide-react';
import { api } from '../services/api';

export const Sidebar = ({ 
  activeTab, 
  setActiveTab, 
  employeeCount, 
  onResetData, 
  onExportCSV,
  currentUser,
  onOpenLoginModal
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const [empNotifUnread, setEmpNotifUnread] = useState(0);

  // Poll thông báo chưa đọc cho nhân viên và manager
  const loadEmpNotifCount = useCallback(async () => {
    if (!isAdmin && currentUser?.employee_id) {
      try {
        const res = await api.getNotifications({ role: 'employee', employee_id: currentUser.employee_id });
        if (res?.success) setEmpNotifUnread(res.unread_count || 0);
      } catch {}
    }
  }, [isAdmin, currentUser]);

  useEffect(() => {
    loadEmpNotifCount();
    if (!isAdmin) {
      const interval = setInterval(loadEmpNotifCount, 20000);
      return () => clearInterval(interval);
    }
  }, [loadEmpNotifCount, isAdmin]);

  // Menu dành cho Admin
  const adminNavItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'employees', label: 'Danh sách nhân sự', icon: Users, badge: employeeCount },
    { id: 'transfers', label: 'Điều chuyển nhân sự', icon: Shuffle },
    { id: 'departments', label: 'Phòng ban', icon: Building2 },
    { id: 'attendance', label: 'Chấm công', icon: CalendarCheck },
    { id: 'payroll', label: 'Lương & Thưởng Phạt', icon: DollarSign },
    { id: 'leaves', label: 'Đơn nghỉ phép', icon: CalendarDays },
    { id: 'contracts', label: 'Hợp đồng lao động', icon: FileText },
    { id: 'training', label: 'Đào tạo & Phát triển', icon: Award },
    { id: 'reports', label: 'Báo cáo từ nhân viên', icon: MessageSquare },
    { id: 'accounts', label: 'Tài khoản & Quyền truy cập', icon: KeyRound },
  ];

  // Menu dành cho Trưởng phòng
  const managerNavItems = [
    { id: 'mgr_dashboard', label: 'Tổng quan Phòng ban', icon: LayoutDashboard },
    { id: 'mgr_employees', label: 'Nhân sự của tôi', icon: Users },
    { id: 'mgr_transfers', label: 'Lịch sử điều chuyển', icon: Shuffle },
    { id: 'mgr_attendance', label: 'Chấm công Phòng ban', icon: CalendarCheck },
    { id: 'mgr_leaves', label: 'Đơn nghỉ phép', icon: CalendarDays },
    { id: 'mgr_reports', label: 'Báo cáo nhân viên', icon: MessageSquare },
    { id: 'mgr_training', label: 'Đào tạo & Phát triển', icon: Award },
    { id: 'mgr_notifications', label: 'Thông báo', icon: Bell, badge: empNotifUnread },
  ];

  // Menu dành cho Nhân viên
  const employeeNavItems = [
    { id: 'emp_dashboard', label: 'Bàn làm việc', icon: Home },
    { id: 'emp_attendance', label: 'Chấm công của tôi', icon: Clock },
    { id: 'emp_payslips', label: 'Phiếu lương', icon: DollarSign },
    { id: 'emp_leaves', label: 'Đơn nghỉ phép', icon: CalendarDays },
    { id: 'emp_transfers', label: 'Lịch sử điều chuyển', icon: Shuffle },
    { id: 'emp_training', label: 'Đào tạo & Khóa học', icon: Award },
    { id: 'emp_reports', label: 'Báo cáo & Đề xuất', icon: Send },
    { id: 'emp_rewards', label: 'Khen thưởng', icon: Award },
    { id: 'emp_profile', label: 'Hồ sơ cá nhân', icon: User },
    { id: 'emp_notifications', label: 'Thông báo', icon: Bell, badge: empNotifUnread },
  ];

  const currentNavItems = isAdmin ? adminNavItems : (isManager ? managerNavItems : employeeNavItems);

  const portalLabel = isAdmin ? 'Quản Trị Hệ Thống' : (isManager ? 'Trưởng Phòng Portal' : 'Cổng Nhân Viên');
  const logoGradient = isAdmin 
    ? 'linear-gradient(135deg, #4f46e5, #6366f1)' 
    : (isManager ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'linear-gradient(135deg, #10b981, #059669)');

  return (
    <aside className="sidebar" id="main-sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon-wrap" style={{ background: logoGradient }}>
          {isAdmin ? <Shield size={22} /> : (isManager ? <Award size={22} /> : <UserCheck size={22} />)}
        </div>
        <div className="logo-text">
          <h1>HRPro</h1>
          <p>{portalLabel}</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {currentNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              id={`nav-tab-${item.id}`}
              style={{ position: 'relative' }}
            >
              <Icon size={19} />
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {isAdmin && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={onExportCSV}
              title="Xuất dữ liệu nhân sự ra file CSV"
              style={{ flex: 1, padding: '7px 8px', fontSize: '0.78rem' }}
              id="sidebar-export-csv-btn"
            >
              <Download size={14} />
              <span>Xuất CSV</span>
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={onResetData}
              title="Khôi phục dữ liệu mẫu ban đầu"
              style={{ padding: '7px 8px' }}
              id="sidebar-reset-data-btn"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        )}

        {/* User Card */}
        <div 
          className="sidebar-user-card clickable-user-card"
          onClick={onOpenLoginModal}
          title="Bấm để chuyển đổi tài khoản"
        >
          <img
            src={
              currentUser?.role === 'admin'
                ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'
                : (currentUser?.employee_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username}`)
            }
            alt={currentUser?.username}
            className="sidebar-user-avatar"
          />
          <div className="sidebar-user-info" style={{ flex: 1 }}>
            <p style={{ fontWeight: 800 }}>
              {currentUser?.role === 'admin'
                ? 'Admin HR' 
                : (currentUser?.role === 'manager' 
                  ? (currentUser?.employee_name || 'Trưởng Phòng')
                  : (currentUser?.employee_name || currentUser?.username))}
            </p>
            <p style={{ fontSize: '0.72rem' }}>
              {currentUser?.role === 'admin' ? 'admin@company.vn' : `Mã: ${currentUser?.employee_id || currentUser?.username}`}
            </p>
          </div>
          <button 
            className="btn-icon" 
            style={{ width: '28px', height: '28px', padding: 0 }}
            title="Đổi tài khoản / Đăng xuất"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
};
