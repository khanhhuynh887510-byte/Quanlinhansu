import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, Plus, AlertCircle, CheckCircle2, Clock, 
  User, Calendar, DollarSign, RefreshCw, X, ShieldAlert
} from 'lucide-react';
import { api } from '../../services/api';

export const ContractManager = ({ employees = [], onShowToast }) => {
  const [contracts, setContracts] = useState([]);
  const [expiringContracts, setExpiringContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || '');
  const [contractType, setContractType] = useState('1 năm');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [salaryRate, setSalaryRate] = useState(15000000);
  const [notes, setNotes] = useState('');

  const loadContracts = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allC, expC] = await Promise.all([
        api.getContracts(),
        api.getExpiringContracts()
      ]);
      setContracts(allC || []);
      setExpiringContracts(expC || []);
    } catch (error) {
      console.error('Lỗi khi tải hợp đồng:', error);
      if (onShowToast) onShowToast('Không thể tải danh sách hợp đồng', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  // Cập nhật ngày kết thúc gợi ý khi đổi loại hợp đồng
  const handleTypeChange = (type) => {
    setContractType(type);
    const start = new Date(startDate);
    if (type === 'Thử việc') {
      start.setMonth(start.getMonth() + 2);
      setEndDate(start.toISOString().slice(0, 10));
    } else if (type === '1 năm') {
      start.setFullYear(start.getFullYear() + 1);
      setEndDate(start.toISOString().slice(0, 10));
    } else if (type === '3 năm') {
      start.setFullYear(start.getFullYear() + 3);
      setEndDate(start.toISOString().slice(0, 10));
    } else {
      setEndDate('');
    }
  };

  const handleCreateContract = async (e) => {
    e.preventDefault();
    if (!employeeId || !startDate) return;

    try {
      await api.createContract({
        employee_id: employeeId,
        contract_type: contractType,
        start_date: startDate,
        end_date: endDate || null,
        salary_rate: Number(salaryRate),
        notes
      });
      setIsModalOpen(false);
      await loadContracts();
      if (onShowToast) onShowToast('Tạo hợp đồng lao động mới thành công!', 'success');
    } catch (error) {
      if (onShowToast) onShowToast(error.message || 'Lỗi khi tạo hợp đồng', 'error');
    }
  };

  const formatCurrency = (val) => (Number(val) || 0).toLocaleString('vi-VN') + ' ₫';

  return (
    <div className="contract-manager-container">
      {/* Header */}
      <div className="contract-header-box">
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            Quản Lý Hợp Đồng Lao Động & Cảnh Báo Hết Hạn
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '3px 0 0' }}>
            Theo dõi thời hạn hợp đồng, mức lương đóng BHXH và cảnh báo tái ký tự động
          </p>
        </div>

        <button 
          className="btn btn-primary btn-sm"
          onClick={() => setIsModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} />
          <span>+ Ký Hợp Đồng Mới</span>
        </button>
      </div>

      {/* CẢNH BÁO HỢP ĐỒNG SẮP HẾT HẠN (EXPIRING BANNER) */}
      {expiringContracts.length > 0 && (
        <div className="expiring-alert-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="alert-icon-wrap">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: '#b45309' }}>
                Cảnh Báo: Có {expiringContracts.length} Hợp Đồng Lao Động Sắp Hết Hạn Trong 30 Ngày!
              </h4>
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#78350f' }}>
                Vui lòng liên hệ với người quản lý và nhân sự để tiến hành đánh giá hiệu suất và chuẩn bị thủ tục tái ký hợp đồng.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
            {expiringContracts.map(c => (
              <span key={c.id} className="expiring-badge">
                <strong>{c.employee_name}</strong> ({c.employee_id}) - Còn {c.days_remaining} ngày (Hết hạn: {c.end_date})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="payroll-metrics-grid" style={{ marginBottom: '20px' }}>
        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
            <FileText size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Tổng Số Hợp Đồng</span>
            <h3 className="metric-value">{contracts.length}</h3>
            <span className="metric-sub">Đang lưu trữ trong cơ sở dữ liệu</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Đang Có Hiệu Lực</span>
            <h3 className="metric-value" style={{ color: '#10b981' }}>
              {contracts.filter(c => c.status === 'active').length}
            </h3>
            <span className="metric-sub">Nhân sự chính thức & thử việc</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <Clock size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Sắp Hết Hạn (30 Ngày)</span>
            <h3 className="metric-value" style={{ color: '#f59e0b' }}>
              {expiringContracts.length}
            </h3>
            <span className="metric-sub">Cần tiến hành đánh giá tái ký</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
            <DollarSign size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Không Xác Định Thời Hạn</span>
            <h3 className="metric-value" style={{ color: '#3b82f6' }}>
              {contracts.filter(c => c.contract_type === 'Không xác định thời hạn').length}
            </h3>
            <span className="metric-sub">Hợp đồng dài hạn lãnh đạo</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="payroll-table-wrapper">
        <table className="payroll-table">
          <thead>
            <tr>
              <th>Mã HĐ</th>
              <th>Nhân Viên</th>
              <th>Loại Hợp Đồng</th>
              <th>Thời Hạn</th>
              <th>Lương Ký Kết</th>
              <th>Trạng Thái</th>
            </tr>
          </thead>
          <tbody>
            {contracts.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  Chưa có hợp đồng nào. Bấm <strong>+ Ký Hợp Đồng Mới</strong> để bắt đầu.
                </td>
              </tr>
            ) : contracts.map(c => (
              <tr key={c.id} title={c.notes ? `Ghi chú: ${c.notes}` : undefined}>
                <td style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  {c.id}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img
                      src={c.employee_avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=avatar'}
                      alt={c.employee_name}
                      className="emp-table-avatar"
                    />
                    <div>
                      <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.85rem', lineHeight: 1.2 }}>
                        {c.employee_name}
                      </strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {c.employee_id} • {c.employee_department}
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="badge-contract-type">{c.contract_type}</span>
                </td>
                <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                  <strong>{c.start_date}</strong>
                  <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>→</span>
                  {c.end_date ? (
                    <strong style={{ color: c.status === 'active' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {c.end_date}
                    </strong>
                  ) : (
                    <span style={{ color: '#6366f1', fontWeight: 600 }}>Vô thời hạn</span>
                  )}
                </td>
                <td style={{ fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' }}>
                  {formatCurrency(c.salary_rate)}
                </td>
                <td>
                  <span className={`status-badge ${c.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                    {c.status === 'active' ? 'Đang hiệu lực' : 'Đã kết thúc'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      {/* Modal Ký Hợp Đồng Mới */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '95%' }}>
            <div className="modal-header">
              <h2 className="modal-title">Ký Kết Hợp Đồng Lao Động Mới</h2>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="modal-body">
              <div className="form-group">
                <label className="form-label">Nhân sự <span className="text-danger">*</span></label>
                <select
                  className="form-control"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
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
                <label className="form-label">Loại hợp đồng <span className="text-danger">*</span></label>
                <select
                  className="form-control"
                  value={contractType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  required
                >
                  <option value="Thử việc">Hợp đồng Thử việc (2 tháng)</option>
                  <option value="1 năm">Hợp đồng Xác định thời hạn 1 năm</option>
                  <option value="3 năm">Hợp đồng Xác định thời hạn 3 năm</option>
                  <option value="Không xác định thời hạn">Hợp đồng Không xác định thời hạn</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Ngày bắt đầu hiệu lực <span className="text-danger">*</span></label>
                  <input
                    type="date"
                    className="form-control"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Ngày hết hạn (Nếu có)</label>
                  <input
                    type="date"
                    className="form-control"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={contractType === 'Không xác định thời hạn'}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mức lương thỏa thuận hợp đồng (VNĐ) <span className="text-danger">*</span></label>
                <input
                  type="number"
                  step="500000"
                  className="form-control"
                  value={salaryRate}
                  onChange={(e) => setSalaryRate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ghi chú điều khoản</label>
                <input
                  type="text"
                  className="form-control"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="VD: Hợp đồng ký kết đợt 2, phụ trách quản lý..."
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary">
                  Lưu & Kích Hoạt Hợp Đồng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
