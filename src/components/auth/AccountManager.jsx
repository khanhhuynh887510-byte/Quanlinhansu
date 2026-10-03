import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, UserCheck, KeyRound, Trash2, UserPlus,
  Search, RefreshCw, Bell, Send, X,
  Users, Calendar, MessageSquare,
  Megaphone, Info, AlertCircle, Eye, EyeOff, Lock, Unlock, Award
} from 'lucide-react';
import { api } from '../../services/api';

export const AccountManager = ({ employees = [], onShowToast }) => {
  const [accounts, setAccounts] = useState([]);
  const [unregisteredEmps, setUnregisteredEmps] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modal states
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSendNotifModalOpen, setIsSendNotifModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(null);

  // Form states — Đăng ký
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regEmpId, setRegEmpId] = useState('');
  const [regRole, setRegRole] = useState('employee'); // 'employee', 'manager', 'admin'
  const [showRegPwd, setShowRegPwd] = useState(false);

  // Form states — Reset mật khẩu
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState('123456');
  const [showResetPwd, setShowResetPwd] = useState(false);

  // Form states — Gửi thông báo cá nhân
  const [notifTarget, setNotifTarget] = useState(null);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState('general');

  // Form states — Broadcast
  const [broadTitle, setBroadTitle] = useState('');
  const [broadMessage, setBroadMessage] = useState('');
  const [broadType, setBroadType] = useState('general');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [users, unreg] = await Promise.all([
        api.getUsers(),
        api.getUnregisteredEmployees()
      ]);
      setAccounts(users || []);
      setUnregisteredEmps(unreg || []);
      if (unreg && unreg.length > 0) {
        setRegEmpId(unreg[0].id);
        setRegUsername(unreg[0].id.toLowerCase());
      }
    } catch (err) {
      if (onShowToast) onShowToast('Không thể tải danh sách tài khoản: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRegEmpChange = (empId) => {
    setRegEmpId(empId);
    const emp = unregisteredEmps.find(e => e.id === empId);
    if (emp) setRegUsername(emp.id.toLowerCase());
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regUsername || !regPassword) return;
    try {
      await api.register({
        username: regUsername.trim(),
        password: regPassword,
        role: regRole,
        employee_id: regRole === 'admin' ? null : regEmpId
      });
      if (onShowToast) onShowToast(`Đã tạo tài khoản "${regUsername}" với quyền "${regRole}"!`, 'success');
      setIsRegisterModalOpen(false);
      setRegUsername(''); setRegPassword('');
      await loadData();
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Lỗi tạo tài khoản', 'error');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetTarget) return;
    try {
      await api.resetUserPassword(resetTarget.id, resetPassword);
      if (onShowToast) onShowToast(`Đã reset mật khẩu tài khoản "${resetTarget.username}" thành: ${resetPassword}`, 'success');
      setIsResetModalOpen(false);
      setResetTarget(null);
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Lỗi reset mật khẩu', 'error');
    }
  };

  const handleToggleStatus = async (userId, username, currentStatus) => {
    try {
      const res = await api.toggleUserStatus(userId);
      if (onShowToast) onShowToast(res.message, 'success');
      loadData();
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Lỗi đổi trạng thái', 'error');
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await api.updateUserRole(userId, newRole);
      if (onShowToast) onShowToast(`Đã đổi vai trò thành ${newRole}`, 'success');
      loadData();
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Lỗi đổi vai trò', 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!isDeleteConfirm) return;
    try {
      await api.deleteUser(isDeleteConfirm.id);
      if (onShowToast) onShowToast(`Đã xóa tài khoản "${isDeleteConfirm.username}"`, 'success');
      setIsDeleteConfirm(null);
      await loadData();
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Lỗi xóa tài khoản', 'error');
    }
  };

  const handleSendNotif = async (e) => {
    e.preventDefault();
    if (!notifTarget || !notifTitle || !notifMessage) return;
    try {
      await api.sendNotificationToEmployee({
        employee_id: notifTarget.employee_id,
        type: notifType,
        title: notifTitle,
        message: notifMessage
      });
      if (onShowToast) onShowToast(`Đã gửi thông báo tới ${notifTarget.employee_name || notifTarget.username}`, 'success');
      setIsSendNotifModalOpen(false);
      setNotifTarget(null); setNotifTitle(''); setNotifMessage('');
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Lỗi gửi thông báo', 'error');
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadTitle || !broadMessage) return;
    try {
      await api.broadcastNotification({
        type: broadType,
        title: broadTitle,
        message: broadMessage
      });
      if (onShowToast) onShowToast('Đã phát thông báo toàn công ty!', 'success');
      setIsBroadcastModalOpen(false);
      setBroadTitle(''); setBroadMessage('');
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Lỗi broadcast thông báo', 'error');
    }
  };

  const filteredAccounts = accounts.filter(acc => {
    const matchSearch = acc.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'all' || acc.role === roleFilter;
    return matchSearch && matchRole;
  });

  const adminCount = accounts.filter(a => a.role === 'admin').length;
  const managerCount = accounts.filter(a => a.role === 'manager').length;
  const employeeCount = accounts.filter(a => a.role === 'employee').length;
  const lockedCount = accounts.filter(a => a.status === 0).length;

  return (
    <div className="admin-reports-container" id="account-manager-view">
      {/* Header */}
      <div className="payroll-header-box">
        <div className="payroll-title-area">
          <div className="payroll-icon-wrap" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Shield size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Quản Lý Tài Khoản & Phân Quyền (RBAC)
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '3px 0 0' }}>
              Kiểm soát quyền truy cập 3 cấp độ (Admin, Trưởng phòng Manager, Nhân viên), bảo mật mật khẩu Bcrypt và khóa/mở tài khoản.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="status-badge badge-info" style={{ padding: '6px 12px' }}>
            <Shield size={13} /> {adminCount} Admin
          </span>
          <span className="status-badge" style={{ padding: '6px 12px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <Award size={13} /> {managerCount} Trưởng phòng
          </span>
          <span className="status-badge badge-success" style={{ padding: '6px 12px' }}>
            <UserCheck size={13} /> {employeeCount} Nhân viên
          </span>
          {lockedCount > 0 && (
            <span className="status-badge badge-danger" style={{ padding: '6px 12px' }}>
              <Lock size={13} /> {lockedCount} Đã khóa
            </span>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
        <div className="search-box-wrap" style={{ flex: 1, minWidth: '200px' }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="form-control"
            placeholder="Tìm theo username, tên nhân viên, mã NV..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'admin', label: '👑 Admin' },
            { id: 'manager', label: '⭐ Trưởng phòng' },
            { id: 'employee', label: '👤 Nhân viên' }
          ].map(r => (
            <button key={r.id} className={`btn btn-sm ${roleFilter === r.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setRoleFilter(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadData} title="Tải lại">
          <RefreshCw size={14} />
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setIsBroadcastModalOpen(true)}
          style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.4)' }}
        >
          <Megaphone size={14} /> <span>Broadcast</span>
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => setIsRegisterModalOpen(true)}>
          <UserPlus size={14} /> <span>Tạo Tài Khoản Mới</span>
        </button>
      </div>

      {/* Cảnh báo nhân viên chưa có tài khoản */}
      {unregisteredEmps.length > 0 && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '10px', padding: '14px 18px', marginBottom: '20px',
          display: 'flex', alignItems: 'flex-start', gap: '12px'
        }}>
          <AlertCircle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ fontSize: '0.88rem', color: '#d97706', display: 'block', marginBottom: '6px' }}>
              {unregisteredEmps.length} nhân viên chưa có tài khoản:
            </strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {unregisteredEmps.map(emp => (
                <span
                  key={emp.id}
                  style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => { setRegEmpId(emp.id); setRegUsername(emp.id.toLowerCase()); setIsRegisterModalOpen(true); }}
                  title="Bấm để tạo tài khoản cho nhân viên này"
                >
                  {emp.name} ({emp.id}) +
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Account List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px', opacity: 0.5 }} />
          <p>Đang tải dữ liệu tài khoản...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredAccounts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <Users size={40} style={{ opacity: 0.2, marginBottom: '10px' }} />
              <p>Không tìm thấy tài khoản nào phù hợp.</p>
            </div>
          ) : (
            filteredAccounts.map(acc => {
              const isLocked = acc.status === 0;

              return (
                <div key={acc.id} className="card" style={{
                  padding: '18px 20px',
                  borderLeft: `4px solid ${acc.role === 'admin' ? '#6366f1' : acc.role === 'manager' ? '#f59e0b' : '#10b981'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexWrap: 'wrap', gap: '14px',
                  opacity: isLocked ? 0.7 : 1
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '220px' }}>
                    <img
                      src={acc.role === 'admin'
                        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80'
                        : (acc.employee_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${acc.username}`)
                      }
                      alt={acc.username}
                      style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)', flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{acc.username}</strong>
                        
                        {/* Vai trò */}
                        <span style={{
                          padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700,
                          background: acc.role === 'admin' ? 'rgba(99, 102, 241, 0.12)' : acc.role === 'manager' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                          color: acc.role === 'admin' ? '#6366f1' : acc.role === 'manager' ? '#f59e0b' : '#10b981'
                        }}>
                          {acc.role === 'admin' ? '👑 Quản trị viên (Admin)' : acc.role === 'manager' ? '⭐ Trưởng phòng (Manager)' : '👤 Nhân viên (Employee)'}
                        </span>

                        {/* Trạng thái khóa / mở */}
                        <span style={{
                          padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700,
                          background: isLocked ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                          color: isLocked ? '#ef4444' : '#10b981'
                        }}>
                          {isLocked ? '🔒 Đã khóa' : '✅ Đang hoạt động'}
                        </span>
                      </div>

                      {acc.employee_name ? (
                        <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          🔗 {acc.employee_name} ({acc.employee_id}) • {acc.employee_department} • {acc.employee_position}
                        </p>
                      ) : (
                        <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Tài khoản quản trị viên tối cao</p>
                      )}
                      <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <Calendar size={11} style={{ display: 'inline', marginRight: '4px' }} />
                        Tạo lúc: {acc.created_at ? new Date(acc.created_at).toLocaleDateString('vi-VN') : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {acc.role !== 'admin' && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flexShrink: 0, alignItems: 'center' }}>
                      {/* Đổi quyền */}
                      <select
                        className="select"
                        value={acc.role}
                        onChange={(e) => handleChangeRole(acc.id, e.target.value)}
                        style={{ fontSize: '0.8rem', padding: '4px 8px', height: '32px' }}
                      >
                        <option value="employee">Quyền: Nhân viên</option>
                        <option value="manager">Quyền: Trưởng phòng</option>
                        <option value="admin">Quyền: Admin</option>
                      </select>

                      {/* Khóa / Mở khóa */}
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ color: isLocked ? '#10b981' : '#ef4444' }}
                        onClick={() => handleToggleStatus(acc.id, acc.username, acc.status)}
                        title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                      >
                        {isLocked ? <Unlock size={13} /> : <Lock size={13} />}
                        <span>{isLocked ? 'Mở khóa' : 'Khóa'}</span>
                      </button>

                      <button className="btn btn-secondary btn-sm" style={{ color: '#6366f1' }}
                        onClick={() => { setNotifTarget(acc); setNotifTitle(''); setNotifMessage(''); setIsSendNotifModalOpen(true); }}
                      >
                        <Bell size={13} /> <span>Thông báo</span>
                      </button>

                      <button className="btn btn-secondary btn-sm" style={{ color: '#f59e0b' }}
                        onClick={() => { setResetTarget(acc); setResetPassword('123456'); setIsResetModalOpen(true); }}
                      >
                        <KeyRound size={13} /> <span>Reset MK</span>
                      </button>

                      <button className="btn btn-secondary btn-sm" style={{ color: '#ef4444' }}
                        onClick={() => setIsDeleteConfirm(acc)}
                      >
                        <Trash2 size={13} /> <span>Xóa</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL: ĐĂNG KÝ TÀI KHOẢN */}
      {isRegisterModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsRegisterModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={20} color="var(--primary)" />
                <h2 className="modal-title">Tạo Tài Khoản & Phân Quyền</h2>
              </div>
              <button className="btn-close" onClick={() => setIsRegisterModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleRegister} className="modal-body">
              <div className="form-group">
                <label className="form-label">Chọn Vai Trò (Role) *</label>
                <select className="form-control" value={regRole} onChange={(e) => setRegRole(e.target.value)}>
                  <option value="employee">👤 Nhân viên (Employee - Self-Service)</option>
                  <option value="manager">⭐ Cấp quản lý / Trưởng phòng (Department Manager)</option>
                  <option value="admin">👑 HR Admin (Toàn quyền hệ thống)</option>
                </select>
              </div>

              {regRole !== 'admin' && (
                <div className="form-group">
                  <label className="form-label">Chọn Nhân Viên Liên Kết <span className="text-danger">*</span></label>
                  {unregisteredEmps.length === 0 ? (
                    <select className="form-control" value={regEmpId} onChange={(e) => handleRegEmpChange(e.target.value)} required>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.id}) — {emp.department}</option>
                      ))}
                    </select>
                  ) : (
                    <select className="form-control" value={regEmpId} onChange={(e) => handleRegEmpChange(e.target.value)} required>
                      {unregisteredEmps.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.id}) — {emp.department}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Tên đăng nhập (Username) <span className="text-danger">*</span></label>
                <input type="text" className="form-control" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} placeholder="VD: nv.an, manager_it..." required />
              </div>

              <div className="form-group">
                <label className="form-label">Mật khẩu ban đầu <span className="text-danger">*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showRegPwd ? 'text' : 'password'}
                    className="form-control"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mật khẩu sẽ được mã hóa an toàn bằng Bcrypt..."
                    required
                    style={{ paddingRight: '40px' }}
                  />
                  <button type="button" onClick={() => setShowRegPwd(p => !p)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {showRegPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: '8px', padding: '12px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <Info size={14} style={{ display: 'inline', marginRight: '6px', color: 'var(--primary)' }} />
                Mật khẩu người dùng được mã hóa một chiều chuẩn Bcrypt trước khi lưu trữ vào MySQL theo yêu cầu an toàn thông tin.
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsRegisterModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">
                  <UserPlus size={15} /> <span>Tạo Tài Khoản</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET MẬT KHẨU */}
      {isResetModalOpen && resetTarget && (
        <div className="modal-backdrop" onClick={() => setIsResetModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={20} color="#f59e0b" />
                <h2 className="modal-title">Reset Mật Khẩu Tài Khoản</h2>
              </div>
              <button className="btn-close" onClick={() => setIsResetModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleResetPassword} className="modal-body">
              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{resetTarget.employee_name || resetTarget.username}</strong>
                <p style={{ margin: '2px 0 0', color: 'var(--text-muted)' }}>Username: {resetTarget.username}</p>
              </div>
              <div className="form-group">
                <label className="form-label">Mật khẩu mới <span className="text-danger">*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showResetPwd ? 'text' : 'password'}
                    className="form-control"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    required
                    style={{ paddingRight: '40px' }}
                  />
                  <button type="button" onClick={() => setShowResetPwd(p => !p)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {showResetPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsResetModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                  <KeyRound size={15} /> <span>Xác Nhận Reset</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: XÓA TÀI KHOẢN */}
      {isDeleteConfirm && (
        <div className="modal-backdrop" onClick={() => setIsDeleteConfirm(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={20} color="#ef4444" />
                <h2 className="modal-title">Xác Nhận Xóa Tài Khoản</h2>
              </div>
              <button className="btn-close" onClick={() => setIsDeleteConfirm(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Bạn có chắc muốn xóa tài khoản <strong>"{isDeleteConfirm.username}"</strong>?
                {isDeleteConfirm.employee_name && <> Nhân viên <strong>{isDeleteConfirm.employee_name}</strong> sẽ không thể đăng nhập nữa.</>}
              </p>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsDeleteConfirm(null)}>Hủy</button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteUser}>
                  <Trash2 size={15} /> <span>Xóa Vĩnh Viễn</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GỬI THÔNG BÁO CÁ NHÂN */}
      {isSendNotifModalOpen && notifTarget && (
        <div className="modal-backdrop" onClick={() => setIsSendNotifModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={20} color="var(--primary)" />
                <h2 className="modal-title">Gửi Thông Báo Tới Nhân Viên</h2>
              </div>
              <button className="btn-close" onClick={() => setIsSendNotifModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSendNotif} className="modal-body">
              <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.85rem' }}>
                Người nhận: <strong>{notifTarget.employee_name || notifTarget.username}</strong> ({notifTarget.employee_id || 'Tài khoản'})
              </div>
              <div className="form-group">
                <label className="form-label">Loại thông báo</label>
                <select className="form-control" value={notifType} onChange={e => setNotifType(e.target.value)}>
                  <option value="general">📢 Thông báo chung</option>
                  <option value="leave_request">📋 Nghỉ phép</option>
                  <option value="payroll_notice">💰 Tiền lương</option>
                  <option value="reward_notice">🏆 Khen thưởng</option>
                  <option value="attendance_appeal">⏰ Điểm danh</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tiêu đề <span className="text-danger">*</span></label>
                <input type="text" className="form-control" value={notifTitle} onChange={e => setNotifTitle(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Nội dung <span className="text-danger">*</span></label>
                <textarea className="form-control" rows={3} value={notifMessage} onChange={e => setNotifMessage(e.target.value)} required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsSendNotifModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary"><Send size={15} /> <span>Gửi Thông Báo</span></button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BROADCAST */}
      {isBroadcastModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsBroadcastModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Megaphone size={20} color="#f59e0b" />
                <h2 className="modal-title">Phát Thông Báo Toàn Công Ty</h2>
              </div>
              <button className="btn-close" onClick={() => setIsBroadcastModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleBroadcast} className="modal-body">
              <div className="form-group">
                <label className="form-label">Tiêu đề thông báo *</label>
                <input type="text" className="form-control" value={broadTitle} onChange={e => setBroadTitle(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Nội dung thông báo *</label>
                <textarea className="form-control" rows={4} value={broadMessage} onChange={e => setBroadMessage(e.target.value)} required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsBroadcastModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                  <Megaphone size={15} /> <span>Phát Thông Báo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
