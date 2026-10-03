import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  DollarSign, Award, TrendingDown, RefreshCw, CheckCircle2, 
  Plus, FileText, Search, Filter, 
  Clock, ShieldAlert, ArrowUpRight, CreditCard,
  Calendar, ChevronLeft, ChevronRight, User, RotateCcw
} from 'lucide-react';

import { api } from '../../services/api';
import { PayslipModal } from './PayslipModal';
import { RewardPenaltyModal } from './RewardPenaltyModal';
import { getPresetDateRange, isDateInRange, getCurrentMonthStr } from '../../utils/dateFilter';

export const PayrollHub = ({ employees = [], onShowToast }) => {
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonthStr());
  const [activeSubTab, setActiveSubTab] = useState('sheet'); // 'sheet' | 'rewards_penalties' | 'policy'
  const [payrollList, setPayrollList] = useState([]);
  const [rewardsPenaltiesList, setRewardsPenaltiesList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters for Payroll Sheet (Tab 1)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [payrollEmpFilter, setPayrollEmpFilter] = useState('all');

  // Filters for Rewards & Penalties (Tab 2)
  const [rpEmployeeFilter, setRpEmployeeFilter] = useState('all');
  const [rpPeriodPreset, setRpPeriodPreset] = useState('month'); // 'all' | 'week' | 'month' | 'year' | 'custom'
  const [rpCustomFrom, setRpCustomFrom] = useState('');
  const [rpCustomTo, setRpCustomTo] = useState('');
  const [rpTypeFilter, setRpTypeFilter] = useState('all');
  const [rpSearchTerm, setRpSearchTerm] = useState('');

  // Modals
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [isRPModalOpen, setIsRPModalOpen] = useState(false);
  const [defaultRPType, setDefaultRPType] = useState('reward');

  // 1. Tải bảng lương và danh sách thưởng phạt
  const loadPayrollData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prData, rpData] = await Promise.all([
        api.getPayroll(currentMonth),
        api.getRewardsPenalties({ month: currentMonth })
      ]);
      setPayrollList(prData || []);
      setRewardsPenaltiesList(rpData || []);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu lương bổng:', error);
      if (onShowToast) onShowToast('Không thể tải dữ liệu bảng lương', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth, onShowToast]);

  useEffect(() => {
    loadPayrollData();
  }, [loadPayrollData]);

  // 2. Tự động tính toán bảng lương từ chấm công & thưởng phạt
  const handleAutoCalculate = async () => {
    setIsLoading(true);
    try {
      const res = await api.calculatePayroll(currentMonth);
      await loadPayrollData();
      if (onShowToast) onShowToast(res?.message || 'Đã tự động tính toán bảng lương!', 'success');
    } catch (error) {
      console.error('Lỗi tính toán:', error);
      if (onShowToast) onShowToast(error.message || 'Lỗi khi tính toán bảng lương', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Đổi trạng thái lương (Duyệt / Thanh toán)
  const handleUpdateStatus = async (payrollItem, newStatus) => {
    try {
      await api.updatePayroll(payrollItem.id, { status: newStatus });
      setPayrollList(prev => prev.map(item => 
        item.id === payrollItem.id ? { ...item, status: newStatus, payment_date: newStatus === 'paid' ? new Date().toISOString().slice(0, 16).replace('T', ' ') : item.payment_date } : item
      ));
      if (onShowToast) {
        onShowToast(`Đã chuyển trạng thái phiếu lương ${payrollItem.employee_name} sang "${newStatus === 'paid' ? 'Đã thanh toán' : 'Đã phê duyệt'}"`, 'success');
      }
    } catch (error) {
      if (onShowToast) onShowToast(error.message || 'Lỗi cập nhật trạng thái phiếu lương', 'error');
    }
  };

  // 4. Thanh toán tất cả phiếu lương tháng
  const handleBulkPay = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn xác nhận thanh toán toàn bộ lương cho tháng ${currentMonth}?`)) return;
    try {
      const res = await api.bulkPayPayroll(currentMonth);
      await loadPayrollData();
      if (onShowToast) onShowToast(res?.message || 'Đã thanh toán toàn bộ bảng lương', 'success');
    } catch (error) {
      if (onShowToast) onShowToast(error.message || 'Lỗi khi thanh toán toàn bộ', 'error');
    }
  };

  // 5. Thêm Khen thưởng / Xử phạt mới
  const handleAddRewardPenalty = async (formData) => {
    try {
      await api.createRewardPenalty(formData);
      setIsRPModalOpen(false);
      await loadPayrollData();
      if (onShowToast) {
        onShowToast(`Đã ghi nhận ${formData.type === 'reward' ? 'khen thưởng' : 'xử phạt'} thành công!`, 'success');
      }
    } catch (error) {
      if (onShowToast) onShowToast(error.message || 'Lỗi khi ghi nhận thưởng/phạt', 'error');
    }
  };

  // 6. Xóa bản ghi thưởng / phạt
  const handleDeleteRP = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) return;
    try {
      await api.deleteRewardPenalty(id);
      await loadPayrollData();
      if (onShowToast) onShowToast('Đã xóa bản ghi khen thưởng/xử phạt', 'info');
    } catch (error) {
      if (onShowToast) onShowToast(error.message || 'Lỗi khi xóa bản ghi', 'error');
    }
  };


  const formatCurrency = (val) => (Number(val) || 0).toLocaleString('vi-VN') + ' ₫';

  // Chuyển tháng nhanh
  const handlePrevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(prevStr);
  };

  const handleNextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(nextStr);
  };

  const handleCurrentMonth = () => {
    setCurrentMonth(getCurrentMonthStr());
  };

  // Lọc bảng lương (Tab 1)
  const filteredPayrolls = useMemo(() => {
    return payrollList.filter(item => {
      const matchSearch = !searchTerm ||
        (item.employee_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.employee_id || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = selectedDeptFilter === 'all' || item.employee_department === selectedDeptFilter;
      const matchEmp = payrollEmpFilter === 'all' || item.employee_id === payrollEmpFilter;
      return matchSearch && matchDept && matchEmp;
    });
  }, [payrollList, searchTerm, selectedDeptFilter, payrollEmpFilter]);

  // Lọc Khen thưởng & Xử phạt (Tab 2)
  const activeRpRange = useMemo(() => {
    return getPresetDateRange(rpPeriodPreset, rpCustomFrom, rpCustomTo, currentMonth);
  }, [rpPeriodPreset, rpCustomFrom, rpCustomTo, currentMonth]);

  const filteredRPList = useMemo(() => {
    const searchLower = (rpSearchTerm || '').trim().toLowerCase();

    return rewardsPenaltiesList.filter(item => {
      if (rpEmployeeFilter !== 'all' && item.employee_id !== rpEmployeeFilter) return false;
      if (rpTypeFilter !== 'all' && item.type !== rpTypeFilter) return false;
      if (activeRpRange.start || activeRpRange.end) {
        if (!isDateInRange(item.date, activeRpRange.start, activeRpRange.end)) return false;
      }
      if (searchLower) {
        const nameMatch = (item.employee_name || '').toLowerCase().includes(searchLower);
        const idMatch = (item.employee_id || '').toLowerCase().includes(searchLower);
        const titleMatch = (item.title || '').toLowerCase().includes(searchLower);
        const reasonMatch = (item.reason || '').toLowerCase().includes(searchLower);
        if (!nameMatch && !idMatch && !titleMatch && !reasonMatch) return false;
      }
      return true;
    });
  }, [rewardsPenaltiesList, rpEmployeeFilter, rpTypeFilter, activeRpRange, rpSearchTerm]);

  // Thống kê tổng hợp (Theo bộ lọc bảng lương)
  const totalNet = filteredPayrolls.reduce((sum, item) => sum + Number(item.net_salary || 0), 0);
  const totalAttendanceBonus = filteredPayrolls.reduce((sum, item) => sum + Number(item.attendance_bonus || 0), 0);
  const totalPerformanceBonus = filteredPayrolls.reduce((sum, item) => sum + Number(item.performance_bonus || 0), 0);
  const totalLatePenalty = filteredPayrolls.reduce((sum, item) => sum + Number(item.late_penalty || 0), 0);
  const totalUnexcusedPenalty = filteredPayrolls.reduce((sum, item) => sum + Number(item.unexcused_penalty || 0), 0);
  const paidCount = filteredPayrolls.filter(p => p.status === 'paid').length;

  const departments = Array.from(new Set(employees.map(e => e.department))).filter(Boolean);

  return (
    <div className="payroll-hub-container">
      {/* Top Header Controls */}
      <div className="payroll-header-box">
        <div className="payroll-title-area">
          <div className="payroll-icon-wrap">
            <DollarSign size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Quản Lý Bảng Lương & Thưởng Phạt
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '3px 0 0' }}>
              Kiểm soát chi tiết theo ngày, giờ, tuần, tháng, năm cho từng nhân viên hoặc cả bộ phận
            </p>
          </div>
        </div>

        <div className="payroll-actions-area" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Bộ chọn và điều hướng tháng nhanh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '4px 8px' }}>
            <button
              type="button"
              className="btn-icon btn-sm"
              onClick={handlePrevMonth}
              title="Tháng trước"
              style={{ padding: '2px 6px' }}
            >
              <ChevronLeft size={16} />
            </button>

            <input
              type="month"
              className="form-control"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              style={{ border: 'none', background: 'transparent', padding: '2px 4px', fontSize: '0.85rem', fontWeight: 700, width: '130px', textAlign: 'center' }}
            />

            <button
              type="button"
              className="btn-icon btn-sm"
              onClick={handleNextMonth}
              title="Tháng sau"
              style={{ padding: '2px 6px' }}
            >
              <ChevronRight size={16} />
            </button>

            {currentMonth !== getCurrentMonthStr() && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCurrentMonth}
                style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                title="Về tháng hiện tại"
              >
                Hiện tại
              </button>
            )}
          </div>

          <button 
            className="btn btn-secondary btn-sm"
            onClick={handleAutoCalculate}
            title="Tính toán tự động theo dữ liệu chấm công và quy chế"
            disabled={isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>⚡ Tự Động Tính Lương</span>
          </button>

          <button 
            className="btn btn-primary btn-sm"
            onClick={() => {
              setDefaultRPType('reward');
              setIsRPModalOpen(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} />
            <span>Thưởng / Phạt</span>
          </button>

          <button 
            className="btn btn-secondary btn-sm"
            onClick={handleBulkPay}
            title="Thanh toán toàn bộ lương tháng"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <CreditCard size={15} />
            <span>Thanh Toán Tất Cả</span>
          </button>
        </div>
      </div>

      {/* 4 Thẻ chỉ số tài chính tháng */}
      <div className="payroll-metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
            <DollarSign size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Tổng Quỹ Lương Thực Lĩnh</span>
            <h3 className="metric-value">{formatCurrency(totalNet)}</h3>
            <span className="metric-sub">
              {payrollList.length} nhân sự ({paidCount} đã chi trả)
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <Award size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Tổng Thưởng Chuyên Cần</span>
            <h3 className="metric-value" style={{ color: '#10b981' }}>
              +{formatCurrency(totalAttendanceBonus)}
            </h3>
            <span className="metric-sub">
              Khuyến khích đi làm đầy đủ 100%
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <ArrowUpRight size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Thưởng Đóng Góp Lớn & KPI</span>
            <h3 className="metric-value" style={{ color: '#f59e0b' }}>
              +{formatCurrency(totalPerformanceBonus)}
            </h3>
            <span className="metric-sub">
              Ghi nhận thành tích vượt bậc
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
            <TrendingDown size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Tổng Phạt Muộn & Trừ Không Phép</span>
            <h3 className="metric-value" style={{ color: '#ef4444' }}>
              -{formatCurrency(totalLatePenalty + totalUnexcusedPenalty)}
            </h3>
            <span className="metric-sub">
              Muộn: -{formatCurrency(totalLatePenalty)} | Vắng: -{formatCurrency(totalUnexcusedPenalty)}
            </span>
          </div>
        </div>
      </div>

      {/* Sub Tab Switcher */}
      <div className="payroll-subtabs-nav">
        <button
          className={`subtab-btn ${activeSubTab === 'sheet' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('sheet')}
        >
          <FileText size={16} />
          <span>Bảng Lương Tháng ({payrollList.length})</span>
        </button>
        <button
          className={`subtab-btn ${activeSubTab === 'rewards_penalties' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('rewards_penalties')}
        >
          <Award size={16} />
          <span>Khen Thưởng & Xử Phạt ({rewardsPenaltiesList.length})</span>
        </button>
        <button
          className={`subtab-btn ${activeSubTab === 'policy' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('policy')}
        >
          <ShieldAlert size={16} />
          <span>Quy Chế Thưởng Phạt & Tính Lương</span>
        </button>
      </div>

      {/* TAB CONTENT 1: BẢNG LƯƠNG CHI TIẾT */}
      {activeSubTab === 'sheet' && (
        <div className="payroll-tab-content">
          {/* Filter Bar */}
          <div className="payroll-filter-bar">
            <div className="search-box-wrap" style={{ flex: 1, maxWidth: '300px' }}>
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="form-control"
                placeholder="Tìm theo tên hoặc mã nhân viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Lọc theo nhân viên */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={15} color="var(--primary)" />
                <select
                  className="form-control"
                  value={payrollEmpFilter}
                  onChange={(e) => setPayrollEmpFilter(e.target.value)}
                  style={{ width: '200px', fontSize: '0.85rem' }}
                >
                  <option value="all">👥 Tất cả nhân sự ({employees.length})</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
                  ))}
                </select>
              </div>

              {/* Lọc phòng ban */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Filter size={15} color="var(--text-muted)" />
                <select
                  className="form-control"
                  value={selectedDeptFilter}
                  onChange={(e) => setSelectedDeptFilter(e.target.value)}
                  style={{ width: '180px', fontSize: '0.85rem' }}
                >
                  <option value="all">Tất cả phòng ban</option>
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {(payrollEmpFilter !== 'all' || selectedDeptFilter !== 'all' || searchTerm) && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setPayrollEmpFilter('all'); setSelectedDeptFilter('all'); setSearchTerm(''); }}
                  title="Đặt lại bộ lọc"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}
                >
                  <RotateCcw size={13} />
                  <span>Đặt lại</span>
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="payroll-table-wrapper">
            <table className="payroll-table">
              <thead>
                <tr>
                  <th>Nhân Viên</th>
                  <th>Lương CB</th>
                  <th>Công</th>
                  <th>Thưởng</th>
                  <th>Trừ / Phạt</th>
                  <th>Thực Lĩnh</th>
                  <th>Trạng Thái</th>
                  <th style={{ textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayrolls.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      Chưa có dữ liệu bảng lương cho tháng {currentMonth}. Vui lòng bấm <strong>⚡ Tự Động Tính Lương</strong> để khởi tạo!
                    </td>
                  </tr>
                ) : (
                  filteredPayrolls.map((row) => (
                    <tr key={row.id} className="payroll-row">
                      {/* Employee Info */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img
                            src={row.employee_avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=emp'}
                            alt={row.employee_name}
                            className="emp-table-avatar"
                          />
                          <div>
                            <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.85rem', lineHeight: 1.2 }}>
                              {row.employee_name}
                            </strong>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {row.employee_id} • {row.employee_department}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Base Salary */}
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {formatCurrency(row.base_salary)}
                      </td>

                      {/* Work Days */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 700, color: row.actual_days >= row.standard_days ? '#10b981' : '#f59e0b' }}>
                          {row.actual_days}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>/{row.standard_days}</span>
                      </td>

                      {/* Thưởng gộp: chuyên cần + đóng góp */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {(row.attendance_bonus > 0 || row.performance_bonus > 0) ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {row.attendance_bonus > 0 && (
                              <span className="badge-bonus" title="Thưởng chuyên cần 100%">
                                CC +{formatCurrency(row.attendance_bonus)}
                              </span>
                            )}
                            {row.performance_bonus > 0 && (
                              <span className="badge-contribution" title="Thưởng đóng góp / KPI">
                                KPI +{formatCurrency(row.performance_bonus)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>
                        )}
                      </td>

                      {/* Phạt gộp: muộn + vắng KP + BHXH */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {row.late_penalty > 0 && (
                            <span className="badge-penalty" title={`Phạt đi muộn ${row.late_count} lần`}>
                              Muộn -{formatCurrency(row.late_penalty)}
                            </span>
                          )}
                          {row.unexcused_penalty > 0 && (
                            <span className="badge-penalty-danger" title={`Nghỉ không phép ${row.absent_unexcused} ngày`}>
                              Vắng -{formatCurrency(row.unexcused_penalty)}
                            </span>
                          )}
                          {row.insurance_deduction > 0 && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }} title="Trừ BHXH/BHYT">
                              BHXH -{formatCurrency(row.insurance_deduction)}
                            </span>
                          )}
                          {!row.late_penalty && !row.unexcused_penalty && !row.insurance_deduction && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>
                          )}
                        </div>
                      </td>

                      {/* Net Salary */}
                      <td style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                        {formatCurrency(row.net_salary)}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`status-badge ${row.status === 'paid' ? 'badge-success' : (row.status === 'approved' ? 'badge-info' : 'badge-warning')}`}>
                          {row.status === 'paid' ? 'Đã chi trả' : (row.status === 'approved' ? 'Đã duyệt' : 'Dự thảo')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedPayslip(row)}
                            title="Xem Phiếu Lương"
                            style={{ padding: '4px 8px' }}
                          >
                            <FileText size={13} />
                            <span>Phiếu</span>
                          </button>

                          {row.status !== 'paid' && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleUpdateStatus(row, 'paid')}
                              title="Xác nhận đã thanh toán"
                              style={{ padding: '4px 8px' }}
                            >
                              <CheckCircle2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* TAB CONTENT 2: KHEN THƯỞNG & XỬ PHẠT */}
      {activeSubTab === 'rewards_penalties' && (
        <div className="payroll-tab-content">
          {/* Header Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Theo dõi và kiểm soát quyết định khen thưởng, biên bản vi phạm kỷ luật theo thời gian & nhân sự
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setDefaultRPType('reward');
                  setIsRPModalOpen(true);
                }}
              >
                <Award size={14} />
                <span>+ Khen Thưởng</span>
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  setDefaultRPType('penalty');
                  setIsRPModalOpen(true);
                }}
                style={{ background: '#ef4444', color: '#fff', borderColor: '#ef4444' }}
              >
                <TrendingDown size={14} />
                <span>+ Lập Biên Bản Xử Phạt</span>
              </button>
            </div>
          </div>

          {/* Controller Card for Rewards & Penalties */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: '12px' }}>
              
              {/* Lọc nhân viên */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '240px', flex: '1 1 auto' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <User size={14} color="var(--primary)" />
                  Nhân sự:
                </span>
                <select
                  className="form-control"
                  value={rpEmployeeFilter}
                  onChange={(e) => setRpEmployeeFilter(e.target.value)}
                  style={{ fontSize: '0.85rem', padding: '6px 10px' }}
                >
                  <option value="all">👥 Tất cả nhân sự ({employees.length})</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
                  ))}
                </select>
              </div>

              {/* Lọc thời gian presets */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={14} color="var(--primary)" />
                  Thời gian:
                </span>
                <div className="avatar-tabs" style={{ padding: '3px', margin: 0 }}>
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'week', label: 'Tuần này' },
                    { id: 'month', label: 'Tháng này' },
                    { id: 'year', label: 'Năm nay' },
                    { id: 'custom', label: 'Tùy chỉnh...' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className={`avatar-tab-btn ${rpPeriodPreset === p.id ? 'active' : ''}`}
                      onClick={() => setRpPeriodPreset(p.id)}
                      style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Chi tiết ngày khi chọn custom + Tìm kiếm + Loại */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px dashed var(--border-color)' }}>
              {rpPeriodPreset === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Từ:</span>
                  <input
                    type="date"
                    className="form-control"
                    value={rpCustomFrom}
                    onChange={(e) => setRpCustomFrom(e.target.value)}
                    style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8rem' }}
                  />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Đến:</span>
                  <input
                    type="date"
                    className="form-control"
                    value={rpCustomTo}
                    onChange={(e) => setRpCustomTo(e.target.value)}
                    style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8rem' }}
                  />
                </div>
              )}

              {/* Lọc loại Thưởng / Phạt */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {[
                  { id: 'all', label: 'Tất cả hình thức' },
                  { id: 'reward', label: '🏆 Chỉ Khen Thưởng' },
                  { id: 'penalty', label: '⚠️ Chỉ Xử Phạt' }
                ].map(b => (
                  <button
                    key={b.id}
                    type="button"
                    className={`btn btn-sm ${rpTypeFilter === b.id ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setRpTypeFilter(b.id)}
                    style={{ fontSize: '0.78rem', padding: '4px 9px' }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              {/* Tìm kiếm */}
              <div className="search-box-wrap" style={{ flex: '1 1 180px' }}>
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Tìm theo tiêu đề, lý do..."
                  value={rpSearchTerm}
                  onChange={(e) => setRpSearchTerm(e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '5px 8px 5px 30px' }}
                />
              </div>

              {(rpEmployeeFilter !== 'all' || rpPeriodPreset !== 'month' || rpTypeFilter !== 'all' || rpSearchTerm) && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setRpEmployeeFilter('all');
                    setRpPeriodPreset('month');
                    setRpTypeFilter('all');
                    setRpSearchTerm('');
                    setRpCustomFrom('');
                    setRpCustomTo('');
                  }}
                  style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RotateCcw size={13} />
                  <span>Đặt lại</span>
                </button>
              )}
            </div>

            {/* Status bar */}
            <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Đang hiển thị: <strong>{filteredRPList.length}</strong> bản ghi | Thời gian: <strong>{activeRpRange.label}</strong>
              {rpEmployeeFilter !== 'all' && (
                <span> | Nhân viên: <strong>{employees.find(e => e.id === rpEmployeeFilter)?.name || rpEmployeeFilter}</strong></span>
              )}
            </div>
          </div>

          <div className="rp-cards-grid">
            {filteredRPList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', gridColumn: '1 / -1', color: 'var(--text-muted)' }}>
                Không tìm thấy bản ghi khen thưởng hoặc xử phạt nào phù hợp với điều kiện lọc.
              </div>
            ) : (
              filteredRPList.map((item) => {
                const isReward = item.type === 'reward';
                return (
                  <div key={item.id} className={`rp-card ${isReward ? 'rp-reward-card' : 'rp-penalty-card'}`}>
                    <div className="rp-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className={`rp-icon-circle ${isReward ? 'circle-reward' : 'circle-penalty'}`}>
                          {isReward ? <Award size={18} /> : <TrendingDown size={18} />}
                        </div>
                        <div>
                          <span className={`rp-badge ${isReward ? 'badge-reward' : 'badge-penalty'}`}>
                            {isReward ? 'QUYẾT ĐỊNH KHEN THƯỞNG' : 'BIÊN BẢN XỬ PHẠT'}
                          </span>
                          <h4 className="rp-title">{item.title}</h4>
                        </div>
                      </div>
                      <span className={`rp-amount ${isReward ? 'text-success' : 'text-danger'}`}>
                        {isReward ? '+' : '-'}{formatCurrency(item.amount)}
                      </span>
                    </div>

                    <div className="rp-emp-row">
                      <img 
                        src={item.employee_avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=avatar'} 
                        alt={item.employee_name}
                        className="rp-emp-avatar" 
                      />
                      <div>
                        <strong>{item.employee_name}</strong> ({item.employee_id})
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {item.employee_department} • {item.employee_position}
                        </span>
                      </div>
                    </div>

                    {item.reason && (
                      <p className="rp-reason-text">
                        <strong>Căn cứ:</strong> {item.reason}
                      </p>
                    )}

                    <div className="rp-card-footer">
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Ngày áp dụng: {item.date}
                      </span>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDeleteRP(item.id)}
                        style={{ padding: '3px 8px', fontSize: '0.75rem', color: '#ef4444' }}
                      >
                        Hủy bỏ
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: QUY CHẾ THƯỞNG PHẠT */}
      {activeSubTab === 'policy' && (
        <div className="payroll-tab-content">
          <div className="policy-container">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px', color: 'var(--text-primary)' }}>
              📜 Quy Chế Khen Thưởng, Xử Phạt & Cơ Chế Tính Lương Doanh Nghiệp
            </h3>

            <div className="policy-grid">
              {/* Box 1: Thưởng chuyên cần */}
              <div className="policy-box reward-box">
                <div className="policy-box-header">
                  <Award size={20} color="#10b981" />
                  <h4>1. Thưởng Chuyên Cần (Attendance Bonus)</h4>
                </div>
                <ul>
                  <li><strong>Mức thưởng:</strong> 1.000.000 VNĐ / tháng.</li>
                  <li><strong>Điều kiện nhận thưởng:</strong>
                    <ul>
                      <li>Đi làm đủ 100% số ngày công tiêu chuẩn trong tháng (26 ngày).</li>
                      <li>Số lần đi muộn trong tháng = <strong>0 lần</strong>.</li>
                      <li>Số ngày nghỉ không phép = <strong>0 ngày</strong>.</li>
                    </ul>
                  </li>
                  <li><strong>Cơ chế tự động:</strong> Hệ thống tự động kiểm tra bảng chấm công và cộng thưởng vào phiếu lương cuối tháng.</li>
                </ul>
              </div>

              {/* Box 2: Thưởng Đóng Góp Lớn */}
              <div className="policy-box reward-box">
                <div className="policy-box-header">
                  <ArrowUpRight size={20} color="#6366f1" />
                  <h4>2. Thưởng Đóng Góp Lớn, Sáng Kiến & Vượt KPI</h4>
                </div>
                <ul>
                  <li><strong>Mức thưởng:</strong> Từ 1.000.000 VNĐ đến 5.000.000+ VNĐ tùy quy mô đóng góp.</li>
                  <li><strong>Căn cứ xét duyệt:</strong>
                    <ul>
                      <li>Top nhân viên kinh doanh vượt chỉ tiêu doanh số quý (trên 130%).</li>
                      <li>Sáng kiến cải tiến quy trình công nghệ, giảm thiểu chi phí vận hành máy chủ/hệ thống.</li>
                      <li>Hoàn thành các mốc dự án trước thời hạn với chất lượng xuất sắc.</li>
                    </ul>
                  </li>
                </ul>
              </div>

              {/* Box 3: Phạt Đi Làm Muộn */}
              <div className="policy-box penalty-box">
                <div className="policy-box-header">
                  <Clock size={20} color="#ef4444" />
                  <h4>3. Xử Phạt Đi Làm Muộn</h4>
                </div>
                <ul>
                  <li><strong>Quy định giờ giấc:</strong> Giờ làm việc chuẩn từ 08:30 đến 17:30. Điểm danh sau 08:35 được tính là <em>Đi muộn</em>.</li>
                  <li><strong>Mức phạt:</strong>
                    <ul>
                      <li>Đi muộn lần 1 - 2 trong tháng: <strong>100.000 VNĐ / lần</strong>.</li>
                      <li>Đi muộn từ lần thứ 3 trở lên: <strong>200.000 VNĐ / lần</strong> + mất toàn bộ thưởng chuyên cần.</li>
                    </ul>
                  </li>
                </ul>
              </div>

              {/* Box 4: Xử phạt Nghỉ Không Phép */}
              <div className="policy-box penalty-box">
                <div className="policy-box-header">
                  <ShieldAlert size={20} color="#dc2626" />
                  <h4>4. Kỷ Luật & Khấu Trừ Nghỉ Không Phép</h4>
                </div>
                <ul>
                  <li><strong>Định nghĩa:</strong> Tự ý vắng mặt trong giờ làm việc mà không nộp Đơn xin nghỉ phép hợp lệ trước ít nhất 24 giờ.</li>
                  <li><strong>Mức khấu trừ:</strong>
                    <ul>
                      <li>Khấu trừ toàn bộ lương ngày của những ngày nghỉ không phép: <code>(Lương CB / 26) * Số ngày</code>.</li>
                      <li>Phạt kỷ luật vi phạm nội quy: <strong>500.000 VNĐ / ngày nghỉ tự do</strong>.</li>
                      <li>Nghỉ từ 3 ngày không phép liên tiếp: Chuyển hội đồng kỷ luật xử lý đình chỉ hoặc chấm dứt hợp đồng.</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM PHIẾU LƯƠNG */}
      <PayslipModal
        isOpen={!!selectedPayslip}
        payslip={selectedPayslip}
        onClose={() => setSelectedPayslip(null)}
      />

      {/* MODAL THÊM KHEN THƯỞNG / XỬ PHẠT */}
      <RewardPenaltyModal
        isOpen={isRPModalOpen}
        onClose={() => setIsRPModalOpen(false)}
        onSubmit={handleAddRewardPenalty}
        employees={employees}
        defaultType={defaultRPType}
      />
    </div>
  );
};
