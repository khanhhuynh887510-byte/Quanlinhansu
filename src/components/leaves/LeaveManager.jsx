import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, CheckCircle2, XCircle, Clock, Plus, 
  AlertTriangle, Trash2, X, Filter, User, Search,
  ChevronLeft, ChevronRight, RotateCcw, Clock3
} from 'lucide-react';
import { api } from '../../services/api';
import { 
  getPresetDateRange, 
  isDateOverlap, 
  getTodayStr, 
  getCurrentMonthStr,
  formatLocalDate
} from '../../utils/dateFilter';

export const LeaveManager = ({ employees = [], onShowToast }) => {
  const [leaves, setLeaves] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters State
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [periodPreset, setPeriodPreset] = useState('all'); // 'all' | 'today' | 'week' | 'month' | 'year' | 'custom'
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || '');
  const [leaveType, setLeaveType] = useState('annual');
  const [timeShift, setTimeShift] = useState('all_day'); // 'all_day' | 'morning' | 'afternoon' | 'custom_hours'
  const [fromDate, setFromDate] = useState(getTodayStr());
  const [toDate, setToDate] = useState(getTodayStr());
  const [fromTime, setFromTime] = useState('08:00');
  const [toTime, setToTime] = useState('17:30');
  const [daysCount, setDaysCount] = useState(1.0);
  const [reason, setReason] = useState('');

  const loadLeaves = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getLeaves();
      setLeaves(data || []);
    } catch (error) {
      console.error('Lỗi khi tải đơn nghỉ phép:', error);
      if (onShowToast) onShowToast('Không thể tải danh sách đơn nghỉ phép', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  // Tự động tính số ngày nghỉ khi đổi loại ca / ngày
  useEffect(() => {
    if (timeShift === 'morning' || timeShift === 'afternoon') {
      setDaysCount(0.5);
      setToDate(fromDate);
    } else if (timeShift === 'all_day') {
      if (fromDate && toDate) {
        const d1 = new Date(fromDate);
        const d2 = new Date(toDate);
        if (d2 >= d1) {
          const diffTime = Math.abs(d2 - d1);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          setDaysCount(diffDays);
        } else {
          setDaysCount(1.0);
        }
      }
    }
  }, [timeShift, fromDate, toDate]);

  const handleCreateLeave = async (e) => {
    e.preventDefault();
    if (!employeeId || !reason) return;

    let fullReason = reason;
    if (timeShift === 'morning') fullReason = `[Nghỉ buổi Sáng 08:00-12:00] ${reason}`;
    else if (timeShift === 'afternoon') fullReason = `[Nghỉ buổi Chiều 13:30-17:30] ${reason}`;
    else if (timeShift === 'custom_hours') fullReason = `[Nghỉ từ ${fromTime} đến ${toTime}] ${reason}`;

    try {
      await api.createLeave({
        employee_id: employeeId,
        leave_type: leaveType,
        from_date: fromDate,
        to_date: toDate,
        days_count: Number(daysCount),
        reason: fullReason
      });
      setIsModalOpen(false);
      setReason('');
      await loadLeaves();
      if (onShowToast) onShowToast('Gửi đơn xin nghỉ phép thành công!', 'success');
    } catch (error) {
      if (onShowToast) onShowToast(error.message || 'Lỗi khi gửi đơn', 'error');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.updateLeaveStatus(id, status);
      await loadLeaves();
      if (onShowToast) {
        onShowToast(`Đã ${status === 'approved' ? 'phê duyệt' : 'từ chối'} đơn nghỉ phép`, 'success');
      }
    } catch (error) {
      if (onShowToast) onShowToast(error.message || 'Lỗi cập nhật trạng thái', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đơn nghỉ phép này?')) return;
    try {
      await api.deleteLeave(id);
      await loadLeaves();
      if (onShowToast) onShowToast('Đã xóa đơn nghỉ phép', 'info');
    } catch (error) {
      if (onShowToast) onShowToast(error.message || 'Lỗi khi xóa đơn', 'error');
    }
  };

  const resetFilters = () => {
    setEmployeeFilter('all');
    setPeriodPreset('all');
    setSelectedMonth(getCurrentMonthStr());
    setCustomFrom('');
    setCustomTo('');
    setStatusFilter('all');
    setTypeFilter('all');
    setSearchTerm('');
  };

  // Tính toán khoảng thời gian hiện tại được chọn
  const activeDateRange = useMemo(() => {
    return getPresetDateRange(periodPreset, customFrom, customTo, selectedMonth);
  }, [periodPreset, customFrom, customTo, selectedMonth]);

  // Bộ lọc danh sách đơn nghỉ phép theo Nhân viên & Ngày giờ tháng năm
  const filteredLeaves = useMemo(() => {
    const searchLower = (searchTerm || '').trim().toLowerCase();

    return leaves.filter((l) => {
      // 1. Lọc theo nhân viên cụ thể
      if (employeeFilter !== 'all' && l.employee_id !== employeeFilter) {
        return false;
      }

      // 2. Lọc theo trạng thái
      if (statusFilter !== 'all' && l.status !== statusFilter) {
        return false;
      }

      // 3. Lọc theo loại nghỉ
      if (typeFilter !== 'all' && l.leave_type !== typeFilter) {
        return false;
      }

      // 4. Lọc theo khoảng thời gian (ngày bắt đầu - ngày kết thúc)
      if (activeDateRange.start || activeDateRange.end) {
        if (!isDateOverlap(l.from_date, l.to_date, activeDateRange.start, activeDateRange.end)) {
          return false;
        }
      }

      // 5. Tìm kiếm theo từ khóa
      if (searchLower) {
        const nameMatch = (l.employee_name || '').toLowerCase().includes(searchLower);
        const idMatch = (l.employee_id || '').toLowerCase().includes(searchLower);
        const reasonMatch = (l.reason || '').toLowerCase().includes(searchLower);
        const deptMatch = (l.employee_department || '').toLowerCase().includes(searchLower);
        if (!nameMatch && !idMatch && !reasonMatch && !deptMatch) return false;
      }

      return true;
    });
  }, [leaves, employeeFilter, statusFilter, typeFilter, activeDateRange, searchTerm]);

  // Thống kê dựa trên danh sách đã lọc
  const selectedEmpObj = employees.find(e => e.id === employeeFilter);
  const totalDays = filteredLeaves.reduce((sum, item) => sum + Number(item.days_count || 0), 0);
  const pendingCount = filteredLeaves.filter(l => l.status === 'pending').length;
  const approvedCount = filteredLeaves.filter(l => l.status === 'approved').length;
  const unexcusedCount = filteredLeaves.filter(l => l.leave_type === 'unexcused').length;

  const leaveTypeLabels = {
    annual: { label: 'Phép năm (Có lương)', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
    sick: { label: 'Nghỉ ốm (BHXH chi trả)', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
    unpaid: { label: 'Nghỉ không lương (Có phép)', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
    unexcused: { label: 'Nghỉ không phép (Kỷ luật)', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
    maternity: { label: 'Thai sản', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' }
  };

  return (
    <div className="leave-manager-container">
      {/* Header */}
      <div className="leave-header-box">
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            Quản Lý Nghỉ Phép & Đơn Từ (Leave Management)
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '3px 0 0' }}>
            Kiểm soát ngày, giờ, ca làm việc, tuần, tháng, năm cho từng nhân viên hoặc toàn bộ nhân sự
          </p>
        </div>

        <button 
          className="btn btn-primary btn-sm"
          onClick={() => {
            if (employeeFilter !== 'all') setEmployeeId(employeeFilter);
            else if (employees.length > 0) setEmployeeId(employees[0].id);
            setIsModalOpen(true);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} />
          <span>+ Tạo Đơn Xin Nghỉ Phép</span>
        </button>
      </div>

      {/* BỘ ĐIỀU KHIỂN THỜI GIAN & NHÂN VIÊN (DATE & EMPLOYEE CONTROLLER) */}
      <div className="filter-card-container" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: '14px' }}>
          
          {/* 1. Chọn Nhân Viên Cụ Thể */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '260px', flex: '1 1 auto' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
              <User size={15} color="var(--primary)" />
              Nhân viên:
            </span>
            <select
              className="form-control"
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              style={{ fontSize: '0.85rem', fontWeight: 600, padding: '7px 10px' }}
            >
              <option value="all">👥 Tất cả nhân sự ({employees.length} người)</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.id}) - {emp.department}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Bộ Chọn Khoảng Thời Gian (Presets) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={15} color="var(--primary)" />
              Thời gian:
            </span>
            <div className="avatar-tabs" style={{ padding: '3px', margin: 0 }}>
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'today', label: 'Hôm nay' },
                { id: 'week', label: 'Tuần này' },
                { id: 'month', label: 'Tháng' },
                { id: 'year', label: 'Năm' },
                { id: 'custom', label: 'Tùy chỉnh...' }
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  className={`avatar-tab-btn ${periodPreset === p.id ? 'active' : ''}`}
                  onClick={() => setPeriodPreset(p.id)}
                  style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Khu vực chi tiết thời gian khi chọn Tháng hoặc Tùy chỉnh ngày */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px dashed var(--border-color)' }}>
          {periodPreset === 'month' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Chọn kỳ tháng:</span>
              <input
                type="month"
                className="form-control"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ width: 'auto', padding: '5px 10px', fontSize: '0.85rem' }}
              />
            </div>
          )}

          {periodPreset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Từ ngày:</span>
              <input
                type="date"
                className="form-control"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{ width: 'auto', padding: '5px 8px', fontSize: '0.85rem' }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Đến ngày:</span>
              <input
                type="date"
                className="form-control"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{ width: 'auto', padding: '5px 8px', fontSize: '0.85rem' }}
              />
            </div>
          )}

          {/* Ô tìm kiếm từ khóa */}
          <div className="search-box-wrap" style={{ flex: '1 1 200px' }}>
            <Search size={14} className="search-icon" />
            <input
              type="text"
              className="form-control"
              placeholder="Tìm theo lý do, phòng ban..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ fontSize: '0.82rem', padding: '6px 10px 6px 30px' }}
            />
          </div>

          {/* Lọc loại nghỉ */}
          <select
            className="form-control"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '150px', fontSize: '0.82rem', padding: '6px 10px' }}
          >
            <option value="all">Tất cả loại nghỉ</option>
            <option value="annual">Phép năm (Có lương)</option>
            <option value="sick">Nghỉ ốm (BHXH)</option>
            <option value="unpaid">Nghỉ không lương</option>
            <option value="unexcused">Nghỉ tự ý không phép</option>
            <option value="maternity">Nghỉ thai sản</option>
          </select>

          {/* Nút đặt lại bộ lọc */}
          {(employeeFilter !== 'all' || periodPreset !== 'all' || statusFilter !== 'all' || typeFilter !== 'all' || searchTerm) && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={resetFilters}
              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Đặt lại toàn bộ bộ lọc"
            >
              <RotateCcw size={13} />
              <span>Đặt lại</span>
            </button>
          )}
        </div>

        {/* Thanh trạng thái bộ lọc đang áp dụng */}
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', padding: '6px 12px', borderRadius: '8px' }}>
          <Filter size={13} color="var(--primary)" />
          <span>
            Đang lọc: <strong>{selectedEmpObj ? `${selectedEmpObj.name} (${selectedEmpObj.id})` : 'Tất cả nhân sự'}</strong> 
            {' • '}Thời gian: <strong>{activeDateRange.label}</strong>
            {activeDateRange.start && ` (${activeDateRange.start} → ${activeDateRange.end})`}
            {' • '}Kết quả: <strong>{filteredLeaves.length}</strong> đơn (Tổng <strong>{totalDays}</strong> ngày nghỉ)
          </span>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="payroll-metrics-grid" style={{ marginBottom: '20px' }}>
        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
            <Calendar size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Tổng Đơn / Số Ngày</span>
            <h3 className="metric-value">{filteredLeaves.length} đơn <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>({totalDays} ngày)</span></h3>
            <span className="metric-sub">{activeDateRange.label}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <Clock size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Đang Chờ Phê Duyệt</span>
            <h3 className="metric-value" style={{ color: '#f59e0b' }}>{pendingCount}</h3>
            <span className="metric-sub">Cần quản lý xử lý</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Đã Được Phê Duyệt</span>
            <h3 className="metric-value" style={{ color: '#10b981' }}>{approvedCount}</h3>
            <span className="metric-sub">Hợp lệ và hưởng chế độ</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
            <AlertTriangle size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Nghỉ Tự Ý Không Phép</span>
            <h3 className="metric-value" style={{ color: '#ef4444' }}>{unexcusedCount}</h3>
            <span className="metric-sub">Tự động trừ lương & kỷ luật</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs by Status */}
      <div className="payroll-filter-bar">
        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'pending', 'approved', 'rejected'].map(st => (
            <button
              key={st}
              className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(st)}
              style={{ textTransform: 'capitalize' }}
            >
              {st === 'all' && `Tất cả đơn (${filteredLeaves.length})`}
              {st === 'pending' && `Chờ duyệt (${pendingCount})`}
              {st === 'approved' && `Đã duyệt (${approvedCount})`}
              {st === 'rejected' && 'Từ chối'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="payroll-table-wrapper">
        <table className="payroll-table">
          <thead>
            <tr>
              <th>Nhân Viên</th>
              <th>Loại Nghỉ</th>
              <th>Thời Gian & Ca/Giờ</th>
              <th>Số Ngày Nghỉ</th>
              <th>Trạng Thái</th>
              <th style={{ textAlign: 'right' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  Đang tải danh sách đơn nghỉ phép...
                </td>
              </tr>
            ) : filteredLeaves.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  Không tìm thấy đơn nghỉ phép nào phù hợp với điều kiện lọc (Nhân viên / Thời gian).
                </td>
              </tr>
            ) : (
              filteredLeaves.map((item) => {
                const typeConfig = leaveTypeLabels[item.leave_type] || leaveTypeLabels.annual;
                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img
                          src={item.employee_avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=avatar'}
                          alt={item.employee_name}
                          className="emp-table-avatar"
                        />
                        <div>
                          <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.85rem', lineHeight: 1.2 }}>
                            {item.employee_name}
                          </strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {item.employee_id} • {item.employee_department}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 7px',
                          borderRadius: '5px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: typeConfig.color,
                          background: typeConfig.bg,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {typeConfig.label}
                      </span>
                    </td>

                    <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }} title={item.reason}>
                      <strong>{item.from_date}</strong>
                      <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>→</span>
                      <strong>{item.to_date}</strong>
                      {item.reason && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.reason}
                        </div>
                      )}
                    </td>

                    <td style={{ fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                      {item.days_count} ngày
                    </td>

                    <td>
                      <span className={`status-badge ${item.status === 'approved' ? 'badge-success' : (item.status === 'pending' ? 'badge-warning' : 'badge-danger')}`}>
                        {item.status === 'approved' ? 'Đã duyệt' : (item.status === 'pending' ? 'Chờ duyệt' : 'Từ chối')}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                        {item.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              onClick={() => handleUpdateStatus(item.id, 'approved')}
                              title="Phê duyệt đơn"
                              style={{ padding: '3px 7px', fontSize: '0.72rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              <CheckCircle2 size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => handleUpdateStatus(item.id, 'rejected')}
                              title="Từ chối đơn"
                              style={{ padding: '3px 7px', fontSize: '0.72rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              <XCircle size={13} />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="btn-icon btn-sm"
                          onClick={() => handleDelete(item.id)}
                          title="Xóa đơn này"
                        >
                          <Trash2 size={13} color="var(--text-muted)" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL TẠO ĐƠN XIN NGHỈ PHÉP */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Tạo Đơn Xin Nghỉ Phép Mới</h3>
                <p className="modal-subtitle">Ghi nhận phép có lương, nghỉ ốm, nghỉ không lương hoặc thai sản</p>
              </div>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateLeave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Chọn Nhân Viên <span className="required">*</span></label>
                  <select
                    className="form-select"
                    value={employeeId}
                    onChange={e => setEmployeeId(e.target.value)}
                    required
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.id}) - {emp.department}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Hình Thức / Loại Nghỉ Phép *</label>
                  <select
                    className="form-select"
                    value={leaveType}
                    onChange={e => setLeaveType(e.target.value)}
                  >
                    <option value="annual">Phép năm (Hưởng nguyên lương)</option>
                    <option value="sick">Nghỉ ốm đau / Điều trị y tế (BHXH chi trả)</option>
                    <option value="unpaid">Nghỉ việc riêng không hưởng lương (Có phép)</option>
                    <option value="maternity">Nghỉ chế độ thai sản</option>
                    <option value="unexcused">Nghỉ tự ý không phép (Kỷ luật & trừ lương)</option>
                  </select>
                </div>

                {/* Kiểm soát Ca / Giờ nghỉ chi tiết */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock3 size={14} color="var(--primary)" />
                    Khung Giờ / Ca Nghỉ Trong Ngày:
                  </label>
                  <div className="avatar-tabs" style={{ margin: 0 }}>
                    {[
                      { id: 'all_day', label: 'Cả ngày (1.0 ngày)' },
                      { id: 'morning', label: 'Buổi Sáng (08:00 - 12:00)' },
                      { id: 'afternoon', label: 'Buổi Chiều (13:30 - 17:30)' },
                      { id: 'custom_hours', label: 'Tùy chỉnh giờ' }
                    ].map(shift => (
                      <button
                        key={shift.id}
                        type="button"
                        className={`avatar-tab-btn ${timeShift === shift.id ? 'active' : ''}`}
                        onClick={() => setTimeShift(shift.id)}
                        style={{ fontSize: '0.78rem', padding: '4px 8px' }}
                      >
                        {shift.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Từ Ngày <span className="required">*</span></label>
                    <input
                      type="date"
                      className="form-input"
                      value={fromDate}
                      onChange={e => setFromDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Đến Ngày <span className="required">*</span></label>
                    <input
                      type="date"
                      className="form-input"
                      value={toDate}
                      onChange={e => setToDate(e.target.value)}
                      disabled={timeShift === 'morning' || timeShift === 'afternoon'}
                      required
                    />
                  </div>
                </div>

                {timeShift === 'custom_hours' && (
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Giờ bắt đầu:</label>
                      <input
                        type="time"
                        className="form-input"
                        value={fromTime}
                        onChange={e => setFromTime(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Giờ kết thúc:</label>
                      <input
                        type="time"
                        className="form-input"
                        value={toTime}
                        onChange={e => setToTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Tổng Số Ngày Nghỉ (Quy đổi) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    className="form-input"
                    value={daysCount}
                    onChange={e => setDaysCount(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Lý Do Nghỉ Phép <span className="required">*</span></label>
                  <textarea
                    className="form-textarea"
                    rows="3"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Ghi rõ lý do xin nghỉ phép để người quản lý dễ dàng xét duyệt..."
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Hủy Bỏ
                </button>
                <button type="submit" className="btn btn-primary">
                  Gửi Đơn Xin Nghỉ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
