import React from 'react';
import { Mail, Phone, Calendar, MapPin, Eye, Edit3, Trash2, Shuffle, History } from 'lucide-react';
import { formatVND, formatDate, getStatusBadgeInfo, getDepartmentColor } from '../../utils/formatters';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

export const EmployeeCard = ({
  employee,
  onViewEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onOpenTransfer,
  onOpenTransferHistory,
  onView,
  onEdit,
  onDelete,
  isAdmin = true
}) => {
  if (!employee) return null;

  const handleView = onViewEmployee || onView;
  const handleEdit = onEditEmployee || onEdit;
  const handleDelete = onDeleteEmployee || onDelete;
  const handleTransfer = onOpenTransfer;
  const handleHistory = onOpenTransferHistory;

  const statusInfo = getStatusBadgeInfo(employee.status);
  const deptColor = getDepartmentColor(employee.department);

  return (
    <div className="emp-card" id={`emp-card-${employee.id}`}>
      <div className="emp-card-top">
        <img
          src={employee.avatar || DEFAULT_AVATAR}
          alt={employee.name}
          className="emp-card-avatar"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = DEFAULT_AVATAR;
          }}
        />
        <span className={`badge ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </div>

      <h4 className="emp-card-name">{employee.name}</h4>
      <p className="emp-card-role">
        {employee.position} • <span style={{ color: deptColor }}>{employee.department}</span>
      </p>

      <div className="emp-card-info-list">
        <div className="emp-card-info-item" title={employee.email}>
          <Mail size={14} color="var(--text-muted)" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {employee.email || 'Chưa có email'}
          </span>
        </div>
        <div className="emp-card-info-item">
          <Phone size={14} color="var(--text-muted)" />
          <span>{employee.phone || 'Chưa có SĐT'}</span>
        </div>
        <div className="emp-card-info-item">
          <Calendar size={14} color="var(--text-muted)" />
          <span>Gia nhập: {formatDate(employee.joinDate)}</span>
        </div>
        {employee.address && (
          <div className="emp-card-info-item">
            <MapPin size={14} color="var(--text-muted)" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {employee.address}
            </span>
          </div>
        )}
      </div>

      <div className="emp-card-footer">
        <div>
          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block' }}>Lương cơ bản</span>
          <span className="emp-card-salary">{formatVND(employee.salary)}</span>
        </div>

        <div className="action-btns">
          {handleView && (
            <button
              type="button"
              className="btn-icon btn-sm"
              onClick={() => handleView(employee)}
              title="Xem chi tiết"
            >
              <Eye size={15} color="var(--primary)" />
            </button>
          )}

          {handleTransfer && (
            <button
              type="button"
              className="btn-icon btn-sm"
              onClick={() => handleTransfer(employee)}
              title="Quyết định điều chuyển"
            >
              <Shuffle size={15} color="#6366f1" />
            </button>
          )}

          {handleHistory && (
            <button
              type="button"
              className="btn-icon btn-sm"
              onClick={() => handleHistory(employee.id)}
              title="Lịch sử điều chuyển"
            >
              <History size={15} color="#8b5cf6" />
            </button>
          )}

          {isAdmin && handleEdit && (
            <button
              type="button"
              className="btn-icon btn-sm"
              onClick={() => handleEdit(employee)}
              title="Chỉnh sửa"
            >
              <Edit3 size={15} color="#f59e0b" />
            </button>
          )}

          {isAdmin && handleDelete && (
            <button
              type="button"
              className="btn-icon btn-sm"
              onClick={() => handleDelete(employee)}
              title="Xóa"
            >
              <Trash2 size={15} color="var(--danger)" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
