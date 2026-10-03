import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Home, CalendarCheck, CalendarDays, FileText,
  CheckCircle2, XCircle, Clock, Send, Bell, Award,
  ChevronRight, RefreshCw, MessageSquare, TrendingUp,
  BarChart2, Star, BookOpen, Shield, AlertCircle,
  User, Mail, Phone, Check, X, Eye, ArrowRight,
  Building2, Briefcase, DollarSign, Shuffle
} from 'lucide-react';
import { api } from '../../services/api';

export const ManagerPortal = ({
  currentUser,
  onShowToast,
  activeTab = 'mgr_dashboard',
  setActiveTab,
  employees = []
}) => {
  const [deptEmployees, setDeptEmployees] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [allAttendance, setAllAttendance] = useState({});
  const [allReports, setAllReports] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [deptTransfers, setDeptTransfers] = useState([]);
  const [myNotifications, setMyNotifications] = useState([]);
  const [notifUnread, setNotifUnread] = useState(0);
  const [managerInfo, setManagerInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modal states
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackReport, setFeedbackReport] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isLeaveDetailOpen, setIsLeaveDetailOpen] = useState(false);
  const [leaveDetail, setLeaveDetail] = useState(null);

  // Notification form
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState('general');
  const [notifTargetId, setNotifTargetId] = useState('');

  const empId = currentUser?.employee_id;
  const managerDepartment = currentUser?.employee_department;

  const loadData = useCallback(async () => {
    if (!empId) return;
    setIsLoading(true);
    try {
      const [emp, leaves, att, reports, courses, notifs, transfers] = await Promise.all([
        api.getEmployeeById(empId),
        api.getLeaves(),
        api.getAttendance(),
        api.getReports(),
        api.getCourses(),
        api.getNotifications({ role: 'employee', employee_id: empId }),
        api.getTransfers().catch(() => [])
      ]);

      setManagerInfo(emp);

      // Filter employees in manager's department
      const currentDeptName = emp?.department || managerDepartment;
      const deptEmps = employees.filter(e => e.department === currentDeptName);
      setDeptEmployees(deptEmps);

      // Filter leaves for department employees
      const deptEmpIds = new Set(deptEmps.map(e => e.id));
      const deptLeaves = (leaves || []).filter(l => deptEmpIds.has(l.employee_id));
      setAllLeaves(deptLeaves);

      setAllAttendance(att || {});
      setAllReports((reports || []).filter(r => deptEmpIds.has(r.employee_id)));
      setAllCourses(courses || []);

      // Filter transfers related to this department
      const deptTransfersList = (transfers || []).filter(t =>
        t.new_department === currentDeptName ||
        t.old_department === currentDeptName ||
        deptEmpIds.has(t.employee_id)
      );
      setDeptTransfers(deptTransfersList);

      if (notifs?.success) {
        setMyNotifications(notifs.data || []);
        setNotifUnread(notifs.unread_count || 0);
      }
    } catch (error) {
      console.error('Lỗi tải dữ liệu trưởng phòng:', error);
      if (onShowToast) onShowToast('Không thể tải dữ liệu phòng ban', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [empId, employees, managerDepartment, onShowToast]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      api.getNotifications({ role: 'employee', employee_id: empId }).then(res => {
        if (res?.success) {
          setMyNotifications(res.data || []);
          setNotifUnread(res.unread_count || 0);
        }
      }).catch(() => {});
    }, 20000);
    return () => clearInterval(interval);
  }, [loadData, empId]);

  const handleApproveLeave = async (leaveId, status) => {
    try {
      await api.updateLeaveStatus(leaveId, status);
      setAllLeaves(prev => prev.map(l => l.id === leaveId ? { ...l, status, approver_name: managerInfo?.name || currentUser?.employee_name } : l));
      if (onShowToast) onShowToast(
        status === 'approved' ? '✅ Đã duyệt đơn nghỉ phép!' : '❌ Đã từ chối đơn nghỉ phép.',
        status === 'approved' ? 'success' : 'info'
      );
      setIsLeaveDetailOpen(false);
      setLeaveDetail(null);
    } catch (error) {
      if (onShowToast) onShowToast(error.message || 'Lỗi cập nhật đơn nghỉ phép', 'error');
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackReport || !feedbackText) return;
    try {
      await api.submitReportFeedback(feedbackReport.id, feedbackText);
      setAllReports(prev => prev.map(r => r.id === feedbackReport.id ? { ...r, manager_feedback: feedbackText, status: 'reviewed' } : r));
      setIsFeedbackModalOpen(false);
      setFeedbackReport(null);
      setFeedbackText('');
      if (onShowToast) onShowToast('💬 Đã gửi nhận xét tới nhân viên!', 'success');
    } catch (error) {
      if (onShowToast) onShowToast(error.message || 'Lỗi gửi nhận xét', 'error');
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notifTitle || !notifMessage) return;
    try {
      if (notifTargetId) {
        await api.sendNotificationToEmployee({
          employee_id: notifTargetId,
          type: notifType,
          title: notifTitle,
          message: notifMessage
        });
      } else {
        // Gửi cho toàn bộ phòng ban
        for (const emp of deptEmployees) {
          if (emp.id !== empId) {
            await api.sendNotificationToEmployee({
              employee_id: emp.id,
              type: notifType,
              title: notifTitle,
              message: notifMessage
            });
          }
        }
      }
      setIsNotifModalOpen(false);
      setNotifTitle(''); setNotifMessage(''); setNotifTargetId('');
      if (onShowToast) onShowToast('📢 Đã gửi thông báo tới thành viên phòng ban!', 'success');
    } catch (error) {
      if (onShowToast) onShowToast(error.message || 'Lỗi gửi thông báo', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead('employee', empId);
      setMyNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setNotifUnread(0);
    } catch {}
  };

  const formatCurrency = (val) => (Number(val) || 0).toLocaleString('vi-VN') + ' ₫';

  const todayStr = new Date().toISOString().slice(0, 10);
  const pendingLeaves = allLeaves.filter(l => l.status === 'pending');
  const pendingReports = allReports.filter(r => r.status === 'submitted');

  // Tính tỷ lệ điểm danh hôm nay
  const presentToday = deptEmployees.filter(e => allAttendance[e.id] === 'present').length;
  const lateToday = deptEmployees.filter(e => allAttendance[e.id] === 'late').length;
  const absentToday = deptEmployees.length - presentToday - lateToday;

  const navItems = [
    { id: 'mgr_dashboard', label: 'Tổng Quan', icon: Home },
    { id: 'mgr_employees', label: `Nhân Sự (${deptEmployees.length})`, icon: Users },
    { id: 'mgr_transfers', label: `Điều Chuyển (${deptTransfers.length})`, icon: Shuffle },
    { id: 'mgr_attendance', label: 'Chấm Công', icon: CalendarCheck },
    { id: 'mgr_leaves', label: `Đơn Nghỉ Phép`, icon: CalendarDays, badge: pendingLeaves.length },
    { id: 'mgr_reports', label: `Báo Cáo`, icon: FileText, badge: pendingReports.length },
    { id: 'mgr_training', label: 'Đào Tạo', icon: BookOpen },
    { id: 'mgr_notifications', label: 'Thông Báo', icon: Bell, badge: notifUnread },
  ];

  return (
    <div className="employee-portal-container">
      {/* Header Card */}
      <div className="emp-portal-profile-card" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(99, 102, 241, 0.08))' }}>
        <div className="profile-main-info">
          <img
            src={managerInfo?.avatar || currentUser?.employee_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${empId}`}
            alt={currentUser?.employee_name}
            className="portal-avatar"
          />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {managerInfo?.name || currentUser?.employee_name || 'Trưởng Phòng'}
              </h2>
              <span style={{
                padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)'
              }}>
                ⭐ Trưởng Phòng
              </span>
              <span className="badge-emp-id">{empId}</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsNotifModalOpen(true)}
                style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}
              >
                <Send size={13} />
                <span>Thông báo phòng ban</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={loadData}
                style={{ padding: '3px 6px', fontSize: '0.75rem' }}
                title="Làm mới dữ liệu"
              >
                <RefreshCw size={13} />
              </button>
            </div>
            <p style={{ margin: '4px 0 8px', fontSize: '0.9rem', color: '#f59e0b', fontWeight: 600 }}>
              {managerInfo?.position || 'Trưởng phòng'} • {managerInfo?.department || managerDepartment}
            </p>
            <div className="profile-contact-row">
              <span><Mail size={13} /> {managerInfo?.email}</span>
              <span><Phone size={13} /> {managerInfo?.phone}</span>
              <span><Building2 size={13} /> {deptEmployees.length} nhân sự trong phòng</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="portal-checkin-box" style={{ minWidth: '200px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Hôm nay: {new Date().toLocaleDateString('vi-VN')}
          </span>
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#10b981' }}>✓ Có mặt:</span>
              <strong style={{ color: '#10b981' }}>{presentToday}/{deptEmployees.length}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#f59e0b' }}>⏰ Đi muộn:</span>
              <strong style={{ color: '#f59e0b' }}>{lateToday}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#ef4444' }}>✗ Vắng:</span>
              <strong style={{ color: '#ef4444' }}>{absentToday}</strong>
            </div>
          </div>
          {pendingLeaves.length > 0 && (
            <div style={{ marginTop: '8px', padding: '5px 8px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px', fontSize: '0.76rem', color: '#ef4444', fontWeight: 600, cursor: 'pointer' }}
              onClick={() => setActiveTab?.('mgr_leaves')}>
              🔴 {pendingLeaves.length} đơn nghỉ chờ duyệt →
            </div>
          )}
        </div>
      </div>

      {/* Sub Nav */}
      <div className="payroll-subtabs-nav" style={{ flexWrap: 'wrap' }}>
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`subtab-btn ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab?.(item.id)}
              style={{ position: 'relative' }}
            >
              <Icon size={16} />
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span style={{
                  position: 'absolute', top: '4px', right: '4px',
                  background: '#ef4444', color: 'white', fontSize: '0.6rem',
                  width: '16px', height: '16px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
                }}>
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px', opacity: 0.5 }} />
          <p>Đang đồng bộ dữ liệu phòng ban...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: TỔNG QUAN PHÒNG BAN */}
          {activeTab === 'mgr_dashboard' && (
            <div className="portal-tab-content">
              {/* Metric Cards */}
              <div className="payroll-metrics-grid">
                <div className="metric-card">
                  <div className="metric-icon-wrap" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
                    <Users size={22} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Nhân Sự Phòng Ban</span>
                    <h3 className="metric-value">{deptEmployees.length}</h3>
                    <span className="metric-sub">{deptEmployees.filter(e => e.status === 'Đang làm việc').length} đang hoạt động</span>
                  </div>
                </div>

                <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab?.('mgr_leaves')}>
                  <div className="metric-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
                    <CalendarDays size={22} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Đơn Nghỉ Chờ Duyệt</span>
                    <h3 className="metric-value" style={{ color: pendingLeaves.length > 0 ? '#ef4444' : 'var(--text-primary)' }}>
                      {pendingLeaves.length}
                    </h3>
                    <span className="metric-sub">Tổng: {allLeaves.length} đơn</span>
                  </div>
                </div>

                <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab?.('mgr_reports')}>
                  <div className="metric-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                    <FileText size={22} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Báo Cáo Chờ Nhận Xét</span>
                    <h3 className="metric-value" style={{ color: pendingReports.length > 0 ? '#10b981' : 'var(--text-primary)' }}>
                      {pendingReports.length}
                    </h3>
                    <span className="metric-sub">Tổng: {allReports.length} báo cáo</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                    <CalendarCheck size={22} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Chấm Công Hôm Nay</span>
                    <h3 className="metric-value" style={{ color: '#f59e0b' }}>
                      {presentToday + lateToday}/{deptEmployees.length}
                    </h3>
                    <span className="metric-sub">{absentToday > 0 ? `${absentToday} người vắng mặt` : 'Đầy đủ nhân sự'}</span>
                  </div>
                </div>
              </div>

              {/* Các đơn nghỉ phép chờ duyệt */}
              {pendingLeaves.length > 0 && (
                <div className="card" style={{ padding: '20px', marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertCircle size={16} color="#ef4444" /> Đơn Nghỉ Phép Chờ Duyệt ({pendingLeaves.length})
                    </h4>
                    <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab?.('mgr_leaves')}>
                      Xem tất cả <ArrowRight size={13} />
                    </button>
                  </div>
                  {pendingLeaves.slice(0, 3).map(leave => {
                    const emp = deptEmployees.find(e => e.id === leave.employee_id);
                    return (
                      <div key={leave.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary)',
                        marginBottom: '8px', flexWrap: 'wrap', gap: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={emp?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${leave.employee_id}`}
                            alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div>
                            <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{emp?.name || leave.employee_id}</strong>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {leave.from_date} → {leave.to_date} • {leave.days_count} ngày
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#10b981', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}
                            onClick={() => handleApproveLeave(leave.id, 'approved')}
                          >
                            <Check size={12} /> Duyệt
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}
                            onClick={() => handleApproveLeave(leave.id, 'rejected')}
                          >
                            <X size={12} /> Từ chối
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Báo cáo chờ nhận xét */}
              {pendingReports.length > 0 && (
                <div className="card" style={{ padding: '20px', marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={16} color="#10b981" /> Báo Cáo Chờ Nhận Xét ({pendingReports.length})
                    </h4>
                    <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab?.('mgr_reports')}>
                      Xem tất cả <ArrowRight size={13} />
                    </button>
                  </div>
                  {pendingReports.slice(0, 3).map(report => {
                    const emp = deptEmployees.find(e => e.id === report.employee_id);
                    return (
                      <div key={report.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary)',
                        marginBottom: '8px', flexWrap: 'wrap', gap: '8px'
                      }}>
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{report.title}</strong>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {emp?.name || report.employee_id} • {report.date} • {report.report_type}
                          </p>
                        </div>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => { setFeedbackReport(report); setFeedbackText(report.manager_feedback || ''); setIsFeedbackModalOpen(true); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}
                        >
                          <MessageSquare size={13} /> Nhận xét
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quick Actions */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginTop: '16px' }}>
                <div className="card" style={{ padding: '16px', cursor: 'pointer' }} onClick={() => setIsNotifModalOpen(true)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                      <Send size={18} />
                    </div>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Gửi Thông Báo</h3>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Gửi thông báo nội bộ tới toàn bộ hoặc từng nhân viên trong phòng ban.
                  </p>
                </div>

                <div className="card" style={{ padding: '16px', cursor: 'pointer' }} onClick={() => setActiveTab?.('mgr_training')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
                      <BookOpen size={18} />
                    </div>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Quản Lý Đào Tạo</h3>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Đề cử nhân sự tham gia các khóa học và theo dõi tiến độ đào tạo.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NHÂN SỰ PHÒNG BAN */}
          {activeTab === 'mgr_employees' && (
            <div className="portal-tab-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Nhân Sự Phòng Ban: {managerInfo?.department || managerDepartment}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {deptEmployees.length} thành viên trong phòng ban của bạn
                  </p>
                </div>
              </div>

              {deptEmployees.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                  <Users size={40} style={{ opacity: 0.2, marginBottom: '10px' }} />
                  <p>Chưa có nhân viên nào trong phòng ban</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {deptEmployees.map(emp => {
                    const attStatus = allAttendance[emp.id];
                    return (
                      <div key={emp.id} className="card" style={{
                        padding: '16px 20px', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <img
                            src={emp.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.id}`}
                            alt={emp.name}
                            style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>{emp.name}</strong>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace', background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: '4px' }}>{emp.id}</span>
                              {attStatus === 'present' && <span className="status-badge badge-success" style={{ fontSize: '0.68rem' }}>✓ Có mặt</span>}
                              {attStatus === 'late' && <span className="status-badge badge-warning" style={{ fontSize: '0.68rem' }}>⏰ Đi muộn</span>}
                              {attStatus === 'absent' && <span className="status-badge badge-danger" style={{ fontSize: '0.68rem' }}>✗ Vắng</span>}
                              {!attStatus && <span className="status-badge" style={{ fontSize: '0.68rem', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>Chưa điểm danh</span>}
                            </div>
                            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {emp.position} • {emp.email}
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              Lương CB: {formatCurrency(emp.salary)} • Ngày vào: {emp.joinDate}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                          <span className={`status-badge ${emp.status === 'Đang làm việc' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.75rem' }}>
                            {emp.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CHẤM CÔNG PHÒNG BAN */}
          {activeTab === 'mgr_attendance' && (
            <div className="portal-tab-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Tình Trạng Chấm Công Phòng Ban - {new Date().toLocaleDateString('vi-VN')}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Theo dõi điểm danh hàng ngày của toàn bộ nhân viên trong phòng ban
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className="status-badge badge-success" style={{ padding: '6px 12px' }}>✓ {presentToday} có mặt</span>
                  <span className="status-badge badge-warning" style={{ padding: '6px 12px' }}>⏰ {lateToday} muộn</span>
                  <span className="status-badge badge-danger" style={{ padding: '6px 12px' }}>✗ {absentToday} vắng</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {deptEmployees.map(emp => {
                  const attStatus = allAttendance[emp.id];
                  return (
                    <div key={emp.id} className="card" style={{
                      padding: '14px 16px', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', gap: '10px',
                      borderLeft: `4px solid ${attStatus === 'present' ? '#10b981' : attStatus === 'late' ? '#f59e0b' : attStatus === 'absent' ? '#ef4444' : 'var(--border-color)'}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={emp.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.id}`}
                          alt={emp.name}
                          style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{emp.name}</strong>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.position}</p>
                        </div>
                      </div>
                      <div>
                        {attStatus === 'present' && <span className="status-badge badge-success" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>✓ Đúng giờ</span>}
                        {attStatus === 'late' && <span className="status-badge badge-warning" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>⏰ Đi muộn</span>}
                        {attStatus === 'absent' && <span className="status-badge badge-danger" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>✗ Vắng mặt</span>}
                        {attStatus === 'excused' && <span className="status-badge badge-info" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>📋 Có phép</span>}
                        {!attStatus && <span className="status-badge" style={{ fontSize: '0.78rem', background: 'var(--bg-secondary)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Chưa điểm danh</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: ĐƠN NGHỈ PHÉP */}
          {activeTab === 'mgr_leaves' && (
            <div className="portal-tab-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Phê Duyệt Đơn Nghỉ Phép Phòng Ban
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {pendingLeaves.length} đơn đang chờ phê duyệt của bạn
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className="status-badge badge-warning" style={{ padding: '6px 12px' }}>⏳ {pendingLeaves.length} chờ duyệt</span>
                  <span className="status-badge badge-success" style={{ padding: '6px 12px' }}>✓ {allLeaves.filter(l => l.status === 'approved').length} đã duyệt</span>
                </div>
              </div>

              {allLeaves.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                  <CalendarDays size={40} style={{ opacity: 0.2, marginBottom: '10px' }} />
                  <p>Chưa có đơn nghỉ phép nào trong phòng ban</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[...allLeaves].sort((a, b) => {
                    const statusOrder = { pending: 0, approved: 1, rejected: 2 };
                    return (statusOrder[a.status] || 1) - (statusOrder[b.status] || 1);
                  }).map(leave => {
                    const emp = deptEmployees.find(e => e.id === leave.employee_id);
                    const leaveTypeMap = {
                      annual: 'Phép năm', sick: 'Nghỉ ốm', unpaid: 'Nghỉ không lương',
                      maternity: 'Thai sản', unexcused: 'Không phép'
                    };
                    return (
                      <div key={leave.id} className="card" style={{
                        padding: '16px 20px',
                        borderLeft: `4px solid ${leave.status === 'pending' ? '#f59e0b' : leave.status === 'approved' ? '#10b981' : '#ef4444'}`
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img
                              src={emp?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${leave.employee_id}`}
                              alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{emp?.name || leave.employee_id}</strong>
                                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', fontWeight: 600 }}>
                                  {leaveTypeMap[leave.leave_type] || leave.leave_type}
                                </span>
                              </div>
                              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                📅 {leave.from_date} → {leave.to_date} • {leave.days_count} ngày
                              </p>
                              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                Lý do: {leave.reason}
                              </p>
                              {leave.approver_name && (
                                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                  Người duyệt: {leave.approver_name}
                                </p>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                            <span className={`status-badge ${leave.status === 'pending' ? 'badge-warning' : leave.status === 'approved' ? 'badge-success' : 'badge-danger'}`}>
                              {leave.status === 'pending' ? '⏳ Chờ duyệt' : leave.status === 'approved' ? '✅ Đã duyệt' : '❌ Từ chối'}
                            </span>
                            {leave.status === 'pending' && (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  className="btn btn-sm"
                                  style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600 }}
                                  onClick={() => handleApproveLeave(leave.id, 'approved')}
                                >
                                  <Check size={13} /> Phê duyệt
                                </button>
                                <button
                                  className="btn btn-sm"
                                  style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                                  onClick={() => handleApproveLeave(leave.id, 'rejected')}
                                >
                                  <X size={13} /> Từ chối
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: BÁO CÁO CÔNG VIỆC */}
          {activeTab === 'mgr_reports' && (
            <div className="portal-tab-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Báo Cáo Công Việc Từ Nhân Viên
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Xem xét và nhận xét báo cáo từ nhân viên trong phòng ban
                  </p>
                </div>
                <span className="status-badge badge-warning" style={{ padding: '6px 12px' }}>
                  {pendingReports.length} chờ nhận xét
                </span>
              </div>

              {allReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                  <FileText size={40} style={{ opacity: 0.2, marginBottom: '10px' }} />
                  <p>Chưa có báo cáo nào từ nhân viên</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {allReports.map(report => {
                    const emp = deptEmployees.find(e => e.id === report.employee_id);
                    const typeMap = { daily: 'Nhật ký', weekly: 'Tuần', incident: 'Sự cố', suggestion: 'Đề xuất' };
                    return (
                      <div key={report.id} className="card" style={{
                        padding: '16px 20px',
                        borderLeft: `4px solid ${report.status === 'reviewed' ? '#10b981' : '#f59e0b'}`
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                              <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>{report.title}</strong>
                              <span style={{ fontSize: '0.72rem', padding: '2px 7px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', fontWeight: 600 }}>
                                {typeMap[report.report_type] || report.report_type}
                              </span>
                              <span className={`status-badge ${report.status === 'reviewed' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.68rem' }}>
                                {report.status === 'reviewed' ? 'Đã nhận xét' : 'Chờ nhận xét'}
                              </span>
                            </div>
                            <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              👤 {emp?.name || report.employee_id} • 📅 {report.date}
                            </p>
                            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                              {report.content?.slice(0, 150)}{report.content?.length > 150 ? '...' : ''}
                            </p>
                            {report.manager_feedback && (
                              <div style={{ marginTop: '8px', padding: '8px 10px', background: 'rgba(16, 185, 129, 0.06)', borderRadius: '6px', borderLeft: '3px solid #10b981' }}>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#059669', fontStyle: 'italic' }}>
                                  💬 Nhận xét: {report.manager_feedback}
                                </p>
                              </div>
                            )}
                          </div>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => { setFeedbackReport(report); setFeedbackText(report.manager_feedback || ''); setIsFeedbackModalOpen(true); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
                          >
                            <MessageSquare size={13} />
                            <span>{report.manager_feedback ? 'Sửa nhận xét' : 'Gửi nhận xét'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: ĐIỀU CHUYỂN & BIẾN ĐỘNG PHÒNG BAN */}
          {activeTab === 'mgr_transfers' && (
            <div className="portal-tab-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shuffle style={{ color: '#6366f1' }} size={22} />
                    Lịch Sử Biến Động & Điều Chuyển Nhân Sự Phòng Ban
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Theo dõi nhân sự điều chuyển đến và chuyển đi của {managerInfo?.department || managerDepartment}
                  </p>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={loadData}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={14} /> Làm mới
                </button>
              </div>

              {deptTransfers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--input-bg)', borderRadius: '14px' }}>
                  <Shuffle size={40} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
                  <h4 style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Chưa có quyết định điều chuyển nào</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Phòng ban hiện đang có cơ cấu nhân sự ổn định.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {deptTransfers.map((t) => {
                    const isIncoming = t.new_department === (managerInfo?.department || managerDepartment);
                    return (
                      <div
                        key={t.id}
                        className="card"
                        style={{
                          padding: '18px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          borderLeft: `4px solid ${isIncoming ? '#10b981' : '#f59e0b'}`
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={t.employee_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.employee_id}`}
                              alt={t.employee_name}
                              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <div>
                              <strong style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                                {t.employee_name}
                              </strong>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                                Mã: {t.employee_id}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span className="badge" style={{
                              background: isIncoming ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                              color: isIncoming ? '#10b981' : '#f59e0b',
                              fontWeight: 700
                            }}>
                              {isIncoming ? '📥 Tiếp nhận vào phòng' : '📤 Chuyển sang phòng khác'}
                            </span>
                            <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                              Hiệu lực: {t.effective_date}
                            </span>
                          </div>
                        </div>

                        {/* Transition */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '10px', alignItems: 'center', background: 'var(--input-bg)', padding: '10px 14px', borderRadius: '10px' }}>
                          <div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                              Trước đó
                            </span>
                            <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '0.88rem' }}>{t.old_position}</p>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.old_department}</p>
                          </div>
                          <div style={{ color: '#6366f1' }}>
                            <ArrowRight size={18} />
                          </div>
                          <div>
                            <span style={{ fontSize: '0.72rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 700 }}>
                              Sau điều chuyển
                            </span>
                            <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '0.88rem', color: '#10b981' }}>{t.new_position}</p>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.new_department}</p>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                          <strong>Lý do: </strong> {t.reason}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: ĐÀO TẠO */}
          {activeTab === 'mgr_training' && (
            <div className="portal-tab-content">
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Danh Sách Khóa Học & Đào Tạo
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Theo dõi và đề cử nhân viên tham gia các khóa đào tạo
                </p>
              </div>

              {allCourses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                  <BookOpen size={40} style={{ opacity: 0.2, marginBottom: '10px' }} />
                  <p>Chưa có khóa học nào</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  {allCourses.map(course => {
                    const statusMap = {
                      upcoming: { label: 'Sắp khai giảng', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
                      in_progress: { label: 'Đang diễn ra', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                      completed: { label: 'Đã hoàn thành', color: '#10b981', bg: 'rgba(16,185,129,0.1)' }
                    };
                    const s = statusMap[course.status] || statusMap.upcoming;
                    return (
                      <div key={course.id} className="card" style={{ padding: '18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', flex: 1, paddingRight: '8px' }}>
                            {course.title}
                          </h4>
                          <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
                            {s.label}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {course.description?.slice(0, 100)}...
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <span>👨‍🏫 Giảng viên: {course.instructor}</span>
                          <span>📅 {course.start_date} → {course.end_date}</span>
                          <span>📚 Hình thức: {course.format}</span>
                          <span>💰 Ngân sách: {(Number(course.budget) || 0).toLocaleString('vi-VN')} ₫</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: THÔNG BÁO */}
          {activeTab === 'mgr_notifications' && (
            <div className="portal-tab-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Thông Báo Của Tôi
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {notifUnread} thông báo chưa đọc
                  </p>
                </div>
                {notifUnread > 0 && (
                  <button className="btn btn-secondary btn-sm" onClick={handleMarkAllRead}>
                    <Check size={13} /> Đánh dấu tất cả đã đọc
                  </button>
                )}
              </div>

              {myNotifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                  <Bell size={40} style={{ opacity: 0.2, marginBottom: '10px' }} />
                  <p>Không có thông báo nào</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {myNotifications.map(notif => (
                    <div
                      key={notif.id}
                      style={{
                        padding: '14px 18px', borderRadius: '10px',
                        background: notif.is_read ? 'var(--bg-surface)' : 'rgba(99, 102, 241, 0.06)',
                        border: `1px solid ${notif.is_read ? 'var(--border-color)' : 'rgba(99, 102, 241, 0.2)'}`,
                        cursor: 'pointer'
                      }}
                      onClick={async () => {
                        if (!notif.is_read) {
                          await api.markNotificationRead(notif.id);
                          setMyNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                          setNotifUnread(prev => Math.max(0, prev - 1));
                        }
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{notif.title}</strong>
                            {!notif.is_read && (
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', display: 'inline-block', flexShrink: 0 }} />
                            )}
                          </div>
                          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{notif.message}</p>
                          <p style={{ margin: '4px 0 0', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                            {new Date(notif.created_at).toLocaleString('vi-VN')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL: Gửi Thông Báo */}
      {isNotifModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsNotifModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={20} color="#f59e0b" />
                <h2 className="modal-title">Gửi Thông Báo Tới Nhân Viên Phòng Ban</h2>
              </div>
              <button className="btn-close" onClick={() => setIsNotifModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSendNotification} className="modal-body">
              <div className="form-group">
                <label className="form-label">Gửi tới</label>
                <select className="form-control" value={notifTargetId} onChange={e => setNotifTargetId(e.target.value)}>
                  <option value="">📢 Toàn bộ phòng ban ({deptEmployees.length} người)</option>
                  {deptEmployees.filter(e => e.id !== empId).map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Loại thông báo</label>
                <select className="form-control" value={notifType} onChange={e => setNotifType(e.target.value)}>
                  <option value="general">📢 Thông báo chung</option>
                  <option value="leave_request">📋 Liên quan nghỉ phép</option>
                  <option value="reward_notice">🏆 Khen thưởng</option>
                  <option value="attendance_appeal">⏰ Chấm công</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tiêu đề <span className="text-danger">*</span></label>
                <input type="text" className="form-control" value={notifTitle} onChange={e => setNotifTitle(e.target.value)} required placeholder="Nhập tiêu đề thông báo..." />
              </div>
              <div className="form-group">
                <label className="form-label">Nội dung <span className="text-danger">*</span></label>
                <textarea className="form-control" rows={3} value={notifMessage} onChange={e => setNotifMessage(e.target.value)} required placeholder="Nhập nội dung thông báo..." />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsNotifModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                  <Send size={15} /> <span>Gửi Thông Báo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nhận Xét Báo Cáo */}
      {isFeedbackModalOpen && feedbackReport && (
        <div className="modal-backdrop" onClick={() => setIsFeedbackModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={20} color="#10b981" />
                <h2 className="modal-title">Nhận Xét Báo Cáo Công Việc</h2>
              </div>
              <button className="btn-close" onClick={() => setIsFeedbackModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitFeedback} className="modal-body">
              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', marginBottom: '14px' }}>
                <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{feedbackReport.title}</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {feedbackReport.date} • {feedbackReport.employee_id}
                </p>
                <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {feedbackReport.content?.slice(0, 200)}...
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">Nhận xét của Trưởng phòng <span className="text-danger">*</span></label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  required
                  placeholder="Nhập nhận xét, góp ý cho nhân viên..."
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsFeedbackModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">
                  <Send size={15} /> <span>Gửi Nhận Xét</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
