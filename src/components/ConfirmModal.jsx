import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Xóa nhân viên', cancelText = 'Hủy bỏ' }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-body" style={{ textAlign: 'center', paddingTop: '32px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: 'var(--danger-light)',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <AlertTriangle size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>
            {title || 'Xác nhận hành động'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            {message || 'Bạn có chắc chắn muốn thực hiện thao tác này? Hành động này không thể hoàn tác.'}
          </p>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'center', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="btn btn-danger" onClick={onConfirm} id="confirm-action-btn">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
