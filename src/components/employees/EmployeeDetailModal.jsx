import React from 'react';
import { X, Mail, Phone, Calendar, MapPin, Edit3, Trash2, CreditCard, Shuffle, History } from 'lucide-react';
import { formatVND, formatDate, getStatusBadgeInfo, getDepartmentColor } from '../../utils/formatters';

export const EmployeeDetailModal = ({
  employee,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onOpenTransfer,
  onViewTransferHistory,
  isAdmin = true
}) => {
  if (!isOpen || !employee) return null;

  const statusInfo = getStatusBadgeInfo(employee.status);
  const deptColor = getDepartmentColor(employee.department);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Hồ Sơ Chi Tiết Nhân Viên</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="detail-hero">
            <img
              src={employee.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
              alt={employee.name}
              className="detail-avatar"
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {employee.name}
                </h2>
                <span className={`badge ${statusInfo.className}`}>
                  {statusInfo.label}
                </span>
              </div>
              <p style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>
                {employee.position}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Mã NV: <strong style={{ color: 'var(--text-primary)' }}>{employee.id}</strong> • Phòng ban: <strong style={{ color: deptColor }}>{employee.department}</strong>
              </p>
            </div>
          </div>

          <div className="detail-info-grid">
            <div className="detail-item">
              <span className="detail-label">Số CCCD / CMND</span>
              <span className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CreditCard size={16} color="var(--primary)" />
                <strong>{employee.cccd || 'Chưa cập nhật'}</strong>
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Email liên hệ</span>
              <span className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={16} color="var(--primary)" />
                {employee.email}
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Số điện thoại</span>
              <span className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={16} color="var(--primary)" />
                {employee.phone}
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Mức lương cơ bản</span>
              <span className="detail-value" style={{ color: 'var(--success-text)', fontSize: '1.1rem', fontWeight: 800 }}>
                {formatVND(employee.salary)}
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Ngày vào công ty</span>
              <span className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={16} color="var(--primary)" />
                {formatDate(employee.joinDate)}
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Ngày sinh & Giới tính</span>
              <span className="detail-value">
                {formatDate(employee.dob)} ({employee.gender || 'Nam'})
              </span>
            </div>

            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="detail-label">Địa chỉ thường trú</span>
              <span className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={16} color="var(--primary)" />
                {employee.address || 'Chưa cập nhật'}
              </span>
            </div>
          </div>

          {employee.notes && (
            <div style={{ marginTop: '16px', padding: '14px 16px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <span className="detail-label" style={{ display: 'block', marginBottom: '4px' }}>Ghi chú chuyên môn</span>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                {employee.notes}
              </p>
            </div>
          )}

          {/* Biến động & Điều chuyển Action Box */}
          <div style={{ marginTop: '16px', padding: '14px 16px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shuffle size={16} style={{ color: 'var(--primary)' }} />
                Biến động & Lịch sử Công tác
              </span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Tra cứu hoặc ban hành quyết định luân chuyển phòng ban / thăng chức cho nhân viên này.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  onViewTransferHistory?.(employee.id);
                }}
              >
                <History size={14} />
                <span>Xem lịch sử</span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    onOpenTransfer?.(employee);
                  }}
                >
                  <Shuffle size={14} />
                  <span>Điều chuyển</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {isAdmin && (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  onClose();
                  onEdit(employee);
                }}
              >
                <Edit3 size={16} />
                <span>Chỉnh sửa</span>
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  onClose();
                  onDelete(employee);
                }}
              >
                <Trash2 size={16} />
                <span>Xóa nhân viên</span>
              </button>
            </>
          )}
          <button className="btn btn-secondary" onClick={onClose} style={{ marginLeft: 'auto' }}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
