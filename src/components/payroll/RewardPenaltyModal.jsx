import React, { useState } from 'react';
import { X, Award, TrendingDown, Calendar, FileText, User } from 'lucide-react';

export const RewardPenaltyModal = ({ isOpen, onClose, onSubmit, employees = [], defaultType = 'reward' }) => {
  const [type, setType] = useState(defaultType); // 'reward' | 'penalty'
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || '');
  const [category, setCategory] = useState(defaultType === 'reward' ? 'attendance' : 'late');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState(defaultType === 'reward' ? 1000000 : 200000);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  // Tự động gợi ý tiêu đề khi chọn danh mục
  const handleCategoryChange = (newCat) => {
    setCategory(newCat);

    if (type === 'reward') {
      if (newCat === 'attendance') {
        setTitle(`Thưởng chuyên cần tháng ${date.slice(5, 7)}`);
        setAmount(1000000);
      } else if (newCat === 'contribution') {
        setTitle(`Thưởng đóng góp lớn - Sáng kiến xuất sắc`);
        setAmount(3000000);
      } else if (newCat === 'project') {
        setTitle(`Thưởng vượt chỉ tiêu KPI dự án`);
        setAmount(2000000);
      }
    } else {
      if (newCat === 'late') {
        setTitle(`Phạt đi làm muộn vi phạm quy định`);
        setAmount(100000);
      } else if (newCat === 'unexcused') {
        setTitle(`Kỷ luật & Trừ lương do nghỉ không phép`);
        setAmount(1000000);
      } else if (newCat === 'discipline') {
        setTitle(`Xử phạt vi phạm quy chế làm việc`);
        setAmount(500000);
      }
    }
  };

  const handleTypeChange = (newType) => {
    setType(newType);
    const newCat = newType === 'reward' ? 'attendance' : 'late';
    setCategory(newCat);
    if (newType === 'reward') {
      setTitle(`Thưởng chuyên cần tháng ${date.slice(5, 7)}`);
      setAmount(1000000);
    } else {
      setTitle(`Phạt đi làm muộn vi phạm quy định`);
      setAmount(100000);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!employeeId || !title || !amount) return;

    onSubmit({
      employee_id: employeeId,
      type,
      category,
      title,
      amount: Number(amount),
      date,
      reason
    });
  };

  const quickAmounts = type === 'reward' 
    ? [500000, 1000000, 2000000, 3000000, 5000000]
    : [100000, 200000, 500000, 1000000, 2000000];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '560px', width: '95%' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
              style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '8px', 
                background: type === 'reward' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: type === 'reward' ? '#10b981' : '#ef4444'
              }}
            >
              {type === 'reward' ? <Award size={20} /> : <TrendingDown size={20} />}
            </div>
            <div>
              <h2 className="modal-title">
                {type === 'reward' ? 'Tạo Quyết Định Khen Thưởng' : 'Lập Biên Bản Xử Phạt & Kỷ Luật'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Các khoản này sẽ tự động liên thông vào bảng lương tháng của nhân viên
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Chuyển đổi Loại Thưởng / Phạt */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              className={`btn ${type === 'reward' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleTypeChange('reward')}
              style={{
                background: type === 'reward' ? 'var(--primary)' : 'transparent',
                borderColor: type === 'reward' ? 'var(--primary)' : 'var(--border-color)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Award size={16} />
              <span>Khen Thưởng (+)</span>
            </button>
            <button
              type="button"
              className={`btn ${type === 'penalty' ? 'btn-danger' : 'btn-secondary'}`}
              onClick={() => handleTypeChange('penalty')}
              style={{
                background: type === 'penalty' ? '#ef4444' : 'transparent',
                color: type === 'penalty' ? '#ffffff' : 'var(--text-primary)',
                borderColor: type === 'penalty' ? '#ef4444' : 'var(--border-color)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <TrendingDown size={16} />
              <span>Xử Phạt (-)</span>
            </button>
          </div>

          {/* Chọn nhân viên */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={15} />
              <span>Áp dụng cho nhân viên <span className="text-danger">*</span></span>
            </label>
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

          {/* Danh mục */}
          <div className="form-group">
            <label className="form-label">
              Danh mục {type === 'reward' ? 'khen thưởng' : 'vi phạm'} <span className="text-danger">*</span>
            </label>
            <select
              className="form-control"
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              required
            >
              {type === 'reward' ? (
                <>
                  <option value="attendance">🌟 Thưởng chuyên cần (Đi làm đủ 100%, 0 lần muộn)</option>
                  <option value="contribution">🏆 Thưởng đóng góp lớn / Sáng kiến cải tiến</option>
                  <option value="project">🚀 Thưởng hoàn thành xuất sắc dự án / Vượt KPI</option>
                  <option value="other">🎁 Khen thưởng khác</option>
                </>
              ) : (
                <>
                  <option value="late">⏰ Phạt đi làm muộn vi phạm nội quy</option>
                  <option value="unexcused">🚫 Kỷ luật & Trừ lương do nghỉ không phép</option>
                  <option value="discipline">⚠️ Vi phạm quy chế làm việc & kỷ luật công ty</option>
                  <option value="other">⛔ Xử phạt khác</option>
                </>
              )}
            </select>
          </div>

          {/* Tiêu đề */}
          <div className="form-group">
            <label className="form-label">
              Tiêu đề quyết định <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Thưởng đóng góp sáng kiến Q3..."
              required
            />
          </div>

          {/* Số tiền và gợi ý nhanh */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Số tiền (VNĐ) <span className="text-danger">*</span></span>
              <span style={{ fontWeight: 800, color: type === 'reward' ? '#10b981' : '#ef4444' }}>
                {type === 'reward' ? '+' : '-'}{Number(amount).toLocaleString('vi-VN')} ₫
              </span>
            </label>
            <input
              type="number"
              className="form-control"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="50000"
              min="0"
              required
            />
            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
              {quickAmounts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(q)}
                  className="btn btn-secondary btn-sm"
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.75rem',
                    background: amount === q ? (type === 'reward' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)') : undefined,
                    borderColor: amount === q ? (type === 'reward' ? '#10b981' : '#ef4444') : undefined
                  }}
                >
                  {(q / 1000).toLocaleString('vi-VN')}k
                </button>
              ))}
            </div>
          </div>

          {/* Ngày áp dụng */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} />
              <span>Ngày quyết định</span>
            </label>
            <input
              type="date"
              className="form-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Lý do / Căn cứ chi tiết */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={15} />
              <span>Lý do / Căn cứ khen thưởng hoặc xử phạt</span>
            </label>
            <textarea
              className="form-control"
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ghi rõ thành tích đạt được hoặc mức độ vi phạm..."
            ></textarea>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy bỏ
            </button>
            <button 
              type="submit" 
              className={`btn ${type === 'reward' ? 'btn-primary' : 'btn-danger'}`}
              style={{
                background: type === 'reward' ? 'var(--primary)' : '#ef4444',
                color: '#fff'
              }}
            >
              {type === 'reward' ? 'Xác nhận Khen Thưởng' : 'Xác nhận Xử Phạt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
