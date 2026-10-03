import React, { useState, useEffect } from 'react';
import { History, Search, Filter, Calendar, ArrowRight, UserCheck, Shuffle, Trash2 } from 'lucide-react';
import { api } from '../../services/api';

export const TransferHistoryModal = ({
  isOpen,
  onClose,
  employeeId = null,
  onShowToast,
  isAdmin = true
}) => {
  const [transfers, setTransfers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadTransfers = async () => {
    setIsLoading(true);
    try {
      let data = [];
      if (employeeId) {
        data = await api.getEmployeeTransfers(employeeId);
      } else {
        data = await api.getTransfers();
      }
      setTransfers(data || []);
    } catch (err) {
      onShowToast?.(`Lỗi tải lịch sử điều chuyển: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTransfers();
    }
  }, [isOpen, employeeId]);

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa bản ghi lịch sử điều chuyển này?')) return;
    try {
      await api.deleteTransfer(id);
      onShowToast?.('Đã xóa bản ghi điều chuyển', 'success');
      loadTransfers();
    } catch (err) {
      onShowToast?.(`Lỗi xóa: ${err.message}`, 'error');
    }
  };

  const filteredTransfers = transfers.filter(t => {
    const term = searchTerm.toLowerCase();
    return (t.employee_name || '').toLowerCase().includes(term) ||
           (t.employee_id || '').toLowerCase().includes(term) ||
           (t.old_department || '').toLowerCase().includes(term) ||
           (t.new_department || '').toLowerCase().includes(term) ||
           (t.reason || '').toLowerCase().includes(term);
  });

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px', maxHeight: '90vh' }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
              <History size={20} />
            </div>
            {employeeId ? 'Lịch Sử Luân Chuyển & Thăng Chức Của Nhân Viên' : 'Lịch Sử Biến Động & Điều Chuyển Nhân Sự Toàn Doanh Nghiệp'}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!employeeId && (
            <div className="search-input-wrap" style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                className="input"
                placeholder="Tìm kiếm theo tên nhân viên, phòng ban, lý do..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '40px', width: '100%', borderRadius: '10px' }}
              />
            </div>
          )}

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Đang tải lịch sử điều chuyển...</p>
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', background: 'var(--input-bg)', borderRadius: '14px' }}>
              <Shuffle size={36} style={{ color: 'var(--text-secondary)', margin: '0 auto 10px', opacity: 0.5 }} />
              <h4 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Chưa có bản ghi điều chuyển nào</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Khi có quyết định bổ nhiệm hoặc luân chuyển vị trí công tác, dữ liệu sẽ được lưu vết tại đây.
              </p>
            </div>
          ) : (
            <div className="transfer-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredTransfers.map((t) => (
                <div
                  key={t.id}
                  style={{
                    background: 'var(--card-bg)',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--card-shadow)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  {/* Top Bar: Employee & Date */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={t.employee_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                        alt={t.employee_name}
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                          {t.employee_name}
                        </strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                          Mã: {t.employee_id}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={13} /> Hiệu lực: {t.effective_date}
                      </span>
                      {isAdmin && (
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ padding: '4px 8px' }}
                          onClick={() => handleDelete(t.id)}
                          title="Xóa bản ghi"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Transition path */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center', background: 'var(--input-bg)', padding: '12px 16px', borderRadius: '10px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Trước Điều Chuyển
                      </span>
                      <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', fontSize: '0.92rem' }}>
                        {t.old_position}
                      </p>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {t.old_department}
                      </p>
                    </div>

                    <div style={{ color: 'var(--primary)' }}>
                      <ArrowRight size={20} />
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 700 }}>
                        Vị Trí & Phòng Ban Mới
                      </span>
                      <p style={{ fontWeight: 700, color: '#10b981', marginTop: '2px', fontSize: '0.92rem' }}>
                        {t.new_position}
                      </p>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {t.new_department}
                      </p>
                    </div>
                  </div>

                  {/* Reason & Approver */}
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Lý do: </strong>
                      {t.reason}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <UserCheck size={14} /> Người phê duyệt: <strong style={{ color: 'var(--text-primary)' }}>{t.decision_maker_name || 'Admin'}</strong>
                    </div>
                  </div>
                </div>
              ))}
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
