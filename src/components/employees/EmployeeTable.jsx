import React from 'react';
import { Eye, Edit3, Trash2, Shuffle, History } from 'lucide-react';
import { formatVND, formatDate, getStatusBadgeInfo, getDepartmentColor } from '../../utils/formatters';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80';

export const EmployeeTable = ({
  employees = [],
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
  const handleView = onViewEmployee || onView;
  const handleEdit = onEditEmployee || onEdit;
  const handleDelete = onDeleteEmployee || onDelete;
  const handleTransfer = onOpenTransfer;
  const handleHistory = onOpenTransferHistory;

  return (
    <div className="table-container" id="employees-table-container">
      <div style={{ overflowX: 'auto' }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Nhân viên</th>
              <th>Phòng ban</th>
              <th>Chức vụ</th>
              <th>Mức lương</th>
              <th>Trạng thái</th>
              <th>Ngày vào làm</th>
              <th style={{ textAlign: 'center', minWidth: '150px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => {
              const statusInfo = getStatusBadgeInfo(emp.status);
              const deptColor = getDepartmentColor(emp.department);

              return (
                <tr key={emp.id}>
                  <td>
                    <div className="employee-cell">
                      <img
                        src={emp.avatar || DEFAULT_AVATAR}
                        alt={emp.name}
                        className="table-avatar"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = DEFAULT_AVATAR;
                        }}
                      />
                      <div>
                        <div className="emp-name">{emp.name}</div>
                        <div className="emp-id-sub">{emp.id} • {emp.email || 'Chưa có email'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: 600,
                        fontSize: '0.85rem'
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: deptColor
                        }}
                      />
                      {emp.department}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {emp.position}
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatVND(emp.salary)}
                  </td>
                  <td>
                    <span className={`badge ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {formatDate(emp.joinDate)}
                  </td>
                  <td>
                    <div className="action-btns" style={{ justifyContent: 'center' }}>
                      {handleView && (
                        <button
                          type="button"
                          className="btn-icon btn-sm"
                          onClick={() => handleView(emp)}
                          title="Xem chi tiết hồ sơ"
                          id={`view-btn-${emp.id}`}
                        >
                          <Eye size={15} color="var(--primary)" />
                        </button>
                      )}

                      {handleTransfer && (
                        <button
                          type="button"
                          className="btn-icon btn-sm"
                          onClick={() => handleTransfer(emp)}
                          title="Quyết định điều chuyển"
                          id={`transfer-btn-${emp.id}`}
                        >
                          <Shuffle size={15} color="#6366f1" />
                        </button>
                      )}

                      {handleHistory && (
                        <button
                          type="button"
                          className="btn-icon btn-sm"
                          onClick={() => handleHistory(emp.id)}
                          title="Lịch sử điều chuyển"
                          id={`history-btn-${emp.id}`}
                        >
                          <History size={15} color="#8b5cf6" />
                        </button>
                      )}

                      {isAdmin && handleEdit && (
                        <button
                          type="button"
                          className="btn-icon btn-sm"
                          onClick={() => handleEdit(emp)}
                          title="Chỉnh sửa thông tin"
                          id={`edit-btn-${emp.id}`}
                        >
                          <Edit3 size={15} color="#f59e0b" />
                        </button>
                      )}

                      {isAdmin && handleDelete && (
                        <button
                          type="button"
                          className="btn-icon btn-sm"
                          onClick={() => handleDelete(emp)}
                          title="Xóa nhân viên"
                          id={`delete-btn-${emp.id}`}
                        >
                          <Trash2 size={15} color="var(--danger)" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
