import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, Calendar, Clock, DollarSign, FileText, Plus, 
  CheckCircle2, Send, Award, Phone, Mail, MapPin, 
  Printer, Shield, KeyRound, MessageSquare, Bell,
  Check, X, AlertTriangle, TrendingUp, Star, Zap,
  ChevronRight, Info, Edit3, Gift, AlertCircle,
  Home, BarChart2, Eye, EyeOff, Sparkles, RefreshCw, Trash2, Save,
  BookOpen, GraduationCap, Upload, Shuffle, ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';
import { PayslipModal } from '../payroll/PayslipModal';

export const EmployeePortal = ({ 
  currentUser, 
  onShowToast, 
  activeTab = 'emp_dashboard', 
  setActiveTab,
  onUpdateCurrentUser
}) => {
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [attendanceData, setAttendanceData] = useState({});
  const [myPayrolls, setMyPayrolls] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [myContract, setMyContract] = useState(null);
  const [myRewards, setMyRewards] = useState([]);
  const [myNotifications, setMyNotifications] = useState([]);
  const [notifUnread, setNotifUnread] = useState(0);
  const [myTransfers, setMyTransfers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

  // Form Đơn Nghỉ Phép
  const [leaveType, setLeaveType] = useState('annual');
  const [leaveFrom, setLeaveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [leaveTo, setLeaveTo] = useState(new Date().toISOString().slice(0, 10));
  const [leaveDays, setLeaveDays] = useState(1.0);
  const [leaveReason, setLeaveReason] = useState('');

  // Form Báo Cáo Công Việc
  const [reportType, setReportType] = useState('daily');
  const [reportTitle, setReportTitle] = useState('');
  const [reportContent, setReportContent] = useState('');

  // Form Giải trình chấm công
  const [appealDate, setAppealDate] = useState(new Date().toISOString().slice(0, 10));
  const [appealReason, setAppealReason] = useState('');
  const [appealRequestedStatus, setAppealRequestedStatus] = useState('present');

  // Form Đổi mật khẩu
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  // Form Gửi thông báo tới Admin
  const [msgTitle, setMsgTitle] = useState('');
  const [msgContent, setMsgContent] = useState('');
  const [msgType, setMsgType] = useState('general');

  // Form Hồ sơ cá nhân
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileDob, setProfileDob] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [profileCccd, setProfileCccd] = useState('');

  // Chấm công thời gian thực & Khóa học đào tạo
  const [todayRecord, setTodayRecord] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('vi-VN'));
  const [allCourses, setAllCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const empId = currentUser?.employee_id;

  const loadEmployeeData = useCallback(async () => {
    if (!empId) return;
    setIsLoading(true);
    try {
      const [emp, att, payrolls, leaves, reports, contracts, rewards, notifs, todayAtt, courses, myC, transfers] = await Promise.all([
        api.getEmployeeById(empId),
        api.getAttendance(),
        api.getPayroll(),
        api.getLeaves({ employee_id: empId }),
        api.getReports({ employee_id: empId }),
        api.getContracts(),
        api.getRewardsPenalties({ employee_id: empId }),
        api.getNotifications({ role: 'employee', employee_id: empId }),
        api.getTodayAttendance(empId).catch(() => null),
        api.getCourses().catch(() => []),
        api.getMyCourses(empId).catch(() => []),
        api.getEmployeeTransfers(empId).catch(() => [])
      ]);

      setEmployeeInfo(emp);
      setAttendanceData(att || {});
      setMyPayrolls((payrolls || []).filter(p => p.employee_id === empId));
      setMyLeaves(leaves || []);
      setMyReports(reports || []);
      setMyContract((contracts || []).find(c => c.employee_id === empId));
      setMyRewards(rewards || []);
      setTodayRecord(todayAtt || null);
      setAllCourses(courses || []);
      setMyCourses(myC || []);
      setMyTransfers(transfers || []);

      // Đồng bộ form profile với data nhân viên
      if (emp) {
        setProfilePhone(emp.phone || '');
        setProfileAddress(emp.address || '');
        setProfileDob(emp.dob || '');
        setProfileAvatar(emp.avatar || '');
        setProfileCccd(emp.cccd || '');
      }

      if (notifs?.success) {
        setMyNotifications(notifs.data || []);
        setNotifUnread(notifs.unread_count || 0);
      }
    } catch (error) {
      console.error('Lỗi tải dữ liệu cá nhân:', error);
      if (onShowToast) onShowToast('Không thể tải dữ liệu nhân viên', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [empId, onShowToast]);

  useEffect(() => {
    loadEmployeeData();
    // Tự reload thông báo mỗi 20 giây
    const interval = setInterval(() => {
      api.getNotifications({ role: 'employee', employee_id: empId }).then(res => {
        if (res?.success) {
          setMyNotifications(res.data || []);
          setNotifUnread(res.unread_count || 0);
        }
      }).catch(() => {});
    }, 20000);
    return () => clearInterval(interval);
  }, [loadEmployeeData, empId]);

  // Đồng hồ thời gian thực
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('vi-VN'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Điểm danh vào ca thời gian thực (Check-in)
  const handleRealtimeCheckIn = async () => {
    try {
      const res = await api.checkIn(empId);
      if (res?.success) {
        if (onShowToast) onShowToast(res.message, 'success');
        await loadEmployeeData();
      }
    } catch (error) {
      if (onShowToast) onShowToast(error.message || 'Lỗi khi check-in', 'error');
    }
  };

  // Điểm danh tan ca thời gian thực (Check-out)
  const handleRealtimeCheckOut = async () => {
    try {
      const res = await api.checkOut(empId);
      if (res?.success) {
        if (onShowToast) onShowToast(res.message, 'success');
        await loadEmployeeData();
      }
    } catch (error) {
      if (onShowToast) onShowToast(error.message || 'Lỗi khi check-out', 'error');
    }
  };

  // 1-Click Đăng ký tham gia khóa học nội bộ
  const handleEnrollCourse = async (courseId) => {
    setIsEnrolling(true);
    try {
      const res = await api.enrollCourse(courseId, { employee_id: empId });
      if (res?.success) {
        if (onShowToast) onShowToast('🎓 Đăng ký tham gia khóa học thành công!', 'success');
        const [courses, myC] = await Promise.all([
          api.getCourses().catch(() => []),
          api.getMyCourses(empId).catch(() => [])
        ]);
        setAllCourses(courses || []);
        setMyCourses(myC || []);
      }
    } catch (error) {
      if (onShowToast) onShowToast(error.message || 'Lỗi khi đăng ký khóa học', 'error');
    } finally {
      setIsEnrolling(false);
    }
  };

  // Điểm danh thủ công (fallback)
  const handleCheckIn = async (status = 'present') => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      await api.saveAttendance(empId, status, today);
      setAttendanceData(prev => ({ ...prev, [empId]: status }));
      if (onShowToast) {
        onShowToast(
          status === 'present' ? '✅ Điểm danh vào ca thành công (Đúng giờ)!' : '⚠️ Đã ghi nhận đi muộn',
          'success'
        );
      }
    } catch (error) {
      if (onShowToast) onShowToast(error.message || 'Lỗi khi điểm danh', 'error');
    }
  };

  // Gửi giải trình chấm công
  const handleSubmitAppeal = async (e) => {
    e.preventDefault();
    if (!appealReason) return;
    try {
      await api.appealAttendance({
        employee_id: empId,
        date: appealDate,
        reason: appealReason,
        requested_status: appealRequestedStatus
      });
      setIsAppealModalOpen(false);
      setAppealReason('');
      if (onShowToast) onShowToast('📩 Đã gửi giải trình chấm công đến Quản trị viên!', 'success');
    } catch (error) {
      if (onShowToast) onShowToast(error.message || 'Lỗi gửi giải trình', 'error');
    }
  };

  // Nộp đơn nghỉ phép
  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    if (!leaveReason) return;
    try {
      await api.createLeave({
        employee_id: empId,
        leave_type: leaveType,
        from_date: leaveFrom,
        to_date: leaveTo,
        days_count: Number(leaveDays),
        reason: leaveReason
      });
      setIsLeaveModalOpen(false);
      setLeaveReason('');
      await loadEmployeeData();
      if (onShowToast) onShowToast('📅 Đã gửi đơn xin nghỉ phép và thông báo tới Quản lý!', 'success');
    } catch (error) {
      if (onShowToast) onShowToast(error.message || 'Lỗi gửi đơn nghỉ phép', 'error');
    }
  };

  // Nộp báo cáo công việc
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportTitle || !reportContent) return;
    try {
      await api.createReport({
        employee_id: empId,
        report_type: reportType,
        title: reportTitle,
        content: reportContent,
        date: new Date().toISOString().slice(0, 10)
      });
      setIsReportModalOpen(false);
      setReportTitle('');
      setReportContent('');
      await loadEmployeeData();
      if (onShowToast) onShowToast('📝 Đã nộp báo cáo và gửi thông báo tới Quản lý!', 'success');
    } catch (error) {
      if (onShowToast) onShowToast(error.message || 'Lỗi nộp báo cáo', 'error');
    }
  };

  // Gửi tin nhắn/thông báo tới Admin
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!msgTitle || !msgContent) return;
    try {
      await api.sendNotification({
        sender_id: empId,
        sender_name: employeeInfo?.name || currentUser?.employee_name,
        recipient_role: 'admin',
        type: msgType,
        title: msgTitle,
        message: msgContent,
        link_tab: 'reports'
      });
      setIsBroadcastModalOpen(false);
      setMsgTitle('');
      setMsgContent('');
      if (onShowToast) onShowToast('✉️ Đã gửi tin nhắn đến Quản trị viên!', 'success');
    } catch (error) {
      if (onShowToast) onShowToast(error.message || 'Lỗi gửi tin nhắn', 'error');
    }
  };

  // Đổi mật khẩu
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      if (onShowToast) onShowToast('Mật khẩu mới và xác nhận không khớp', 'error');
      return;
    }
    try {
      await api.changePassword({ username: currentUser.username, oldPassword, newPassword });
      setIsPasswordModalOpen(false);
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      if (onShowToast) onShowToast('🔐 Đổi mật khẩu thành công!', 'success');
    } catch (error) {
      if (onShowToast) onShowToast(error.message || 'Lỗi đổi mật khẩu', 'error');
    }
  };

  // Đánh dấu thông báo đã đọc
  const handleMarkNotiRead = async (noti) => {
    if (!noti.is_read) {
      try {
        await api.markNotificationRead(noti.id);
        setMyNotifications(prev => prev.map(n => n.id === noti.id ? { ...n, is_read: true } : n));
        setNotifUnread(prev => Math.max(0, prev - 1));
      } catch {}
    }
  };

  const handleMarkAllNotiRead = async () => {
    try {
      await api.markAllNotificationsRead('employee', empId);
      setMyNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setNotifUnread(0);
    } catch {}
  };

  // Xóa thông báo cá nhân
  const handleDeleteNotif = async (notifId, e) => {
    e.stopPropagation();
    try {
      await api.deleteNotification(notifId);
      setMyNotifications(prev => prev.filter(n => n.id !== notifId));
    } catch {}
  };

  // Cập nhật hồ sơ cá nhân
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const updated = await api.updateEmployeeProfile(empId, {
        phone: profilePhone,
        address: profileAddress,
        dob: profileDob,
        cccd: profileCccd,
        avatar: profileAvatar
      });
      if (updated) setEmployeeInfo(updated);
      setIsEditingProfile(false);

      // Sync ngay vào currentUser (Navbar avatar, tên hiển thị, ...)
      if (onUpdateCurrentUser) {
        onUpdateCurrentUser({
          employee_avatar: profileAvatar || updated?.avatar || currentUser?.employee_avatar,
          employee_name: updated?.name || currentUser?.employee_name,
          employee_phone: profilePhone || currentUser?.employee_phone,
        });
      }

      if (onShowToast) onShowToast('✅ Đã cập nhật hồ sơ cá nhân thành công!', 'success');
    } catch (error) {
      if (onShowToast) onShowToast(error.message || 'Lỗi cập nhật hồ sơ', 'error');
    }
  };

  const formatCurrency = (val) => (Number(val) || 0).toLocaleString('vi-VN') + ' ₫';
  const todayStatus = attendanceData[empId];

  // Tính số ngày phép đã dùng
  const usedAnnualDays = myLeaves
    .filter(l => l.leave_type === 'annual' && l.status === 'approved')
    .reduce((sum, l) => sum + Number(l.days_count || 0), 0);
  const remainingAnnualDays = Math.max(0, 12 - usedAnnualDays);

  // Tổng khen thưởng / kỷ luật
  const totalRewards = myRewards.filter(r => r.type === 'reward').reduce((s, r) => s + Number(r.amount), 0);
  const totalPenalties = myRewards.filter(r => r.type === 'penalty').reduce((s, r) => s + Number(r.amount), 0);

  // Lương thực lĩnh tháng gần nhất
  const latestPayroll = myPayrolls.sort((a, b) => b.month?.localeCompare(a.month))[0];

  const navItems = [
    { id: 'emp_dashboard', label: 'Tổng Quan', icon: Home },
    { id: 'emp_attendance', label: 'Chấm Công', icon: Clock },
    { id: 'emp_payslips', label: `Phiếu Lương (${myPayrolls.length})`, icon: DollarSign },
    { id: 'emp_leaves', label: `Nghỉ Phép (${myLeaves.length})`, icon: Calendar },
    { id: 'emp_transfers', label: `Điều Chuyển (${myTransfers.length})`, icon: Shuffle },
    { id: 'emp_training', label: `Đào Tạo (${myCourses.length})`, icon: GraduationCap },
    { id: 'emp_reports', label: `Báo Cáo (${myReports.length})`, icon: FileText },
    { id: 'emp_rewards', label: 'Khen Thưởng', icon: Award },
    { id: 'emp_notifications', label: `Thông Báo`, icon: Bell, badge: notifUnread },
    { id: 'emp_profile', label: 'Hồ Sơ Cá Nhân', icon: User },
  ];

  return (
    <div className="employee-portal-container">
      {/* 1. Profile Header Card */}
      <div className="emp-portal-profile-card">
        <div className="profile-main-info">
          <img
            src={employeeInfo?.avatar || currentUser?.employee_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${empId}`}
            alt={currentUser?.employee_name}
            className="portal-avatar"
          />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {employeeInfo?.name || currentUser?.employee_name || 'Nhân Viên'}
              </h2>
              <span className="badge-emp-id">{empId}</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsPasswordModalOpen(true)}
                style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <KeyRound size={13} />
                <span>Đổi mật khẩu</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsBroadcastModalOpen(true)}
                style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', color: '#6366f1' }}
                title="Gửi tin nhắn / thắc mắc đến Quản trị viên"
              >
                <MessageSquare size={13} />
                <span>Nhắn Admin</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={loadEmployeeData}
                style={{ padding: '3px 6px', fontSize: '0.75rem' }}
                title="Làm mới dữ liệu"
              >
                <RefreshCw size={13} />
              </button>
            </div>
            <p style={{ margin: '4px 0 8px', fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 600 }}>
              {employeeInfo?.position} • {employeeInfo?.department}
            </p>

            <div className="profile-contact-row">
              <span><Mail size={13} /> {employeeInfo?.email}</span>
              <span><Phone size={13} /> {employeeInfo?.phone}</span>
              <span><MapPin size={13} /> {employeeInfo?.address || 'Hà Nội'}</span>
              {employeeInfo?.dob && <span><Calendar size={13} /> {employeeInfo.dob}</span>}
            </div>
          </div>
        </div>

        {/* Quick Check-in & Realtime Clock */}
        <div className="portal-checkin-box">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {new Date().toLocaleDateString('vi-VN')}
            </span>
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>
              ⏰ {currentTime}
            </span>
          </div>

          <div style={{ margin: '6px 0' }}>
            {todayRecord?.check_in_time ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className={`status-badge ${todayRecord.status === 'late' ? 'badge-warning' : 'badge-success'}`} style={{ padding: '5px 10px', fontSize: '0.78rem' }}>
                  <CheckCircle2 size={13} /> Vào ca: <strong>{todayRecord.check_in_time}</strong> ({todayRecord.status === 'late' ? 'Đi muộn' : 'Đúng giờ'})
                </span>
                {todayRecord.check_out_time && (
                  <span className="status-badge badge-primary" style={{ padding: '5px 10px', fontSize: '0.78rem' }}>
                    <Clock size={13} /> Tan ca: <strong>{todayRecord.check_out_time}</strong>
                  </span>
                )}
              </div>
            ) : todayStatus === 'present' ? (
              <span className="status-badge badge-success" style={{ padding: '6px 12px' }}>
                <CheckCircle2 size={15} /> Đã vào ca (Đúng giờ)
              </span>
            ) : todayStatus === 'late' ? (
              <span className="status-badge badge-warning" style={{ padding: '6px 12px' }}>
                <Clock size={15} /> Đã vào ca (Đi muộn)
              </span>
            ) : (
              <span className="status-badge badge-secondary" style={{ padding: '6px 12px' }}>
                Chưa check-in hôm nay
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
            {!todayRecord?.check_in_time ? (
              <button className="btn btn-primary btn-sm" onClick={handleRealtimeCheckIn} style={{ fontSize: '0.78rem' }}>
                ⚡ Check-in Vào Ca
              </button>
            ) : !todayRecord?.check_out_time ? (
              <button className="btn btn-success btn-sm" onClick={handleRealtimeCheckOut} style={{ fontSize: '0.78rem', background: '#10b981', color: 'white' }}>
                🚪 Check-out Tan Ca
              </button>
            ) : (
              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                ✓ Hoàn thành ca làm việc hôm nay
              </span>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => setIsAppealModalOpen(true)} style={{ fontSize: '0.78rem' }}>
              Giải Trình
            </button>
          </div>
        </div>
      </div>

      {/* 2. Subtabs Navigation */}
      <div className="payroll-subtabs-nav" style={{ flexWrap: 'wrap' }}>
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`subtab-btn ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab && setActiveTab(item.id)}
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
          <p>Đang đồng bộ dữ liệu nhân sự...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: BÀN LÀM VIỆC TỔNG QUAN */}
          {activeTab === 'emp_dashboard' && (
            <div className="portal-tab-content">
              <div className="payroll-metrics-grid">
                <div className="metric-card">
                  <div className="metric-icon-wrap" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
                    <DollarSign size={22} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Lương Cơ Bản Hợp Đồng</span>
                    <h3 className="metric-value">{formatCurrency(employeeInfo?.salary)}</h3>
                    <span className="metric-sub">Thực lĩnh gần nhất: {latestPayroll ? formatCurrency(latestPayroll.net_salary) : 'Chưa có'}</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                    <Award size={22} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Khen Thưởng / Kỷ Luật</span>
                    <h3 className="metric-value" style={{ color: '#10b981' }}>
                      {myRewards.length > 0 ? `${myRewards.filter(r => r.type === 'reward').length} thưởng` : 'Chưa có'}
                    </h3>
                    <span className="metric-sub">
                      +{formatCurrency(totalRewards)} | -{formatCurrency(totalPenalties)}
                    </span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                    <Shield size={22} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Hợp Đồng Lao Động</span>
                    <h3 className="metric-value" style={{ fontSize: '1.1rem' }}>
                      {myContract?.contract_type || 'Chính thức'}
                    </h3>
                    <span className="metric-sub">
                      {myContract?.end_date ? `Thời hạn đến: ${myContract.end_date}` : 'Hợp đồng vô thời hạn'}
                    </span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                    <Calendar size={22} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Ngày Phép Năm Còn Lại</span>
                    <h3 className="metric-value" style={{ color: '#f59e0b' }}>
                      {remainingAnnualDays} / 12 ngày
                    </h3>
                    <span className="metric-sub">Đã dùng: {usedAnnualDays} ngày phép có lương</span>
                  </div>
                </div>
              </div>

              {/* Thông báo chưa đọc summary */}
              {notifUnread > 0 && (
                <div 
                  style={{ 
                    background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', 
                    borderRadius: '10px', padding: '12px 16px', marginTop: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
                  }}
                  onClick={() => setActiveTab && setActiveTab('emp_notifications')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: 'var(--primary)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Bell size={16} color="white" />
                    </div>
                    <div>
                      <strong style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>
                        Bạn có {notifUnread} thông báo mới từ Quản lý
                      </strong>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Bấm để xem chi tiết các thông báo chưa đọc
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} color="var(--primary)" />
                </div>
              )}

              {/* Quick Actions Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px', marginTop: '16px' }}>
                <div className="card" style={{ padding: '18px', cursor: 'pointer' }} onClick={() => setIsReportModalOpen(true)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(79, 70, 229, 0.12)', color: 'var(--primary)' }}>
                      <Send size={18} />
                    </div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      Nộp Báo Cáo Cho Quản Lý
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                    Gửi báo cáo ngày, tuần hoặc đề xuất sáng kiến để được xét thưởng.
                  </p>
                  <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); setIsReportModalOpen(true); }}>
                    <Send size={13} /> <span>Viết Báo Cáo Mới</span>
                  </button>
                </div>

                <div className="card" style={{ padding: '18px', cursor: 'pointer' }} onClick={() => setIsLeaveModalOpen(true)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                      <Calendar size={18} />
                    </div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      Xin Nghỉ Phép / Nghỉ Ốm
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                    Đăng ký đơn xin nghỉ phép năm, nghỉ ốm để quản lý phê duyệt.
                  </p>
                  <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setIsLeaveModalOpen(true); }}>
                    <Plus size={13} /> <span>Tạo Đơn Xin Nghỉ</span>
                  </button>
                </div>

                <div className="card" style={{ padding: '18px', cursor: 'pointer' }} onClick={() => setIsAppealModalOpen(true)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                      <Clock size={18} />
                    </div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      Giải Trình Chấm Công
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                    Gửi giải trình đi muộn, quên chấm công để admin xem xét miễn phạt.
                  </p>
                  <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setIsAppealModalOpen(true); }}>
                    <Clock size={13} /> <span>Gửi Giải Trình</span>
                  </button>
                </div>

                <div className="card" style={{ padding: '18px', cursor: 'pointer' }} onClick={() => setIsBroadcastModalOpen(true)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(236, 72, 153, 0.12)', color: '#ec4899' }}>
                      <MessageSquare size={18} />
                    </div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      Gửi Tin Nhắn Cho Admin
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                    Đặt câu hỏi, phản ánh ý kiến hoặc liên hệ về bất kỳ vấn đề nào.
                  </p>
                  <button className="btn btn-secondary btn-sm" style={{ color: '#ec4899' }} onClick={(e) => { e.stopPropagation(); setIsBroadcastModalOpen(true); }}>
                    <MessageSquare size={13} /> <span>Nhắn Tin Ngay</span>
                  </button>
                </div>
              </div>

              {/* Recent leaves & reports summary */}
              {(myLeaves.length > 0 || myReports.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px', marginTop: '16px' }}>
                  {myLeaves.length > 0 && (
                    <div className="card" style={{ padding: '16px' }}>
                      <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={15} color="#10b981" /> Đơn Nghỉ Phép Gần Đây
                      </h4>
                      {myLeaves.slice(0, 3).map(l => (
                        <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                          <div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {l.from_date} → {l.to_date}
                            </span>
                            <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--text-muted)' }}>{l.reason?.slice(0, 40)}...</p>
                          </div>
                          <span className={`status-badge ${l.status === 'approved' ? 'badge-success' : l.status === 'pending' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.68rem' }}>
                            {l.status === 'approved' ? 'Đã duyệt' : l.status === 'pending' ? 'Chờ' : 'Từ chối'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {myReports.length > 0 && (
                    <div className="card" style={{ padding: '16px' }}>
                      <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={15} color="var(--primary)" /> Báo Cáo Gần Đây
                      </h4>
                      {myReports.slice(0, 3).map(r => (
                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                          <div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{r.title?.slice(0, 35)}</span>
                            <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--text-muted)' }}>{r.date}</p>
                          </div>
                          <span className={`status-badge ${r.status === 'reviewed' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.68rem' }}>
                            {r.status === 'reviewed' ? 'Đã xét' : 'Đã gửi'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CHẤM CÔNG CỦA TÔI */}
          {activeTab === 'emp_attendance' && (
            <div className="portal-tab-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Tình Trạng Điểm Danh & Chấm Công Cá Nhân
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Theo dõi chấm công hàng ngày và gửi giải trình nếu có sai lệch
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => handleCheckIn('present')}>
                    <Check size={14} /> <span>Điểm Danh Đúng Giờ</span>
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setIsAppealModalOpen(true)}>
                    <Clock size={14} /> <span>Gửi Giải Trình</span>
                  </button>
                </div>
              </div>

              <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Trạng thái hôm nay ({new Date().toLocaleDateString('vi-VN')}):
                    </span>
                    <div style={{ marginTop: '6px' }}>
                      {todayStatus === 'present' ? (
                        <span className="status-badge badge-success" style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
                          <CheckCircle2 size={16} /> Có mặt làm việc (Đúng giờ) ✓ Tiêu chuẩn nhận thưởng chuyên cần
                        </span>
                      ) : todayStatus === 'late' ? (
                        <span className="status-badge badge-warning" style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
                          <Clock size={16} /> Đi muộn - Bấm Giải Trình nếu có lý do chính đáng
                        </span>
                      ) : (
                        <span className="status-badge badge-secondary" style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
                          Chưa có dữ liệu điểm danh hôm nay
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-primary" onClick={() => handleCheckIn('present')}>✓ Xác Nhận Có Mặt</button>
                    <button className="btn btn-secondary" onClick={() => handleCheckIn('late')} style={{ color: '#f59e0b' }}>Báo Đến Muộn</button>
                  </div>
                </div>
              </div>

              {/* Quy chế chuyên cần */}
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                  📋 Quy chế chấm công & chuyên cần:
                </strong>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  <li>Đi làm đầy đủ 100% không đi muộn: Nhận <strong>+1.000.000 ₫</strong> thưởng chuyên cần/tháng.</li>
                  <li>Đi muộn không có lý do: Phạt <strong>100.000 ₫/lần</strong> và mất thưởng chuyên cần tháng đó.</li>
                  <li>Nghỉ có xin phép trước: Không bị trừ thưởng kỷ luật, tính lương theo chế độ phép năm.</li>
                  <li>Đi muộn do khách quan: Bấm <strong>"Gửi Giải Trình"</strong> để Quản trị viên xem xét hủy phạt.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: PHIẾU LƯƠNG */}
          {activeTab === 'emp_payslips' && (
            <div className="portal-tab-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Lịch Sử Phiếu Lương & Thu Nhập
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Minh bạch từng khoản thu nhập, chuyên cần và các khoản giảm trừ
                  </span>
                </div>
              </div>

              {/* Tóm tắt thu nhập gần nhất */}
              {latestPayroll && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
                  gap: '10px', marginBottom: '16px' 
                }}>
                  {[
                    { label: 'Tháng gần nhất', value: latestPayroll.month, color: 'var(--text-primary)' },
                    { label: 'Lương thực lĩnh', value: formatCurrency(latestPayroll.net_salary), color: '#059669' },
                    { label: 'Ngày công', value: `${latestPayroll.actual_days}/${latestPayroll.standard_days} ngày`, color: 'var(--text-primary)' },
                    { label: 'Thưởng chuyên cần', value: `+${formatCurrency(latestPayroll.attendance_bonus)}`, color: '#10b981' },
                  ].map((item, i) => (
                    <div key={i} className="card" style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <p style={{ margin: '0 0 4px', fontSize: '0.73rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{item.label}</p>
                      <strong style={{ fontSize: '0.95rem', color: item.color }}>{item.value}</strong>
                    </div>
                  ))}
                </div>
              )}

              <div className="payroll-table-wrapper">
                <table className="payroll-table">
                  <thead>
                    <tr>
                      <th>Kỳ Lương</th>
                      <th>Lương CB</th>
                      <th>Ngày Công</th>
                      <th>Thưởng CC</th>
                      <th>Thưởng KPI</th>
                      <th>Phạt</th>
                      <th>Trừ BHXH</th>
                      <th>Thực Lĩnh</th>
                      <th>Trạng Thái</th>
                      <th style={{ textAlign: 'right' }}>Phiếu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myPayrolls.length === 0 ? (
                      <tr>
                        <td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                          Chưa có phiếu lương nào được phát hành cho bạn.
                        </td>
                      </tr>
                    ) : (
                      myPayrolls.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{p.month}</td>
                          <td>{formatCurrency(p.base_salary)}</td>
                          <td>{p.actual_days}/{p.standard_days}</td>
                          <td>{p.attendance_bonus > 0 ? <span className="badge-bonus">+{formatCurrency(p.attendance_bonus)}</span> : '-'}</td>
                          <td>{p.performance_bonus > 0 ? <span className="badge-contribution">+{formatCurrency(p.performance_bonus)}</span> : '-'}</td>
                          <td>
                            {p.late_penalty > 0 || p.unexcused_penalty > 0 ? (
                              <span className="badge-penalty-danger">
                                -{formatCurrency(Number(p.late_penalty || 0) + Number(p.unexcused_penalty || 0))}
                              </span>
                            ) : '0 ₫'}
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>-{formatCurrency(p.insurance_deduction)}</td>
                          <td style={{ fontWeight: 800, color: '#059669', fontSize: '1rem' }}>
                            {formatCurrency(p.net_salary)}
                          </td>
                          <td>
                            <span className={`status-badge ${p.status === 'paid' ? 'badge-success' : p.status === 'approved' ? 'badge-info' : 'badge-warning'}`}>
                              {p.status === 'paid' ? 'Đã nhận' : p.status === 'approved' ? 'Đã duyệt' : 'Nháp'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="btn btn-primary btn-sm" onClick={() => setSelectedPayslip(p)} style={{ padding: '4px 8px' }}>
                              <Printer size={13} /> <span>In</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: ĐƠN NGHỈ PHÉP */}
          {activeTab === 'emp_leaves' && (
            <div className="portal-tab-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Đơn Xin Nghỉ Phép & Trạng Thái Phê Duyệt
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Còn lại <strong style={{ color: '#f59e0b' }}>{remainingAnnualDays} ngày</strong> phép năm có lương
                  </span>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setIsLeaveModalOpen(true)}>
                  <Plus size={15} /> <span>+ Tạo Đơn Nghỉ Mới</span>
                </button>
              </div>

              <div className="payroll-table-wrapper">
                <table className="payroll-table">
                  <thead>
                    <tr>
                      <th>Mã Đơn</th>
                      <th>Loại Nghỉ</th>
                      <th>Thời Gian Nghỉ</th>
                      <th>Số Ngày</th>
                      <th>Lý Do</th>
                      <th>Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myLeaves.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                          Chưa có đơn nghỉ phép nào. Bấm <strong>+ Tạo Đơn Nghỉ Mới</strong> để gửi đến Quản lý.
                        </td>
                      </tr>
                    ) : (
                      myLeaves.map(l => (
                        <tr key={l.id}>
                          <td style={{ fontWeight: 700, color: 'var(--primary)' }}>#{l.id}</td>
                          <td>
                            <span className="badge-contract-type">
                              {l.leave_type === 'annual' ? 'Phép năm' : l.leave_type === 'sick' ? 'Nghỉ ốm' : l.leave_type === 'maternity' ? 'Thai sản' : 'Việc riêng'}
                            </span>
                          </td>
                          <td>{l.from_date} → {l.to_date}</td>
                          <td style={{ fontWeight: 700 }}>{l.days_count} ngày</td>
                          <td style={{ maxWidth: '200px' }}>{l.reason}</td>
                          <td>
                            <span className={`status-badge ${l.status === 'approved' ? 'badge-success' : l.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                              {l.status === 'approved' ? '✓ Đã phê duyệt' : l.status === 'pending' ? '⏳ Chờ duyệt' : '✗ Từ chối'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: BÁO CÁO CÔNG VIỆC */}
          {activeTab === 'emp_reports' && (
            <div className="portal-tab-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Báo Cáo Tiến Độ & Đề Xuất
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Mọi báo cáo sẽ được thông báo ngay đến Quản lý và nhận phản hồi tại đây
                  </span>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setIsReportModalOpen(true)}>
                  <Send size={14} /> <span>+ Viết Báo Cáo Mới</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {myReports.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    Chưa có báo cáo nào. Bấm <strong>Viết Báo Cáo Mới</strong> để gửi báo cáo đến quản lý!
                  </div>
                ) : (
                  myReports.map(rep => (
                    <div key={rep.id} className="card" style={{ padding: '18px', borderLeft: '4px solid var(--primary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <span className="badge-contract-type" style={{ marginBottom: '6px', display: 'inline-block' }}>
                            {rep.report_type === 'daily' ? '📅 Báo cáo ngày' : rep.report_type === 'weekly' ? '📊 Báo cáo tuần' : rep.report_type === 'suggestion' ? '💡 Đề xuất sáng kiến' : '🚨 Báo cáo sự cố'}
                          </span>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {rep.title}
                          </h4>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Ngày nộp: {rep.date}
                          </span>
                        </div>
                        <span className={`status-badge ${rep.status === 'reviewed' ? 'badge-success' : 'badge-warning'}`}>
                          {rep.status === 'reviewed' ? '✓ Đã được nhận xét' : '📤 Đã gửi quản lý'}
                        </span>
                      </div>

                      <p style={{ whiteSpace: 'pre-line', fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '12px 0', lineHeight: 1.7 }}>
                        {rep.content}
                      </p>

                      {rep.manager_feedback && (
                        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '12px 14px', borderRadius: '8px' }}>
                          <strong style={{ fontSize: '0.82rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <MessageSquare size={14} /> Phản hồi từ Quản lý:
                          </strong>
                          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                            {rep.manager_feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 6: KHEN THƯỞNG & KỶ LUẬT */}
          {activeTab === 'emp_rewards' && (
            <div className="portal-tab-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Lịch Sử Khen Thưởng & Kỷ Luật Cá Nhân
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Tổng thưởng: <strong style={{ color: '#10b981' }}>+{formatCurrency(totalRewards)}</strong> | 
                    Tổng phạt: <strong style={{ color: '#ef4444' }}> -{formatCurrency(totalPenalties)}</strong>
                  </span>
                </div>
              </div>

              {/* Summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <div className="metric-card">
                  <div className="metric-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                    <Star size={20} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Tổng Lần Thưởng</span>
                    <h3 className="metric-value" style={{ color: '#10b981' }}>
                      {myRewards.filter(r => r.type === 'reward').length} lần
                    </h3>
                    <span className="metric-sub">+{formatCurrency(totalRewards)}</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
                    <AlertTriangle size={20} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Tổng Lần Phạt</span>
                    <h3 className="metric-value" style={{ color: '#ef4444' }}>
                      {myRewards.filter(r => r.type === 'penalty').length} lần
                    </h3>
                    <span className="metric-sub">-{formatCurrency(totalPenalties)}</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon-wrap" style={{ background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)' }}>
                    <TrendingUp size={20} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Số Dư Ròng</span>
                    <h3 className="metric-value" style={{ color: totalRewards - totalPenalties >= 0 ? '#10b981' : '#ef4444' }}>
                      {totalRewards - totalPenalties >= 0 ? '+' : ''}{formatCurrency(totalRewards - totalPenalties)}
                    </h3>
                    <span className="metric-sub">Tổng cộng các khoản</span>
                  </div>
                </div>
              </div>

              {myRewards.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <Gift size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <p style={{ margin: 0 }}>Chưa có lịch sử khen thưởng hoặc kỷ luật nào.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {myRewards.map(r => (
                    <div key={r.id} className="card" style={{ 
                      padding: '14px 18px', 
                      borderLeft: `4px solid ${r.type === 'reward' ? '#10b981' : '#ef4444'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                          background: r.type === 'reward' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: r.type === 'reward' ? '#10b981' : '#ef4444'
                        }}>
                          {r.type === 'reward' ? <Star size={18} /> : <AlertTriangle size={18} />}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{r.title}</strong>
                            <span style={{ 
                              fontSize: '0.7rem', padding: '1px 8px', borderRadius: '10px', fontWeight: 700,
                              background: r.type === 'reward' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: r.type === 'reward' ? '#059669' : '#dc2626'
                            }}>
                              {r.type === 'reward' ? '🏆 Khen Thưởng' : '⚠️ Kỷ Luật'}
                            </span>
                          </div>
                          <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {r.date} • {r.reason || 'Theo quyết định của Ban Giám đốc'}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ 
                          fontSize: '1.05rem', fontWeight: 800,
                          color: r.type === 'reward' ? '#059669' : '#dc2626' 
                        }}>
                          {r.type === 'reward' ? '+' : '-'}{formatCurrency(r.amount)}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: THÔNG BÁO TỪ ADMIN */}
          {activeTab === 'emp_notifications' && (
            <div className="portal-tab-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Thông Báo Từ Quản Lý & Hệ Thống
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {notifUnread > 0 ? <span style={{ color: '#ef4444', fontWeight: 700 }}>{notifUnread} thông báo chưa đọc</span> : 'Đã đọc tất cả thông báo'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {notifUnread > 0 && (
                    <button className="btn btn-secondary btn-sm" onClick={handleMarkAllNotiRead}>
                      <Check size={14} /> <span>Đánh dấu tất cả đã đọc</span>
                    </button>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={loadEmployeeData}>
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {myNotifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <Bell size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <p style={{ margin: 0 }}>Hộp thông báo trống. Chưa có thông báo nào từ Quản lý.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {myNotifications.map(noti => {
                    const typeIcon = {
                      'leave_request': { icon: Calendar, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
                      'work_report': { icon: FileText, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
                      'payroll_notice': { icon: DollarSign, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
                      'reward_notice': { icon: Award, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' },
                      'attendance_appeal': { icon: Clock, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
                    }[noti.type] || { icon: Bell, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' };
                    const IconComp = typeIcon.icon;

                    return (
                      <div
                        key={noti.id}
                        className="card"
                        style={{ 
                          padding: '14px 16px',
                          borderLeft: `4px solid ${noti.is_read ? 'var(--border-color)' : typeIcon.color}`,
                          opacity: noti.is_read ? 0.8 : 1,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => handleMarkNotiRead(noti)}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{ 
                            width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                            background: typeIcon.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: typeIcon.color
                          }}>
                            <IconComp size={16} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{noti.title}</strong>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                {!noti.is_read && (
                                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                                )}
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {noti.created_at ? new Date(noti.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteNotif(noti.id, e)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', opacity: 0.6, transition: 'opacity 0.2s' }}
                                  title="Xóa thông báo này"
                                  onMouseOver={e => e.currentTarget.style.opacity = '1'}
                                  onMouseOut={e => e.currentTarget.style.opacity = '0.6'}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                              {noti.message}
                            </p>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                              Từ: {noti.sender_name || 'Hệ thống'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: HỒ SƠ CÁ NHÂN */}
          {activeTab === 'emp_profile' && (
            <div className="portal-tab-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Hồ SƠ Cá Nhân
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Xem và cập nhật thông tin liên lạc cá nhân của bạn
                  </span>
                </div>
                {!isEditingProfile && (
                  <button className="btn btn-primary btn-sm" onClick={() => setIsEditingProfile(true)}>
                    <Edit3 size={14} /> <span>Chỉnh sửa</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {/* Card thông tin cố định (không sửa được) */}
                <div className="card" style={{ padding: '20px' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={16} color="var(--primary)" /> Thông Tin Công Việc
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { label: 'Mã nhân viên', value: employeeInfo?.id || empId },
                      { label: 'Họ và tên', value: employeeInfo?.name },
                      { label: 'Email', value: employeeInfo?.email },
                      { label: 'Chức vụ', value: employeeInfo?.position },
                      { label: 'Phòng ban', value: employeeInfo?.department },
                      { label: 'Ngày vào làm', value: employeeInfo?.joinDate },
                      { label: 'Trạng thái', value: employeeInfo?.status },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{item.label}</span>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.value || '---'}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(99, 102, 241, 0.06)', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    ⚠️ Thông tin công việc chỉ có quản lý mới được cập nhật.
                  </div>
                </div>

                {/* Card thông tin cá nhân (có thể sửa) */}
                <div className="card" style={{ padding: '20px' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={16} color="#10b981" /> Thông Tin Cá Nhân
                    {isEditingProfile && <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 400 }}>(Chế độ chỉnh sửa)</span>}
                  </h4>
                  {isEditingProfile ? (
                    <form onSubmit={handleSaveProfile}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Số điện thoại</label>
                          <input type="tel" className="form-control" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="VD: 0901234567..." />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Ngày sinh</label>
                          <input type="date" className="form-control" value={profileDob} onChange={e => setProfileDob(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Thương trú / Địa chỉ</label>
                          <input type="text" className="form-control" value={profileAddress} onChange={e => setProfileAddress(e.target.value)} placeholder="VD: 123 Đường ABC, Quận 1, TP.HCM..." />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Số CCCD / CMND</label>
                          <input type="text" className="form-control" value={profileCccd} onChange={e => setProfileCccd(e.target.value)} placeholder="VD: 001201012345..." />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Ảnh đại diện (Tải từ máy hoặc nhập link URL)</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="url"
                              className="form-control"
                              value={profileAvatar}
                              onChange={e => setProfileAvatar(e.target.value)}
                              placeholder="https://... hoặc tải từ máy"
                              style={{ flex: 1 }}
                            />
                            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <Upload size={14} /> <span>Tải ảnh</span>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/gif"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (evt) => {
                                      const img = new window.Image();
                                      img.onload = () => {
                                        const canvas = document.createElement('canvas');
                                        const MAX = 400;
                                        let w = img.width, h = img.height;
                                        if (w > h) { if (w > MAX) { h = Math.round((h * MAX) / w); w = MAX; } }
                                        else { if (h > MAX) { w = Math.round((w * MAX) / h); h = MAX; } }
                                        canvas.width = w; canvas.height = h;
                                        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                                        setProfileAvatar(canvas.toDataURL('image/jpeg', 0.88));
                                      };
                                      img.src = evt.target.result;
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                          </div>
                          {profileAvatar && (
                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <img src={profileAvatar} alt="preview" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Xem trước ảnh đại diện</span>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button type="submit" className="btn btn-primary btn-sm">
                            <Save size={14} /> <span>Lưu Thay Đổi</span>
                          </button>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setIsEditingProfile(false); setProfilePhone(employeeInfo?.phone || ''); setProfileAddress(employeeInfo?.address || ''); setProfileDob(employeeInfo?.dob || ''); setProfileCccd(employeeInfo?.cccd || ''); setProfileAvatar(employeeInfo?.avatar || ''); }}>
                            Hủy
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {[
                        { label: 'Số CCCD / CMND', value: employeeInfo?.cccd, icon: Shield },
                        { label: 'Số điện thoại', value: employeeInfo?.phone, icon: Phone },
                        { label: 'Ngày sinh', value: employeeInfo?.dob, icon: Calendar },
                        { label: 'Địa chỉ', value: employeeInfo?.address, icon: MapPin },
                        { label: 'Giới tính', value: employeeInfo?.gender, icon: User },
                      ].map((item, i) => {
                        const IconComp = item.icon;
                        return (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                              <IconComp size={13} /> {item.label}
                            </span>
                            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.value || '---'}</span>
                          </div>
                        );
                      })}
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: '8px', alignSelf: 'flex-start' }}
                        onClick={() => setIsEditingProfile(true)}
                      >
                        <Edit3 size={13} /> <span>Cập nhật thông tin</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Ảnh đại diện */}
              <div className="card" style={{ padding: '20px', marginTop: '20px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={16} color="#6366f1" /> Ảnh Đại Diện Hiện Tại
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <img
                    src={employeeInfo?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${empId}`}
                    alt="Avatar"
                    style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)', boxShadow: '0 4px 20px rgba(99,102,241,0.3)' }}
                  />
                  <div>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {employeeInfo?.name || currentUser?.employee_name}
                    </p>
                    <p style={{ margin: '4px 0 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {employeeInfo?.position} • {employeeInfo?.department}
                    </p>
                    <button className="btn btn-secondary btn-sm" onClick={() => setIsEditingProfile(true)}>
                      <Edit3 size={13} /> <span>Đổi ảnh đại diện</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Ghi chú */}
              {employeeInfo?.notes && (
                <div className="card" style={{ padding: '16px', marginTop: '16px', borderLeft: '4px solid #f59e0b' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>
                    📝 Ghi Chú Từ Quản Lý
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {employeeInfo.notes}
                  </p>
                </div>
              )}

              {/* Card đổi mật khẩu */}
              <ChangePasswordCard currentUser={currentUser} onShowToast={onShowToast} />
            </div>
          )}

          {/* TAB: LỊCH SỬ ĐIỀU CHUYỂN & THĂNG CHỨC */}
          {activeTab === 'emp_transfers' && (
            <div className="portal-tab-content">
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                      <Shuffle size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                        Lịch Sử Điều Chuyển & Thăng Chức
                      </h3>
                      <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                        Quá trình phát triển sự nghiệp, bổ nhiệm vị trí và luân chuyển đơn vị công tác của bạn
                      </p>
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={loadEmployeeData}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RefreshCw size={14} /> Làm mới
                  </button>
                </div>

                {myTransfers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 20px', background: 'var(--input-bg)', borderRadius: '12px' }}>
                    <Shuffle size={36} style={{ color: 'var(--text-secondary)', margin: '0 auto 10px', opacity: 0.5 }} />
                    <h4 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Chưa có biến động vị trí</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      Hiện tại bạn đang công tác ổn định tại vị trí {employeeInfo?.position} thuộc bộ phận {employeeInfo?.department}.
                    </p>
                  </div>
                ) : (
                  <div className="transfer-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {myTransfers.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          background: 'var(--card-bg)',
                          borderRadius: '12px',
                          padding: '18px',
                          border: '1px solid var(--border-color)',
                          boxShadow: 'var(--card-shadow)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={13} /> Ngày hiệu lực: {t.effective_date}
                          </span>
                          <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                            Quyết định số #{t.id}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center', background: 'var(--input-bg)', padding: '12px 16px', borderRadius: '10px' }}>
                          <div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                              Vị Trí Trước Đó
                            </span>
                            <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '2px 0 0', fontSize: '0.9rem' }}>
                              {t.old_position}
                            </p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                              {t.old_department}
                            </p>
                          </div>
                          <div style={{ color: '#6366f1', textAlign: 'center' }}>
                            <ArrowRight size={20} />
                          </div>
                          <div>
                            <span style={{ fontSize: '0.72rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 700 }}>
                              Vị Trí & Phòng Ban Mới
                            </span>
                            <p style={{ fontWeight: 800, color: '#10b981', margin: '2px 0 0', fontSize: '0.9rem' }}>
                              {t.new_position}
                            </p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                              {t.new_department}
                            </p>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>Lý do & Căn cứ: </strong>
                          {t.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 9: ĐÀO TẠO & KHÓA HỌC */}
          {activeTab === 'emp_training' && (
            <div className="portal-tab-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <GraduationCap style={{ color: 'var(--primary)' }} />
                    Chương Trình Đào Tạo & Phát Triển Năng Lực
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    Tham gia các khóa học nâng cao nghiệp vụ, tích lũy điểm số và nhận chứng chỉ nội bộ.
                  </p>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={loadEmployeeData}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={14} /> Làm mới
                </button>
              </div>

              {/* Stat metrics */}
              <div className="payroll-metrics-grid" style={{ marginBottom: '20px' }}>
                <div className="metric-card">
                  <div className="metric-icon-wrap" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
                    <BookOpen size={20} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Khóa Học Đang Tham Gia</span>
                    <h3 className="metric-value">{myCourses.filter(c => c.status === 'Đang học').length}</h3>
                    <span className="metric-sub">Tổng đã đăng ký: {myCourses.length} khóa</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Đã Hoàn Thành</span>
                    <h3 className="metric-value">{myCourses.filter(c => c.status === 'Hoàn thành').length}</h3>
                    <span className="metric-sub">Đạt chuẩn đánh giá cuối khóa</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                    <Award size={20} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Chứng Chỉ Đã Nhận</span>
                    <h3 className="metric-value">{myCourses.filter(c => c.certificate_code).length}</h3>
                    <span className="metric-sub">Được cấp mã chứng chỉ chính thức</span>
                  </div>
                </div>
              </div>

              {/* Section 1: Khóa học của tôi */}
              <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} color="var(--primary)" />
                  Khóa Học Của Tôi ({myCourses.length})
                </h4>

                {myCourses.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                    <BookOpen size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Bạn chưa đăng ký khóa học nào. Hãy tham khảo các khóa học đang mở bên dưới!</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          <th style={{ padding: '10px' }}>Khóa Học</th>
                          <th style={{ padding: '10px' }}>Giảng Viên</th>
                          <th style={{ padding: '10px' }}>Thời Gian</th>
                          <th style={{ padding: '10px' }}>Hình Thức</th>
                          <th style={{ padding: '10px' }}>Trạng Thái</th>
                          <th style={{ padding: '10px' }}>Điểm Số</th>
                          <th style={{ padding: '10px' }}>Chứng Chỉ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myCourses.map((c, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.86rem' }}>
                            <td style={{ padding: '12px 10px' }}>
                              <strong style={{ color: 'var(--text-primary)' }}>{c.title}</strong>
                              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mã: {c.id || c.course_id}</span>
                            </td>
                            <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{c.instructor || 'Chuyên gia nội bộ'}</td>
                            <td style={{ padding: '12px 10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {c.start_date} → {c.end_date}
                            </td>
                            <td style={{ padding: '12px 10px' }}>
                              <span className="status-badge badge-secondary" style={{ fontSize: '0.72rem' }}>
                                {c.format || 'Trực tiếp'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 10px' }}>
                              <span className={`status-badge ${c.status === 'Hoàn thành' ? 'badge-success' : c.status === 'Đang học' ? 'badge-warning' : 'badge-secondary'}`} style={{ fontSize: '0.75rem' }}>
                                {c.status || 'Đang học'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 10px', fontWeight: 700, color: c.score >= 8 ? '#10b981' : 'var(--text-primary)' }}>
                              {c.score !== null && c.score !== undefined ? `${c.score} / 10` : '---'}
                            </td>
                            <td style={{ padding: '12px 10px' }}>
                              {c.certificate_code ? (
                                <span className="status-badge badge-primary" style={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700 }}>
                                  🏅 {c.certificate_code}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Chưa cấp</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Section 2: Khóa học mở đăng ký */}
              <div className="card" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="#f59e0b" />
                  Danh Sách Khóa Học Nội Bộ Đang Mở ({allCourses.length})
                </h4>

                {allCourses.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Hiện chưa có khóa học nào được mở trong kỳ này.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {allCourses.map((course) => {
                      const isEnrolled = myCourses.some(mc => (mc.course_id === course.id || mc.id === course.id));
                      return (
                        <div
                          key={course.id}
                          style={{
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            padding: '16px',
                            background: 'var(--card-bg)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                              <span className="status-badge badge-primary" style={{ fontSize: '0.72rem' }}>
                                {course.format || 'Trực tiếp'}
                              </span>
                              <span className="badge-emp-id" style={{ fontSize: '0.7rem' }}>{course.id}</span>
                            </div>

                            <h5 style={{ fontSize: '0.98rem', fontWeight: 800, margin: '0 0 8px', color: 'var(--text-primary)' }}>
                              {course.title}
                            </h5>

                            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>
                              {course.description || 'Chương trình đào tạo nâng cao năng lực thực chiến dành riêng cho nhân sự công ty.'}
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <User size={13} color="var(--primary)" />
                                <span>Giảng viên: <strong style={{ color: 'var(--text-primary)' }}>{course.instructor || 'Chuyên gia đào tạo'}</strong></span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={13} color="var(--primary)" />
                                <span>Thời gian: {course.start_date} → {course.end_date}</span>
                              </div>
                              {course.budget > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <DollarSign size={13} color="#10b981" />
                                  <span>Tài trợ: <strong>{Number(course.budget).toLocaleString('vi-VN')} ₫</strong> (Công ty đài thọ 100%)</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            {isEnrolled ? (
                              <button className="btn btn-secondary btn-sm" disabled style={{ width: '100%', opacity: 0.8, cursor: 'default', color: '#10b981' }}>
                                <CheckCircle2 size={14} /> <span>Đã Tham Gia Khóa Này</span>
                              </button>
                            ) : (
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ width: '100%' }}
                                onClick={() => handleEnrollCourse(course.id)}
                                disabled={isEnrolling}
                              >
                                <GraduationCap size={14} /> <span>Đăng Ký Tham Gia</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </>
      )}

      {/* MODAL PHIẾU LƯƠNG */}
      <PayslipModal
        isOpen={!!selectedPayslip}
        payslip={selectedPayslip}
        onClose={() => setSelectedPayslip(null)}
      />

      {/* MODAL GIẢI TRÌNH CHẤM CÔNG */}
      {isAppealModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAppealModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} color="var(--primary)" />
                <h2 className="modal-title">Gửi Giải Trình Chấm Công</h2>
              </div>
              <button className="btn-close" onClick={() => setIsAppealModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitAppeal} className="modal-body">
              <div className="form-group">
                <label className="form-label">Ngày cần giải trình</label>
                <input type="date" className="form-control" value={appealDate} onChange={(e) => setAppealDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Đề xuất công nhận trạng thái</label>
                <select className="form-control" value={appealRequestedStatus} onChange={(e) => setAppealRequestedStatus(e.target.value)}>
                  <option value="present">Đúng giờ (Có mặt làm việc bình thường)</option>
                  <option value="late">Đi muộn có lý do chính đáng (Xin miễn phạt)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Lý do giải trình <span className="text-danger">*</span></label>
                <textarea className="form-control" rows="4" value={appealReason} onChange={(e) => setAppealReason(e.target.value)} placeholder="Nêu rõ lý do (VD: Quên quẹt thẻ do họp khách hàng sớm, mưa bão kẹt xe...)" required />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Giải trình sẽ được gửi ngay đến Quản trị viên để xét duyệt.
                </span>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAppealModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">
                  <Send size={15} /> <span>Gửi Giải Trình Đến Admin</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TẠO ĐƠN NGHỈ PHÉP */}
      {isLeaveModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsLeaveModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '95%' }}>
            <div className="modal-header">
              <h2 className="modal-title">Nộp Đơn Xin Nghỉ Phép</h2>
              <button className="btn-close" onClick={() => setIsLeaveModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitLeave} className="modal-body">
              <div className="form-group">
                <label className="form-label">Loại nghỉ phép</label>
                <select className="form-control" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                  <option value="annual">Phép năm (Có hưởng lương)</option>
                  <option value="sick">Nghỉ ốm đau / Điều trị</option>
                  <option value="unpaid">Nghỉ việc riêng không lương</option>
                  <option value="maternity">Nghỉ thai sản</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Từ ngày</label>
                  <input type="date" className="form-control" value={leaveFrom} onChange={(e) => setLeaveFrom(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Đến ngày</label>
                  <input type="date" className="form-control" value={leaveTo} onChange={(e) => setLeaveTo(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Số ngày nghỉ</label>
                <input type="number" step="0.5" min="0.5" className="form-control" value={leaveDays} onChange={(e) => setLeaveDays(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Lý do xin nghỉ <span className="text-danger">*</span></label>
                <textarea className="form-control" rows="3" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="Nêu rõ lý do xin nghỉ..." required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsLeaveModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">
                  <Send size={15} /> <span>Gửi Đơn Đến Quản Lý</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VIẾT BÁO CÁO CÔNG VIỆC */}
      {isReportModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsReportModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '95%' }}>
            <div className="modal-header">
              <h2 className="modal-title">Gửi Báo Cáo Công Việc & Đề Xuất</h2>
              <button className="btn-close" onClick={() => setIsReportModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitReport} className="modal-body">
              <div className="form-group">
                <label className="form-label">Loại báo cáo</label>
                <select className="form-control" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                  <option value="daily">📅 Báo cáo tiến độ hàng ngày</option>
                  <option value="weekly">📊 Báo cáo tổng kết tuần</option>
                  <option value="incident">🚨 Báo cáo sự cố / Phát sinh kỹ thuật</option>
                  <option value="suggestion">💡 Đề xuất sáng kiến cải tiến (Xét thưởng)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tiêu đề báo cáo <span className="text-danger">*</span></label>
                <input type="text" className="form-control" value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} placeholder="VD: Báo cáo công việc tuần 3 tháng 9..." required />
              </div>
              <div className="form-group">
                <label className="form-label">Nội dung chi tiết <span className="text-danger">*</span></label>
                <textarea className="form-control" rows="6" value={reportContent} onChange={(e) => setReportContent(e.target.value)} placeholder="Chi tiết công việc đã hoàn thành, khó khăn vướng mắc hoặc nội dung sáng kiến..." required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsReportModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">
                  <Send size={15} /> <span>Gửi Báo Cáo Cho Admin</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GỬI TIN NHẮN / THÔNG BÁO TỚI ADMIN */}
      {isBroadcastModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsBroadcastModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={20} color="#ec4899" />
                <h2 className="modal-title">Gửi Tin Nhắn Đến Admin</h2>
              </div>
              <button className="btn-close" onClick={() => setIsBroadcastModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSendMessage} className="modal-body">
              <div className="form-group">
                <label className="form-label">Loại tin nhắn</label>
                <select className="form-control" value={msgType} onChange={(e) => setMsgType(e.target.value)}>
                  <option value="general">💬 Liên hệ / Thắc mắc chung</option>
                  <option value="work_report">📋 Phản ánh về công việc</option>
                  <option value="attendance_appeal">⏰ Thắc mắc về chấm công / lương</option>
                  <option value="leave_request">📅 Hỏi về chế độ nghỉ phép</option>
                  <option value="suggestion">💡 Góp ý cải tiến quy trình</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tiêu đề <span className="text-danger">*</span></label>
                <input type="text" className="form-control" value={msgTitle} onChange={(e) => setMsgTitle(e.target.value)} placeholder="VD: Thắc mắc về phiếu lương tháng 9..." required />
              </div>
              <div className="form-group">
                <label className="form-label">Nội dung tin nhắn <span className="text-danger">*</span></label>
                <textarea className="form-control" rows="5" value={msgContent} onChange={(e) => setMsgContent(e.target.value)} placeholder="Nội dung chi tiết câu hỏi hoặc phản ánh của bạn..." required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsBroadcastModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #ec4899, #a855f7)' }}>
                  <Send size={15} /> <span>Gửi Tin Nhắn Đến Admin</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ĐỔI MẬT KHẨU */}
      {isPasswordModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsPasswordModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={20} color="var(--primary)" />
                <h2 className="modal-title">Đổi Mật Khẩu Cá Nhân</h2>
              </div>
              <button className="btn-close" onClick={() => setIsPasswordModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleChangePassword} className="modal-body">
              <div className="form-group">
                <label className="form-label">Mật khẩu hiện tại</label>
                <div style={{ position: 'relative' }}>
                  <input type={showOldPwd ? 'text' : 'password'} className="form-control" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="Nhập mật khẩu hiện tại..." required style={{ paddingRight: '40px' }} />
                  <button type="button" onClick={() => setShowOldPwd(p => !p)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {showOldPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Mật khẩu mới</label>
                <div style={{ position: 'relative' }}>
                  <input type={showNewPwd ? 'text' : 'password'} className="form-control" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Tối thiểu 3 ký tự..." required style={{ paddingRight: '40px' }} />
                  <button type="button" onClick={() => setShowNewPwd(p => !p)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Xác nhận mật khẩu mới</label>
                <input type="password" className="form-control" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu mới..." required />
                {confirmPassword && newPassword !== confirmPassword && (
                  <span style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <AlertCircle size={12} /> Mật khẩu xác nhận chưa khớp
                  </span>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsPasswordModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={confirmPassword !== newPassword && confirmPassword.length > 0}>
                  <KeyRound size={15} /> <span>Cập Nhật Mật Khẩu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ============ Sub-component: Đổi Mật Khẩu (nhúng trong tab hồ sơ) ============
const ChangePasswordCard = ({ currentUser, onShowToast }) => {
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      if (onShowToast) onShowToast('Mật khẩu mới và xác nhận không khớp!', 'error');
      return;
    }
    if (newPwd.length < 3) {
      if (onShowToast) onShowToast('Mật khẩu mới tối thiểu 3 ký tự!', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await api.changePassword({ username: currentUser?.username, oldPassword: oldPwd, newPassword: newPwd });
      if (onShowToast) onShowToast('🔑 Đã đổi mật khẩu thành công! Vui lòng đăng nhập lại.', 'success');
      setOldPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Lỗi đổi mật khẩu', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card" style={{ padding: '20px', marginTop: '20px', borderLeft: '4px solid #6366f1' }}>
      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <KeyRound size={16} color="#6366f1" /> Đổi Mật Khẩu
      </h4>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '400px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Mật khẩu hiện tại <span className="text-danger">*</span></label>
            <div style={{ position: 'relative' }}>
              <input
                type={showOld ? 'text' : 'password'}
                className="form-control"
                value={oldPwd}
                onChange={e => setOldPwd(e.target.value)}
                required
                style={{ paddingRight: '40px' }}
              />
              <button type="button" onClick={() => setShowOld(p => !p)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Mật khẩu mới <span className="text-danger">*</span></label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                className="form-control"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="Tối thiểu 3 ký tự..."
                required
                style={{ paddingRight: '40px' }}
              />
              <button type="button" onClick={() => setShowNew(p => !p)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Xác nhận mật khẩu mới <span className="text-danger">*</span></label>
            <input
              type="password"
              className="form-control"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              placeholder="Nhập lại mật khẩu mới..."
              required
              style={{ borderColor: confirmPwd && newPwd && confirmPwd !== newPwd ? '#ef4444' : undefined }}
            />
            {confirmPwd && newPwd && confirmPwd !== newPwd && (
              <span style={{ fontSize: '0.78rem', color: '#ef4444' }}>⚠ Mật khẩu xác nhận không khớp</span>
            )}
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={isLoading} style={{ alignSelf: 'flex-start' }}>
            <KeyRound size={14} /> <span>{isLoading ? 'Đang xử lý...' : 'Đổi Mật Khẩu'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

