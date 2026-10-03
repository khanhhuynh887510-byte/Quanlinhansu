import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Edit, Trash2, Check, X } from 'lucide-react';
import { api } from '../../services/api';

export const PositionManagerModal = ({
  isOpen,
  onClose,
  onShowToast,
  onPositionsChanged
}) => {
  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newPosName, setNewPosName] = useState('');
  const [newPosId, setNewPosId] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const loadPositions = async () => {
    setIsLoading(true);
    try {
      const data = await api.getPositions();
      setPositions(data || []);
      onPositionsChanged?.(data || []);
    } catch (err) {
      onShowToast?.(`Lỗi tải chức vụ: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPositions();
    }
  }, [isOpen]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newPosName.trim()) return;
    try {
      await api.createPosition({ id: newPosId.trim() || undefined, name: newPosName.trim() });
      onShowToast?.('Thêm chức vụ mới thành công!', 'success');
      setNewPosName('');
      setNewPosId('');
      loadPositions();
    } catch (err) {
      onShowToast?.(`Lỗi thêm chức vụ: ${err.message}`, 'error');
    }
  };

  const handleStartEdit = (pos) => {
    setEditingId(pos.id);
    setEditingName(pos.name);
  };

  const handleSaveEdit = async (id) => {
    if (!editingName.trim()) return;
    try {
      await api.updatePosition(id, { name: editingName.trim() });
      onShowToast?.('Cập nhật chức vụ thành công!', 'success');
      setEditingId(null);
      loadPositions();
    } catch (err) {
      onShowToast?.(`Lỗi cập nhật: ${err.message}`, 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa chức vụ "${name}"?`)) return;
    try {
      await api.deletePosition(id);
      onShowToast?.(`Đã xóa chức vụ "${name}"`, 'success');
      loadPositions();
    } catch (err) {
      onShowToast?.(`Lỗi: ${err.message}`, 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Briefcase style={{ color: 'var(--primary)' }} />
            Quản Lý Danh Mục Chức Vụ (Positions)
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Form thêm chức vụ mới */}
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr auto', gap: '10px', alignItems: 'end', background: 'var(--input-bg)', padding: '14px', borderRadius: '12px' }}>
            <div>
              <label className="label" style={{ fontSize: '0.78rem' }}>Mã CV (Tùy chọn):</label>
              <input
                type="text"
                className="input"
                placeholder="VD: CV_PM"
                value={newPosId}
                onChange={(e) => setNewPosId(e.target.value.toUpperCase())}
                style={{ borderRadius: '8px' }}
              />
            </div>

            <div>
              <label className="label" style={{ fontSize: '0.78rem' }}>Tên chức vụ *:</label>
              <input
                type="text"
                className="input"
                required
                placeholder="VD: Quản lý Dự án (PM)"
                value={newPosName}
                onChange={(e) => setNewPosName(e.target.value)}
                style={{ borderRadius: '8px' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '9px 14px', borderRadius: '8px' }}>
              <Plus size={16} /> Thêm
            </button>
          </form>

          {/* Danh sách chức vụ */}
          {isLoading ? (
            <p style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>Đang tải danh mục chức vụ...</p>
          ) : positions.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>Chưa có chức vụ nào.</p>
          ) : (
            <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {positions.map((pos) => {
                const isEditing = editingId === pos.id;

                return (
                  <div
                    key={pos.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: 'var(--card-bg)',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, padding: '3px 8px', background: 'var(--input-bg)', borderRadius: '6px', color: 'var(--text-secondary)' }}>
                        {pos.id}
                      </span>

                      {isEditing ? (
                        <input
                          type="text"
                          className="input"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          style={{ padding: '4px 10px', height: '32px', flex: 1 }}
                          autoFocus
                        />
                      ) : (
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          {pos.name}
                        </strong>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
                      {isEditing ? (
                        <>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleSaveEdit(pos.id)}
                            style={{ padding: '6px 10px' }}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setEditingId(null)}
                            style={{ padding: '6px 10px' }}
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleStartEdit(pos)}
                            title="Sửa tên chức vụ"
                            style={{ padding: '6px 8px' }}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(pos.id, pos.name)}
                            title="Xóa chức vụ"
                            style={{ padding: '6px 8px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
