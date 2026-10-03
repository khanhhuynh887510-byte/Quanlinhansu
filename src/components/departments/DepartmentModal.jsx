import React, { useState, useEffect } from 'react';
import { Building2, Palette, UserCheck } from 'lucide-react';
import { api } from '../../services/api';

const COLOR_PRESETS = [
  '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', 
  '#06b6d4', '#ef4444', '#14b8a6', '#3b82f6', '#84cc16'
];

export const DepartmentModal = ({
  isOpen,
  onClose,
  departmentToEdit = null,
  employees = [],
  onSuccess,
  onShowToast
}) => {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    code: '',
    manager_id: '',
    color: '#6366f1'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (departmentToEdit) {
      setFormData({
        id: departmentToEdit.id,
        name: departmentToEdit.name,
        code: departmentToEdit.code,
        manager_id: departmentToEdit.manager_id || '',
        color: departmentToEdit.color || '#6366f1'
      });
    } else {
      setFormData({
        id: '',
        name: '',
        code: '',
        manager_id: '',
        color: '#6366f1'
      });
    }
  }, [departmentToEdit, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      onShowToast?.('Vui lòng điền tên phòng ban và mã code.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (departmentToEdit) {
        await api.updateDepartment(departmentToEdit.id, formData);
        onShowToast?.('Cập nhật phòng ban thành công!', 'success');
      } else {
        await api.createDepartment(formData);
        onShowToast?.('Thêm phòng ban mới thành công!', 'success');
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      onShowToast?.(`Lỗi: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 style={{ color: formData.color || 'var(--primary)' }} />
            {departmentToEdit ? 'Chỉnh Sửa Phòng Ban' : 'Thêm Phòng Ban Mới'}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="label">Mã viết tắt (Code) *:</label>
              <input
                type="text"
                className="input"
                required
                placeholder="VD: IT, HR, SALES..."
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              />
            </div>

            <div className="form-group">
              <label className="label">Mã định danh (ID):</label>
              <input
                type="text"
                className="input"
                disabled={!!departmentToEdit}
                placeholder="Tự động nếu để trống"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Tên phòng ban đầy đủ *:</label>
            <input
              type="text"
              className="input"
              required
              placeholder="VD: Phòng Nghiên Cứu & Phát Triển (R&D)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="label">Bổ nhiệm Trưởng phòng (Department Manager):</label>
            <select
              className="select"
              value={formData.manager_id}
              onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
            >
              <option value="">-- Chưa chỉ định Trưởng phòng --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.id} - {emp.name} ({emp.position} • {emp.department})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Palette size={16} /> Màu sắc đại diện:
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
              {COLOR_PRESETS.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setFormData({ ...formData, color })}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: color,
                    border: formData.color === color ? '3px solid white' : 'none',
                    boxShadow: formData.color === color ? '0 0 0 2px ' + color : 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.15s'
                  }}
                />
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {departmentToEdit ? 'Lưu Thay Đổi' : 'Tạo Phòng Ban'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
