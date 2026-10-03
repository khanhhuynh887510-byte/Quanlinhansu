import React, { useState, useEffect } from 'react';
import { Building2, User, Users, ArrowRight, Plus, Briefcase, Edit, Trash2 } from 'lucide-react';
import { formatVND } from '../../utils/formatters';
import { DepartmentModal } from './DepartmentModal';
import { PositionManagerModal } from './PositionManagerModal';
import { api } from '../../services/api';

export const DepartmentList = ({
  departments: initialDepartments = [],
  employees = [],
  onSelectDepartment,
  onShowToast,
  currentUser
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [departments, setDepartments] = useState(initialDepartments);
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptToEdit, setDeptToEdit] = useState(null);
  const [isPosModalOpen, setIsPosModalOpen] = useState(false);

  const loadDepartments = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDepartments();
      if (data && data.length > 0) {
        setDepartments(data);
      }
    } catch (err) {
      console.error('Lỗi tải phòng ban:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const handleOpenAdd = () => {
    setDeptToEdit(null);
    setIsDeptModalOpen(true);
  };

  const handleOpenEdit = (dept) => {
    setDeptToEdit(dept);
    setIsDeptModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa phòng ban "${name}"?`)) return;
    try {
      await api.deleteDepartment(id);
      onShowToast?.(`Đã xóa phòng ban "${name}" thành công!`, 'success');
      loadDepartments();
    } catch (err) {
      onShowToast?.(`Lỗi xóa phòng ban: ${err.message}`, 'error');
    }
  };

  return (
    <div id="departments-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 style={{ color: 'var(--primary)' }} />
            Cơ Cấu Tổ Chức & Phòng Ban Doanh Nghiệp
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Quản lý sơ đồ phòng ban, bổ nhiệm Trưởng phòng và danh mục chức vụ toàn công ty.
          </p>
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setIsPosModalOpen(true)}
              id="btn-manage-positions"
            >
              <Briefcase size={16} />
              <span>Danh Mục Chức Vụ</span>
            </button>
            <button
              className="btn btn-primary"
              onClick={handleOpenAdd}
              id="btn-add-department"
            >
              <Plus size={16} />
              <span>Thêm Phòng Ban Mới</span>
            </button>
          </div>
        )}
      </div>

      <div className="departments-grid">
        {departments.map((dept) => {
          const deptEmployees = employees.filter(e => e.department === dept.name || e.department === dept.id);
          const deptPayroll = deptEmployees.reduce((sum, e) => sum + (Number(e.salary) || 0), 0);
          const managerDisplay = dept.manager_name || dept.manager || 'Chưa có trưởng phòng';

          return (
            <div key={dept.id} className="dept-card" style={{ position: 'relative' }}>
              <div className="dept-header">
                <div
                  className="dept-icon"
                  style={{ backgroundColor: dept.color || '#4f46e5' }}
                >
                  <Building2 size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {dept.name}
                  </h4>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: dept.color || '#4f46e5' }}>
                    MÃ: {dept.code} {dept.id && `(${dept.id})`}
                  </span>
                </div>

                {isAdmin && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 8px' }}
                      onClick={() => handleOpenEdit(dept)}
                      title="Chỉnh sửa phòng ban"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ padding: '4px 8px' }}
                      onClick={() => handleDelete(dept.id, dept.name)}
                      title="Xóa phòng ban"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={15} /> Trưởng phòng (Manager):
                  </span>
                  <strong style={{ color: 'var(--text-primary)' }}>{managerDisplay}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={15} /> Nhân sự trực thuộc:
                  </span>
                  <strong style={{ color: 'var(--text-primary)' }}>{deptEmployees.length} nhân viên</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tổng quỹ lương phòng:</span>
                  <strong style={{ color: 'var(--success-text)' }}>{formatVND(deptPayroll)}</strong>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontWeight: 600 }}>Thành viên tiêu biểu:</span>
                  <div style={{ display: 'flex', marginLeft: 'auto' }}>
                    {deptEmployees.slice(0, 4).map((emp, i) => (
                      <img
                        key={emp.id}
                        src={emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80'}
                        alt={emp.name}
                        title={emp.name}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          border: '2px solid var(--bg-surface)',
                          marginLeft: i > 0 ? -8 : 0,
                          objectFit: 'cover'
                        }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: '0.85rem', padding: '8px 12px' }}
                  onClick={() => onSelectDepartment(dept.name)}
                >
                  <span>Xem {deptEmployees.length} nhân viên phòng {dept.code}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add / Edit Department */}
      <DepartmentModal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        departmentToEdit={deptToEdit}
        employees={employees}
        onSuccess={loadDepartments}
        onShowToast={onShowToast}
      />

      {/* Modal Manage Positions */}
      <PositionManagerModal
        isOpen={isPosModalOpen}
        onClose={() => setIsPosModalOpen(false)}
        onShowToast={onShowToast}
      />
    </div>
  );
};
