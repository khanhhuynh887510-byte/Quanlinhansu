import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, Lock, LogIn, UserPlus, Shield, CheckCircle2, 
  Sparkles, X, Users, Search, AlertCircle, Trash2, 
  RotateCcw, UserCheck, Bell, Crown, Eye, EyeOff
} from 'lucide-react';
import { api } from '../../services/api';

export const LoginModal = ({ isOpen, onClose, onLoginSuccess, employees = [] }) => {
  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'accounts'
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [unregisteredEmps, setUnregisteredEmps] = useState([]);
  const [accountSearch, setAccountSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Trạng thái cho Tự Đăng Ký Mới (Self-Registration)
  const [regMode, setRegMode] = useState('new'); // 'new' (Tự tạo hồ sơ & tài khoản) | 'link' (Liên kết nhân sự có sẵn)
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDepartment, setRegDepartment] = useState('Kỹ thuật & Công nghệ');
  const [regPosition, setRegPosition] = useState('Nhân viên');
  const [regGender, setRegGender] = useState('Nam');
  const [regAvatar, setRegAvatar] = useState('');

  const loadAccountsAndUnregistered = useCallback(async () => {
    try {
      const [users, unreg] = await Promise.all([
        api.getUsers(),
        api.getUnregisteredEmployees()
      ]);
      setAvailableUsers(users || []);
      setUnregisteredEmps(unreg || []);
      if (unreg && unreg.length > 0) {
        setSelectedEmpId(unreg[0].id);
        setUsername(unreg[0].id.toLowerCase());
      } else if (employees.length > 0) {
        setSelectedEmpId(employees[0].id);
        setUsername(employees[0].id.toLowerCase());
      }
    } catch {
      // Fallback
    }
  }, [employees]);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      loadAccountsAndUnregistered();
    }
  }, [isOpen, loadAccountsAndUnregistered]);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      const user = await api.login(username, password);
      if (user) {
        onLoginSuccess(user);
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Tên đăng nhập hoặc mật khẩu không đúng');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      let registeredUser = null;
      let finalLoginUser = '';
      let finalLoginPass = '';

      if (regMode === 'new') {
        // Tự đăng ký nhân viên mới hoàn toàn
        if (!regName.trim()) {
          throw new Error('Vui lòng nhập họ và tên');
        }
        if (!regUsername.trim()) {
          throw new Error('Vui lòng nhập tên đăng nhập');
        }
        if (!regPassword || regPassword.length < 3) {
          throw new Error('Mật khẩu tối thiểu 3 ký tự');
        }

        const avatarFinal = regAvatar.trim() || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(regUsername.trim())}`;

        registeredUser = await api.register({
          self_register: true,
          name: regName.trim(),
          username: regUsername.trim(),
          password: regPassword,
          email: regEmail.trim() || `${regUsername.trim().toLowerCase()}@company.vn`,
          phone: regPhone.trim(),
          department: regDepartment,
          position: regPosition,
          gender: regGender,
          avatar: avatarFinal,
          role: 'employee'
        });
        finalLoginUser = regUsername.trim();
        finalLoginPass = regPassword;
      } else {
        // Liên kết nhân viên có sẵn trong hệ thống
        if (!selectedEmpId) {
          throw new Error('Vui lòng chọn nhân viên để liên kết');
        }
        registeredUser = await api.register({
          username: username.trim(),
          password,
          role: 'employee',
          employee_id: selectedEmpId
        });
        finalLoginUser = username.trim();
        finalLoginPass = password;
      }

      if (registeredUser) {
        setSuccessMsg('Đăng ký thành công! Đang tự động đăng nhập...');
        // Tự động login với tài khoản vừa tạo
        setTimeout(async () => {
          try {
            const loggedInUser = await api.login(finalLoginUser, finalLoginPass);
            if (loggedInUser) {
              onLoginSuccess(loggedInUser);
              onClose();
            }
          } catch {
            onLoginSuccess(registeredUser);
            onClose();
          }
        }, 600);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi đăng ký tài khoản');
    } finally {
      setIsLoading(false);
    }
  };

  // Đăng nhập nhanh 1-Click
  const handleQuickLogin = async (targetUsername, targetPassword = '123') => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const user = await api.login(targetUsername, targetPassword);
      if (user) {
        onLoginSuccess(user);
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Không thể đăng nhập tài khoản này');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset mật khẩu về 123
  const handleResetPassword = async (userId, username) => {
    setIsLoading(true);
    try {
      await api.resetUserPassword(userId, '123');
      setSuccessMsg(`Đã reset mật khẩu tài khoản "${username}" về: 123`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi reset mật khẩu');
    } finally {
      setIsLoading(false);
    }
  };

  // Xóa tài khoản nhân viên
  const handleDeleteUser = async (userId) => {
    setIsLoading(true);
    try {
      await api.deleteUser(userId);
      setConfirmDeleteId(null);
      await loadAccountsAndUnregistered();
      setSuccessMsg('Đã xóa tài khoản thành công');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi xóa tài khoản');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = availableUsers.filter(u => {
    const q = accountSearch.toLowerCase();
    return u.username?.toLowerCase().includes(q) ||
           u.employee_name?.toLowerCase().includes(q) ||
           u.employee_id?.toLowerCase().includes(q) ||
           u.employee_department?.toLowerCase().includes(q);
  });

  // Quick login users (dynamic từ DB - lấy 3 employee đầu tiên)
  const quickLoginEmployees = availableUsers
    .filter(u => u.role === 'employee')
    .slice(0, 3);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-card login-modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '560px', width: '95%' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="login-logo-circle">
              <Shield size={22} />
            </div>
            <div>
              <h2 className="modal-title">Đăng Nhập & Quản Lý Tài Khoản</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Hỗ trợ đa tài khoản: Quản trị viên và nhân viên liên kết nhân sự
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        {/* Quick Switcher Banner (Dynamic từ DB) */}
        <div className="quick-switch-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Sparkles size={15} color="var(--primary)" />
            <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
              Đăng nhập nhanh 1-Click:
            </strong>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {/* Admin button - luôn hiện */}
            <button
              type="button"
              className="btn-quick-tag admin-tag"
              onClick={() => handleQuickLogin('admin', '123')}
              title="Đăng nhập với vai trò Quản trị viên"
              disabled={isLoading}
            >
              <Crown size={12} />
              <span>Admin (Quản lý)</span>
            </button>

            {/* Dynamic employee buttons từ DB */}
            {quickLoginEmployees.map(u => (
              <button
                key={u.id}
                type="button"
                className="btn-quick-tag emp-tag"
                onClick={() => handleQuickLogin(u.username, '123')}
                title={`Đăng nhập: ${u.employee_name} (${u.employee_id}) - ${u.employee_department}`}
                disabled={isLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                {u.employee_avatar ? (
                  <img 
                    src={u.employee_avatar} 
                    alt="" 
                    style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'cover' }} 
                  />
                ) : (
                  <UserCheck size={12} />
                )}
                <span>{u.employee_name?.split(' ').pop() || u.username}</span>
              </button>
            ))}

            {availableUsers.filter(u => u.role === 'employee').length === 0 && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Chưa có tài khoản nhân viên. Hãy đăng ký tài khoản mới!
              </span>
            )}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="login-tab-switcher">
          <button 
            type="button"
            className={`login-tab-btn ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setErrorMsg(''); }}
          >
            <LogIn size={15} />
            <span>Đăng Nhập</span>
          </button>
          <button 
            type="button"
            className={`login-tab-btn ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setErrorMsg(''); }}
          >
            <UserPlus size={15} />
            <span>
              Đăng Ký Mới
              {unregisteredEmps.length > 0 && (
                <span style={{ 
                  marginLeft: '4px', 
                  background: '#ef4444', 
                  color: 'white', 
                  borderRadius: '10px', 
                  padding: '1px 5px', 
                  fontSize: '0.65rem',
                  fontWeight: 700
                }}>
                  {unregisteredEmps.length}
                </span>
              )}
            </span>
          </button>
          <button 
            type="button"
            className={`login-tab-btn ${tab === 'accounts' ? 'active' : ''}`}
            onClick={() => { setTab('accounts'); setErrorMsg(''); loadAccountsAndUnregistered(); }}
          >
            <Users size={15} />
            <span>Tài Khoản ({availableUsers.length})</span>
          </button>
        </div>

        {/* Error / Success Messages */}
        {errorMsg && (
          <div className="alert-error-box" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#059669', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: FORM ĐĂNG NHẬP */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="modal-body">
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={15} />
                <span>Tên đăng nhập</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="VD: admin hoặc nv001, nv002..."
                required
                autoFocus
                autoComplete="username"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Dùng <code>admin</code> cho Quản lý, hoặc username nhân viên đã đăng ký
              </span>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={15} />
                <span>Mật khẩu</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  style={{ 
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Mật khẩu mặc định toàn hệ thống: <code>123</code>
              </span>
            </div>

            <div className="modal-footer" style={{ padding: '16px 0 0 0', marginTop: '16px' }}>
              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                disabled={isLoading}
              >
                <LogIn size={16} />
                <span>{isLoading ? 'Đang xác thực...' : 'Đăng Nhập Vào Hệ Thống'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: FORM ĐĂNG KÝ TÀI KHOẢN MỚI */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="modal-body">
            {/* Lựa chọn phương thức đăng ký */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              background: 'var(--bg-secondary)',
              padding: '4px',
              borderRadius: '10px',
              marginBottom: '16px'
            }}>
              <button
                type="button"
                className={`btn ${regMode === 'new' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.82rem', padding: '8px 10px', borderRadius: '8px', justifyContent: 'center' }}
                onClick={() => { setRegMode('new'); setErrorMsg(''); }}
              >
                <Sparkles size={14} />
                <span>Tự đăng ký mới</span>
              </button>
              <button
                type="button"
                className={`btn ${regMode === 'link' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.82rem', padding: '8px 10px', borderRadius: '8px', justifyContent: 'center' }}
                onClick={() => { setRegMode('link'); setErrorMsg(''); }}
              >
                <Users size={14} />
                <span>Liên kết nhân sự có sẵn</span>
              </button>
            </div>

            {regMode === 'new' ? (
              <>
                <div style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  marginBottom: '14px',
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <UserPlus size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Tự đăng ký trực tiếp:</strong> Bạn không cần nhờ quản lý thêm trước. Hệ thống sẽ tự tạo mã nhân viên và cấp quyền truy cập ngay!
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Họ và tên nhân viên <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: Nguyễn Văn Hoàng"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">
                      Tên đăng nhập <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="VD: hoangnv"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      required
                      autoComplete="username"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Mật khẩu <span className="text-danger">*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-control"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Tối thiểu 3 ký tự..."
                        required
                        autoComplete="new-password"
                        style={{ paddingRight: '36px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        style={{ 
                          position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px'
                        }}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Phòng ban</label>
                    <select
                      className="form-control"
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                    >
                      <option value="Kỹ thuật & Công nghệ">Kỹ thuật & Công nghệ</option>
                      <option value="Kinh doanh & Marketing">Kinh doanh & Marketing</option>
                      <option value="Nhân sự & Hành chính">Nhân sự & Hành chính</option>
                      <option value="Kế toán & Tài chính">Kế toán & Tài chính</option>
                      <option value="Chăm sóc khách hàng">Chăm sóc khách hàng</option>
                      <option value="Ban Giám đốc">Ban Giám đốc</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Vị trí / Chức vụ</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="VD: Lập trình viên, Chuyên viên..."
                      value={regPosition}
                      onChange={(e) => setRegPosition(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Số điện thoại</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="VD: 0987654321"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Giới tính</label>
                    <select
                      className="form-control"
                      value={regGender}
                      onChange={(e) => setRegGender(e.target.value)}
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer" style={{ padding: '16px 0 0 0', marginTop: '16px' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', padding: '11px', fontWeight: 700 }}
                    disabled={isLoading}
                  >
                    <UserPlus size={16} />
                    <span>{isLoading ? 'Đang tạo hồ sơ & tài khoản...' : '✨ Hoàn Tất Đăng Ký & Đăng Nhập'}</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                {unregisteredEmps.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', padding: '24px', background: 'var(--bg-secondary)', 
                    borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' 
                  }}>
                    <Users size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>
                      Hiện tại mọi nhân viên có sẵn đều đã có tài khoản
                    </p>
                    <p style={{ margin: '6px 0 12px', fontSize: '0.8rem' }}>
                      Bạn là nhân sự mới gia nhập công ty? Hãy chọn chế độ <strong>Tự đăng ký mới</strong> để tạo hồ sơ ngay lập tức.
                    </p>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setRegMode('new')}
                      style={{ fontSize: '0.82rem', margin: '0 auto' }}
                    >
                      <Sparkles size={14} /> Chuyển sang Tự Đăng Ký Mới
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label">
                        Chọn nhân sự để liên kết tài khoản <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-control"
                        value={selectedEmpId}
                        onChange={(e) => {
                          const emp = unregisteredEmps.find(em => em.id === e.target.value);
                          setSelectedEmpId(e.target.value);
                          if (emp) setUsername(e.target.value.toLowerCase());
                        }}
                        required
                      >
                        <option value="">-- Chọn nhân viên --</option>
                        {unregisteredEmps.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.id}) | {emp.department} - {emp.position}
                          </option>
                        ))}
                      </select>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Tài khoản được liên kết với hồ sơ nhân sự đã nhập từ trước
                      </span>
                    </div>

                    {selectedEmpId && (
                      <div style={{ 
                        background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', 
                        borderRadius: '8px', padding: '10px 14px', marginBottom: '12px',
                        display: 'flex', alignItems: 'center', gap: '10px'
                      }}>
                        {(() => {
                          const emp = unregisteredEmps.find(em => em.id === selectedEmpId);
                          return emp ? (
                            <>
                              <img 
                                src={emp.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.id}`}
                                alt={emp.name}
                                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                              <div>
                                <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{emp.name}</strong>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  {emp.id} • {emp.department} • {emp.position}
                                </p>
                              </div>
                            </>
                          ) : null;
                        })()}
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">
                        Tên đăng nhập <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="VD: nv005, nguyen.van.a..."
                        required
                        autoComplete="username"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Mật khẩu đăng nhập <span className="text-danger">*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="form-control"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Tối thiểu 3 ký tự..."
                          required
                          autoComplete="new-password"
                          style={{ paddingRight: '40px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(p => !p)}
                          style={{ 
                            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px'
                          }}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="modal-footer" style={{ padding: '16px 0 0 0', marginTop: '16px' }}>
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                        disabled={isLoading || !selectedEmpId}
                      >
                        <UserPlus size={16} />
                        <span>{isLoading ? 'Đang tạo tài khoản...' : 'Liên Kết & Đăng Nhập'}</span>
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </form>
        )}

        {/* TAB 3: DANH SÁCH TÀI KHOẢN HỆ THỐNG */}
        {tab === 'accounts' && (
          <div className="modal-body" style={{ padding: '12px 20px' }}>
            <div className="search-box-wrap" style={{ marginBottom: '12px' }}>
              <Search size={15} className="search-icon" />
              <input
                type="text"
                className="form-control"
                placeholder="Tìm tài khoản theo tên, mã NV, phòng ban..."
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Không tìm thấy tài khoản nào phù hợp
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isAdmin = u.role === 'admin';
                  const isConfirmingDelete = confirmDeleteId === u.id;
                  return (
                    <div 
                      key={u.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '10px',
                        border: `1px solid ${isAdmin ? 'rgba(99, 102, 241, 0.2)' : 'var(--border-color)'}`,
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <img
                            src={
                              isAdmin
                                ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'
                                : (u.employee_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`)
                            }
                            alt={u.username}
                            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <span style={{
                            position: 'absolute', bottom: '-2px', right: '-2px',
                            width: '14px', height: '14px', borderRadius: '50%',
                            background: isAdmin ? 'var(--primary)' : '#10b981',
                            border: '2px solid var(--bg-surface)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {isAdmin ? <Crown size={7} color="white" /> : <User size={7} color="white" />}
                          </span>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                              {isAdmin ? 'Admin Quản Trị' : u.employee_name}
                            </strong>
                            <span style={{ 
                              fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px',
                              background: isAdmin ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                              color: isAdmin ? 'var(--primary)' : '#10b981', fontWeight: 700
                            }}>
                              {isAdmin ? 'Admin' : u.employee_id}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                            <code style={{ background: 'var(--bg-tertiary)', padding: '1px 4px', borderRadius: '3px' }}>
                              {u.username}
                            </code>
                            {u.employee_department && ` • ${u.employee_department}`}
                            {u.employee_position && ` • ${u.employee_position}`}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'center' }}>
                        {/* Xác nhận xóa */}
                        {isConfirmingDelete ? (
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600 }}>Xóa?</span>
                            <button
                              type="button"
                              className="btn btn-sm"
                              style={{ padding: '3px 7px', fontSize: '0.72rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                              onClick={() => handleDeleteUser(u.id)}
                              disabled={isLoading}
                            >
                              Có
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 7px', fontSize: '0.72rem' }}
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Không
                            </button>
                          </div>
                        ) : (
                          <>
                            {!isAdmin && (
                              <>
                                {/* Reset mật khẩu */}
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleResetPassword(u.id, u.username)}
                                  style={{ fontSize: '0.72rem', padding: '4px 7px', display: 'flex', alignItems: 'center', gap: '3px' }}
                                  disabled={isLoading}
                                  title="Reset mật khẩu về 123"
                                >
                                  <RotateCcw size={11} />
                                </button>
                                {/* Xóa tài khoản */}
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  style={{ padding: '4px 7px', fontSize: '0.72rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', cursor: 'pointer' }}
                                  onClick={() => setConfirmDeleteId(u.id)}
                                  disabled={isLoading}
                                  title="Xóa tài khoản"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </>
                            )}
                            {/* Đăng nhập nhanh */}
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleQuickLogin(u.username, '123')}
                              style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              disabled={isLoading}
                            >
                              <LogIn size={12} />
                              <span>Vào</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {unregisteredEmps.length > 0 && (
              <div style={{ 
                marginTop: '12px', padding: '10px 12px', 
                background: 'rgba(245, 158, 11, 0.08)', 
                border: '1px solid rgba(245, 158, 11, 0.2)', 
                borderRadius: '8px',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <Bell size={14} color="#f59e0b" />
                <span style={{ fontSize: '0.78rem', color: '#b45309' }}>
                  Còn <strong>{unregisteredEmps.length}</strong> nhân viên chưa có tài khoản. 
                  <button 
                    type="button" 
                    onClick={() => setTab('register')}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', padding: '0 2px' }}
                  >
                    Tạo ngay →
                  </button>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
