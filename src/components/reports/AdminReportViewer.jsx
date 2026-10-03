import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FileText, MessageSquare, Send, Search, X, BarChart2,
  CheckCircle2, Clock, Lightbulb, AlertTriangle, Filter,
  Calendar, User, RotateCcw
} from 'lucide-react';
import { api } from '../../services/api';
import { getPresetDateRange, isDateInRange, getCurrentMonthStr, getTodayStr } from '../../utils/dateFilter';

export const AdminReportViewer = ({ employees = [], onShowToast }) => {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [periodPreset, setPeriodPreset] = useState('all'); // 'all' | 'today' | 'week' | 'month' | 'year' | 'custom'
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'submitted' | 'reviewed'

  const [selectedReport, setSelectedReport] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getReports();
      setReports(data || []);
    } catch (error) {
      console.error('Lỗi tải báo cáo:', error);
      if (onShowToast) onShowToast('Không thể tải báo cáo công việc', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleOpenFeedback = (report) => {
    setSelectedReport(report);
    setFeedbackText(report.manager_feedback || '');
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;
    try {
      await api.submitReportFeedback(selectedReport.id, feedbackText);
      await loadReports();
      setSelectedReport(null);
      if (onShowToast) {
        onShowToast(`Đã gửi nhận xét cho nhân viên ${selectedReport.employee_name}!`, 'success');
      }
    } catch (error) {
      if (onShowToast) onShowToast('Lỗi khi gửi nhận xét', 'error');
    }
  };

  const activeDateRange = useMemo(() => {
    return getPresetDateRange(periodPreset, customFrom, customTo, selectedMonth);
  }, [periodPreset, customFrom, customTo, selectedMonth]);

  const filteredReports = useMemo(() => {
    const searchLower = (searchTerm || '').trim().toLowerCase();

    return reports.filter(r => {
      if (employeeFilter !== 'all' && r.employee_id !== employeeFilter) return false;
      if (typeFilter !== 'all' && r.report_type !== typeFilter) return false;
      if (deptFilter !== 'all' && r.employee_department !== deptFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;

      // Lọc theo ngày báo cáo
      if (activeDateRange.start || activeDateRange.end) {
        if (!isDateInRange(r.date, activeDateRange.start, activeDateRange.end)) return false;
      }

      if (searchLower) {
        const nameMatch = (r.employee_name || '').toLowerCase().includes(searchLower);
        const titleMatch = (r.title || '').toLowerCase().includes(searchLower);
        const idMatch = (r.employee_id || '').toLowerCase().includes(searchLower);
        const contentMatch = (r.content || '').toLowerCase().includes(searchLower);
        if (!nameMatch && !titleMatch && !idMatch && !contentMatch) return false;
      }

      return true;
    });
  }, [reports, employeeFilter, typeFilter, deptFilter, statusFilter, activeDateRange, searchTerm]);

  const resetFilters = () => {
    setEmployeeFilter('all');
    setPeriodPreset('all');
    setSelectedMonth(getCurrentMonthStr());
    setCustomFrom('');
    setCustomTo('');
    setSearchTerm('');
    setTypeFilter('all');
    setDeptFilter('all');
    setStatusFilter('all');
  };

  // Danh sách phòng ban
  const deptOptions = [...new Set(employees.map(e => e.department).filter(Boolean))];

  const getReportTypeBadge = (type) => {
    switch (type) {
      case 'daily':
        return { label: 'Báo cáo ngày', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' };
      case 'weekly':
        return { label: 'Báo cáo tuần', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
      case 'incident':
        return { label: 'Giải trình / Sự cố', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
      case 'suggestion':
        return { label: 'Sáng kiến đề xuất', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' };
      default:
        return { label: 'Báo cáo', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' };
    }
  };

  const selectedEmpObj = employees.find(e => e.id === employeeFilter);

  return (
    <div className="admin-reports-container">
      {/* Header */}
      <div className="payroll-header-box">
        <div className="payroll-title-area">
          <div className="payroll-icon-wrap" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <FileText size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Tiếp Nhận Báo Cáo Công Việc & Đề Xuất Từ Nhân Viên
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '3px 0 0' }}>
              Kiểm soát tiến độ công việc, biên bản sự cố và phản hồi nhận xét theo ngày, tuần, tháng cho từng nhân sự
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span className="status-badge badge-warning" style={{ padding: '6px 12px' }}>
            <Clock size={13} /> {filteredReports.filter(r => r.status === 'submitted').length} chờ nhận xét
          </span>
          <span className="status-badge badge-success" style={{ padding: '6px 12px' }}>
            <CheckCircle2 size={13} /> {filteredReports.filter(r => r.status === 'reviewed').length} đã nhận xét
          </span>
          <span className="status-badge badge-info" style={{ padding: '6px 12px' }}>
            <Lightbulb size={13} /> {filteredReports.filter(r => r.report_type === 'suggestion').length} đề xuất
          </span>
        </div>
      </div>

      {/* MULTI-DIMENSIONAL CONTROLLER (EMPLOYEE & TIME FILTER) */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: '12px' }}>
          
          {/* Lọc theo nhân viên */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '260px', flex: '1 1 auto' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
              <User size={15} color="var(--primary)" />
              Nhân sự:
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

          {/* Lọc theo khoảng thời gian */}
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

        {/* Dòng điều khiển phụ: Chọn tháng/ngày, Tìm kiếm, Loại báo cáo, Phòng ban */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px dashed var(--border-color)' }}>
          {periodPreset === 'month' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Tháng:</span>
              <input
                type="month"
                className="form-control"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ width: 'auto', padding: '4px 8px', fontSize: '0.85rem' }}
              />
            </div>
          )}

          {periodPreset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Từ:</span>
              <input
                type="date"
                className="form-control"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{ width: 'auto', padding: '4px 8px', fontSize: '0.85rem' }}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Đến:</span>
              <input
                type="date"
                className="form-control"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{ width: 'auto', padding: '4px 8px', fontSize: '0.85rem' }}
              />
            </div>
          )}

          <div className="search-box-wrap" style={{ flex: '1 1 200px' }}>
            <Search size={14} className="search-icon" />
            <input
              type="text"
              className="form-control"
              placeholder="Tìm theo tiêu đề, nội dung, tên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ fontSize: '0.82rem', padding: '6px 10px 6px 30px' }}
            />
          </div>

          {/* Lọc phòng ban */}
          <select
            className="form-control"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '150px', fontSize: '0.82rem', padding: '6px 10px' }}
          >
            <option value="all">Tất cả phòng ban</option>
            {deptOptions.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Lọc loại báo cáo */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'daily', label: '📅 Ngày' },
              { id: 'weekly', label: '📊 Tuần' },
              { id: 'incident', label: '🚨 Sự cố' },
              { id: 'suggestion', label: '💡 Đề xuất' }
            ].map(b => (
              <button
                key={b.id}
                type="button"
                className={`btn btn-sm ${typeFilter === b.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTypeFilter(b.id)}
                style={{ fontSize: '0.78rem', padding: '4px 8px' }}
              >
                {b.label}
              </button>
            ))}
          </div>

          {(employeeFilter !== 'all' || periodPreset !== 'all' || typeFilter !== 'all' || deptFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={resetFilters}
              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RotateCcw size={13} />
              <span>Đặt lại</span>
            </button>
          )}
        </div>

        {/* Thanh trạng thái */}
        <div style={{ marginTop: '10px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          Đang hiển thị: <strong>{filteredReports.length}</strong> báo cáo | Thời gian: <strong>{activeDateRange.label}</strong>
          {employeeFilter !== 'all' && (
            <span> | Nhân viên: <strong>{selectedEmpObj ? `${selectedEmpObj.name} (${selectedEmpObj.id})` : employeeFilter}</strong></span>
          )}
        </div>
      </div>

      {/* Reports Table */}
      <div className="payroll-table-wrapper">
        <table className="payroll-table">
          <thead>
            <tr>
              <th>Nhân Viên</th>
              <th>Loại Báo Cáo</th>
              <th>Tiêu Đề</th>
              <th>Ngày Nộp</th>
              <th>Trạng Thái</th>
              <th>Nhận Xét Của Quản Lý</th>
              <th style={{ textAlign: 'right' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  Đang tải danh sách báo cáo...
                </td>
              </tr>
            ) : filteredReports.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  Không tìm thấy báo cáo nào phù hợp với bộ lọc (Nhân sự / Thời gian).
                </td>
              </tr>
            ) : (
              filteredReports.map((r) => {
                const badge = getReportTypeBadge(r.report_type);
                const hasFeedback = Boolean(r.manager_feedback);
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img
                          src={r.employee_avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=avatar'}
                          alt={r.employee_name}
                          className="emp-table-avatar"
                        />
                        <div>
                          <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                            {r.employee_name}
                          </strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {r.employee_id} • {r.employee_department}
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
                          color: badge.color,
                          background: badge.bg,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>

                    <td style={{ maxWidth: '240px' }}>
                      <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                        {r.title}
                      </strong>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.content}
                      </p>
                    </td>

                    <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      {r.date}
                    </td>

                    <td>
                      <span className={`status-badge ${r.status === 'reviewed' ? 'badge-success' : 'badge-warning'}`}>
                        {r.status === 'reviewed' ? 'Đã nhận xét' : 'Chờ phản hồi'}
                      </span>
                    </td>

                    <td style={{ maxWidth: '200px' }}>
                      {hasFeedback ? (
                        <div style={{ fontSize: '0.78rem', color: '#059669', background: 'rgba(16, 185, 129, 0.08)', padding: '4px 8px', borderRadius: '5px' }}>
                          💬 {r.manager_feedback}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Chưa có nhận xét
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleOpenFeedback(r)}
                        style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <MessageSquare size={13} />
                        <span>{hasFeedback ? 'Sửa nhận xét' : 'Nhận xét'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal phản hồi nhận xét */}
      {selectedReport && (
        <div className="modal-backdrop" onClick={() => setSelectedReport(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Phản Hồi & Đánh Giá Báo Cáo</h3>
              <button className="btn-close" onClick={() => setSelectedReport(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitFeedback} className="modal-body">
              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '0.85rem' }}>{selectedReport.employee_name} ({selectedReport.employee_id})</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{selectedReport.date}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '4px' }}>
                  {selectedReport.title}
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                  {selectedReport.content}
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Ý kiến chỉ đạo / Nhận xét của Quản lý: <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder="Ghi nhận nỗ lực, góp ý giải pháp hoặc phê duyệt đề xuất..."
                  required
                />
              </div>

              <div className="modal-footer" style={{ padding: '14px 0 0', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedReport(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Send size={15} />
                  <span>Gửi Nhận Xét</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
