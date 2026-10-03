import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ toasts, removeToast }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" id="toast-container">
      {toasts.map((toast) => {
        let Icon = CheckCircle2;
        if (toast.type === 'error') Icon = AlertCircle;
        if (toast.type === 'info') Icon = Info;

        return (
          <div key={toast.id} className={`toast ${toast.type || 'info'}`}>
            <Icon size={20} color={toast.type === 'error' ? '#ef4444' : toast.type === 'success' ? '#10b981' : '#4f46e5'} />
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{ marginLeft: 'auto', padding: 4, display: 'flex', alignItems: 'center', opacity: 0.6 }}
              aria-label="Đóng thông báo"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
