import React, { useState, useEffect } from 'react';
import { ArrowRight, Shuffle, UserCheck, Calendar, FileText, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { DEPARTMENTS as FALLBACK_DEPTS } from '../../data/initialEmployees';

const FALLBACK_POSITIONS = [
  { id: 'CV_GD', name: 'Giám đốc Điều hành' },
  { id: 'CV_TP', name: 'Trưởng phòng' },
  { id: 'CV_PP', name: 'Phó phòng' },
  { id: 'CV_TL_DA', name: 'Trưởng nhóm Dự án' },
  { id: 'CV_NV', name: 'Nhân viên' },
  { id: 'CV_TT', name: 'Thực tập sinh' }
];

export const TransferModal = ({
  isOpen,
  onClose,
  employees = [],
  departments = [],
  positions = [],
  selectedEmployee = null,
  onSuccess,
  onShowToast,
  currentUser
}) => {
  const [employeeId, setEmployeeId] = useState('');
  const [currentEmp, setCurrentEmp] = useState(null);
  const [decisionType, setDecisionType] = useState('transfer'); // 'promotion' | 'transfer' | 'demotion' | 'dismissal'
  const [newDepartment, setNewDepartment] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newSalary, setNewSalary] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Danh sách phòng ban và chức vụ tự tải nếu props trống
  const [deptList, setDeptList] = useState([]);
  const [posList, setPosList] = useState([]);

  // Tải danh mục phòng ban và chức vụ an toàn
  useEffect(() => {
    if (!isOpen) return;

    const loadOptions = async () => {
      // 1. Departments
      if (departments && departments.length > 0) {
        setDeptList(departments);
      } else {
        try {
          const depts = await api.getDepartments();
          if (depts && depts.length > 0) {
            setDeptList(depts);
          } else {
            setDeptList(FALLBACK_DEPTS);
          }
        } catch {
          setDeptList(FALLBACK_DEPTS);
        }
      }

      // 2. Positions
      if (positions && positions.length > 0) {
        setPosList(positions);
      } else {
        try {
          const pos = await api.getPositions();
          if (pos && pos.length > 0) {
            setPosList(pos);
          } else {
            setPosList(FALLBACK_POSITIONS);
          }
        } catch {
          setPosList(FALLBACK_POSITIONS);
        }
      }
    };

    loadOptions();
  }, [isOpen, departments, positions]);

  // Đồng bộ nhân viên được chọn
  useEffect(() => {
    if (!isOpen) return;

    if (selectedEmployee) {
      setEmployeeId(selectedEmployee.id);
      setCurrentEmp(selectedEmployee);
      setNewDepartment(selectedEmployee.department || '');
      setNewPosition(selectedEmployee.position || '');
      setNewSalary(selectedEmployee.salary || '');
    } else if (employees.length > 0) {
      const first = employees[0];
      setEmployeeId(first.id);
      setCurrentEmp(first);
      setNewDepartment(first.department || '');
      setNewPosition(first.position || '');
      setNewSalary(first.salary || '');
    }
  }, [selectedEmployee, employees, isOpen]);

  const handleSelectEmployee = (id) => {
    setEmployeeId(id);
    const emp = employees.find(e => e.id === id);
    if (emp) {
      setCurrentEmp(emp);
      setNewDepartment(emp.department || '');
      setNewPosition(emp.position || '');
      setNewSalary(emp.salary || '');
    }
  };

  const handleSelectDecisionType = (type) => {
    setDecisionType(type);
    if (type === 'dismissal') {
      if (!reason || reason === 'Bổ nhiệm vị trí mới theo quyết định ban giám đốc' || reason.includes('điều chuyển')) {
        setReason('Áp dụng hình thức kỷ luật lao động cách chức theo quy định nội bộ và Điều 124 Bộ luật Lao động');
      }
      setNewPosition('Nhân viên');
    } else if (type === 'demotion') {
      if (!reason || reason === 'Bổ nhiệm vị trí mới theo quyết định ban giám đốc' || reason.includes('điều chuyển')) {
        setReason('Điều chỉnh vị trí công tác và hạ bậc theo kết quả đánh giá năng lực định kỳ');
      }
    } else if (type === 'promotion') {
      if (!reason || reason.includes('kỷ luật') || reason.includes('hạ bậc')) {
        setReason('Bổ nhiệm và thăng cấp cán bộ do đạt thành tích xuất sắc và đáp ứng tiêu chuẩn vị trí');
      }
    } else {
      if (!reason || reason.includes('kỷ luật') || reason.includes('hạ bậc')) {
        setReason('Điều động và luân chuyển công tác nhằm tối ưu hóa tổ chức');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentEmp) return;

    if (newDepartment === currentEmp.department && newPosition === currentEmp.position && decisionType === 'transfer') {
      onShowToast?.('Phòng ban mới hoặc chức vụ mới phải khác với vị trí hiện tại.', 'error');
      return;
    }

    if (!reason.trim()) {
      onShowToast?.('Vui lòng nhập lý do quyết định điều chuyển / chức danh.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        employee_id: currentEmp.id,
        decision_type: decisionType,
        new_department: newDepartment,
        new_position: newPosition,
        new_salary: newSalary ? Number(newSalary) : undefined,
        effective_date: effectiveDate,
        reason: reason.trim(),
        decision_maker_id: currentUser?.employee_id || currentUser?.id || 'ADMIN',
        decision_maker_name: currentUser?.employee_name || currentUser?.username || 'Admin HR'
      };

      await api.createTransfer(payload);
      
      const typeLabel = 
        decisionType === 'promotion' ? 'bổ nhiệm thăng chức' :
        decisionType === 'demotion' ? 'giáng chức / hạ bậc' :
        decisionType === 'dismissal' ? 'kỷ luật cách chức' : 'điều chuyển công tác';

      onShowToast?.(`Đã ban hành quyết định ${typeLabel} cho nhân viên ${currentEmp.name} thành công!`, 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      onShowToast?.(`Lỗi điều chuyển: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
              <Shuffle size={20} />
            </div>
            Quyết Định Điều Động, Bổ Nhiệm & Kỷ Luật Chức Danh
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* LỰA CHỌN LOẠI QUYẾT ĐỊNH (Thăng chức / Điều chuyển / Giáng chức / Cách chức) */}
          <div className="form-group">
            <label className="label" style={{ fontWeight: 700, marginBottom: '8px' }}>Loại quyết định nhân sự *:</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleSelectDecisionType('promotion')}
                style={{
                  padding: '10px 8px',
                  borderRadius: '10px',
                  border: decisionType === 'promotion' ? '2px solid #10b981' : '1px solid var(--border-color)',
                  background: decisionType === 'promotion' ? 'rgba(16, 185, 129, 0.12)' : 'var(--card-bg)',
                  color: decisionType === 'promotion' ? '#059669' : 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>🌟</span>
                <span>Thăng Chức</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 400, opacity: 0.8 }}>Bổ nhiệm mới</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDecisionType('transfer')}
                style={{
                  padding: '10px 8px',
                  borderRadius: '10px',
                  border: decisionType === 'transfer' ? '2px solid #6366f1' : '1px solid var(--border-color)',
                  background: decisionType === 'transfer' ? 'rgba(99, 102, 241, 0.12)' : 'var(--card-bg)',
                  color: decisionType === 'transfer' ? '#6366f1' : 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>🔄</span>
                <span>Điều Chuyển</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 400, opacity: 0.8 }}>Đổi đơn vị</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDecisionType('demotion')}
                style={{
                  padding: '10px 8px',
                  borderRadius: '10px',
                  border: decisionType === 'demotion' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                  background: decisionType === 'demotion' ? 'rgba(245, 158, 11, 0.12)' : 'var(--card-bg)',
                  color: decisionType === 'demotion' ? '#d97706' : 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                <span>Giáng Chức</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 400, opacity: 0.8 }}>Hạ cấp bậc</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDecisionType('dismissal')}
                style={{
                  padding: '10px 8px',
                  borderRadius: '10px',
                  border: decisionType === 'dismissal' ? '2px solid #ef4444' : '1px solid var(--border-color)',
                  background: decisionType === 'dismissal' ? 'rgba(239, 68, 68, 0.12)' : 'var(--card-bg)',
                  color: decisionType === 'dismissal' ? '#dc2626' : 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>⛔</span>
                <span>Cách Chức</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 400, opacity: 0.8 }}>Kỷ luật chức vụ</span>
              </button>
            </div>
          </div>

          {/* Chọn nhân viên */}
          <div className="form-group">
            <label className="label">Chọn nhân sự đối tượng áp dụng *:</label>
            <select
              className="select"
              required
              value={employeeId}
              onChange={(e) => handleSelectEmployee(e.target.value)}
              disabled={!!selectedEmployee}
              id="transfer-employee-select"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.id} - {emp.name} ({emp.position} • {emp.department})
                </option>
              ))}
            </select>
          </div>

          {/* So sánh Vị trí Hiện tại vs Vị trí Mới */}
          {currentEmp && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center', background: 'var(--input-bg)', padding: '16px', borderRadius: '14px' }}>
              {/* Hiện tại */}
              <div style={{ background: 'var(--card-bg)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Hiện Tại
                </span>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {currentEmp.position}
                </h4>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {currentEmp.department}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 600 }}>
                  Lương: {Number(currentEmp.salary || 0).toLocaleString('vi-VN')} ₫
                </p>
              </div>

              {/* Mũi tên */}
              <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowRight size={24} />
              </div>

              {/* Mới */}
              <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                <span style={{ fontSize: '0.78rem', color: '#6366f1', textTransform: 'uppercase', fontWeight: 700 }}>
                  Sau Khi Điều Chuyển
                </span>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#6366f1', marginTop: '4px' }}>
                  {newPosition || 'Chưa chọn chức vụ'}
                </h4>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {newDepartment || 'Chưa chọn phòng ban'}
                </p>
                <p style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '4px', fontWeight: 600 }}>
                  Lương mới: {Number(newSalary || currentEmp.salary || 0).toLocaleString('vi-VN')} ₫
                </p>
              </div>
            </div>
          )}

          {/* Chọn phòng ban & chức vụ mới */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="label">Phòng ban mới *:</label>
              <select
                className="select"
                required
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                id="transfer-new-dept-select"
              >
                <option value="">-- Chọn phòng ban tiếp nhận --</option>
                {deptList.map(d => (
                  <option key={d.id || d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="label">Chức vụ / Vị trí mới *:</label>
              <select
                className="select"
                required
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
                id="transfer-new-pos-select"
              >
                <option value="">-- Chọn chức vụ mới --</option>
                {posList.map(p => (
                  <option key={p.id || p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mức lương mới (Tùy chọn) */}
          <div className="form-group">
            <label className="label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Mức lương mới (VNĐ/tháng):</span>
              {currentEmp && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Hiện tại: {Number(currentEmp.salary || 0).toLocaleString('vi-VN')} ₫
                </span>
              )}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                className="input"
                placeholder="Nhập mức lương mới nếu có điều chỉnh..."
                value={newSalary}
                onChange={(e) => setNewSalary(e.target.value)}
                style={{ flex: 1 }}
                id="transfer-new-salary-input"
              />
              {currentEmp && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const current = Number(currentEmp.salary || 0);
                    setNewSalary(Math.round(current * 1.15));
                  }}
                  title="Tăng 15% lương"
                >
                  +15%
                </button>
              )}
            </div>
          </div>

          {/* Ngày hiệu lực */}
          <div className="form-group">
            <label className="label">Ngày quyết định có hiệu lực thực tế *:</label>
            <input
              type="date"
              className="input"
              required
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              id="transfer-effective-date"
            />
          </div>

          {/* Lý do điều chuyển */}
          <div className="form-group">
            <label className="label">Lý do thực hiện điều chuyển / bổ nhiệm *:</label>
            <textarea
              className="input"
              required
              rows="3"
              placeholder="Ví dụ: Bổ nhiệm làm Trưởng nhóm phát triển sản phẩm mới tại bộ phận R&D theo quyết định số 45/QĐ-BGD..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              id="transfer-reason-input"
            />
          </div>

          {/* Người ký */}
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserCheck size={16} style={{ color: 'var(--primary)' }} />
            Người phê duyệt: <strong style={{ color: 'var(--text-primary)' }}>{currentUser?.employee_name || currentUser?.username || 'Admin HR'}</strong>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} id="transfer-submit-btn">
              {isSubmitting ? 'Đang ban hành...' : 'Ban Hành Quyết Định'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferModal;
