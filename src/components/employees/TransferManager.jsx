import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Shuffle, Search, Filter, Calendar, ArrowRight, UserCheck, 
  Trash2, Plus, Download, Printer, RefreshCw, FileText, CheckCircle2,
  Building2, Briefcase, Award, TrendingUp, Sparkles, ChevronRight, Eye
} from 'lucide-react';
import { api } from '../../services/api';
import { TransferModal } from './TransferModal';
import { ConfirmModal } from '../ConfirmModal';

export const TransferManager = ({
  employees = [],
  currentUser,
  onShowToast,
  departments = [],
  positions = [],
  onRefreshEmployees
}) => {
  const [transfers, setTransfers] = useState([]);
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, topDepartments: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all'); // 'all' | 'this_month' | 'this_year'
  const [decisionFilter, setDecisionFilter] = useState('all'); // 'all' | 'promotion' | 'transfer' | 'demotion' | 'dismissal'

  // Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedTransferForDecision, setSelectedTransferForDecision] = useState(null);
  const [transferToDelete, setTransferToDelete] = useState(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [listData, statsData] = await Promise.all([
        api.getTransfers(),
        api.getTransferStats().catch(() => ({ total: 0, thisMonth: 0, topDepartments: [] }))
      ]);
      setTransfers(listData || []);
      setStats(statsData || { total: 0, thisMonth: 0, topDepartments: [] });
    } catch (err) {
      console.error('Lỗi khi tải bảng điều chuyển:', err);
      onShowToast?.(`Lỗi tải dữ liệu điều chuyển: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Bộ lọc dữ liệu
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentYear = new Date().getFullYear().toString();

  const filteredTransfers = useMemo(() => {
    return transfers.filter(item => {
      const matchSearch = !searchTerm ||
        (item.employee_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.employee_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.old_department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.new_department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.new_position || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.reason || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.decision_maker_name || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchDept = deptFilter === 'all' || 
        item.new_department === deptFilter || 
        item.old_department === deptFilter;

      const matchDecision = decisionFilter === 'all' || item.decision_type === decisionFilter;

      let matchTime = true;
      if (timeFilter === 'this_month') {
        matchTime = item.effective_date?.startsWith(currentMonth);
      } else if (timeFilter === 'this_year') {
        matchTime = item.effective_date?.startsWith(currentYear);
      }

      return matchSearch && matchDept && matchDecision && matchTime;
    });
  }, [transfers, searchTerm, deptFilter, decisionFilter, timeFilter, currentMonth, currentYear]);

  // Xóa bản ghi
  const handleConfirmDelete = async () => {
    if (!transferToDelete) return;
    try {
      await api.deleteTransfer(transferToDelete.id);
      onShowToast?.('Đã xóa bản ghi quyết định điều chuyển', 'info');
      setTransferToDelete(null);
      loadData();
    } catch (err) {
      onShowToast?.(`Lỗi xóa điều chuyển: ${err.message}`, 'error');
    }
  };

  // Xuất CSV
  const handleExportCSV = () => {
    if (filteredTransfers.length === 0) {
      onShowToast?.('Không có dữ liệu để xuất', 'warning');
      return;
    }

    const headers = ['Mã QĐ', 'Mã NV', 'Họ tên', 'Phòng ban cũ', 'Chức vụ cũ', 'Phòng ban mới', 'Chức vụ mới', 'Ngày hiệu lực', 'Lý do', 'Người phê duyệt'];
    const rows = filteredTransfers.map(t => [
      `QĐ-${t.id}`,
      t.employee_id,
      `"${t.employee_name || ''}"`,
      `"${t.old_department || ''}"`,
      `"${t.old_position || ''}"`,
      `"${t.new_department || ''}"`,
      `"${t.new_position || ''}"`,
      t.effective_date,
      `"${(t.reason || '').replace(/"/g, '""')}"`,
      `"${t.decision_maker_name || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danh_sach_dieu_chuyen_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast?.('Đã tải xuống file CSV quyết định điều chuyển!', 'success');
  };

  const isAdmin = currentUser?.role === 'admin';

  const renderDecisionTypeBadge = (type) => {
    switch (type) {
      case 'promotion':
        return (
          <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.72rem', fontWeight: 700, padding: '2px 7px', borderRadius: '6px' }}>
            🌟 Thăng chức
          </span>
        );
      case 'demotion':
        return (
          <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '0.72rem', fontWeight: 700, padding: '2px 7px', borderRadius: '6px' }}>
            ⚠️ Giáng chức
          </span>
        );
      case 'dismissal':
        return (
          <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.72rem', fontWeight: 700, padding: '2px 7px', borderRadius: '6px' }}>
            ⛔ Cách chức
          </span>
        );
      default:
        return (
          <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.3)', fontSize: '0.72rem', fontWeight: 700, padding: '2px 7px', borderRadius: '6px' }}>
            🔄 Điều chuyển
          </span>
        );
    }
  };

  const getDecisionMeta = (transfer) => {
    const type = transfer?.decision_type || 'transfer';
    if (type === 'promotion') {
      return {
        title: 'QUYẾT ĐỊNH BỔ NHIỆM CHỨC VỤ',
        subtitle: '(V/v: Bổ nhiệm và thăng cấp cán bộ nhân viên)',
        article1Lead: 'Bổ nhiệm có thời hạn đối với Ông/Bà:',
        modalTitle: 'Văn Bản Quyết Định Bổ Nhiệm Chức Vụ'
      };
    }
    if (type === 'demotion') {
      return {
        title: 'QUYẾT ĐỊNH GIÁNG CẤP BẬC / CHỨC DANH',
        subtitle: '(V/v: Giáng cấp bậc, điều chỉnh vị trí công tác cán bộ)',
        article1Lead: 'Giáng cấp bậc / chức danh đối với Ông/Bà:',
        modalTitle: 'Văn Bản Quyết Định Giáng Chức / Hạ Bậc'
      };
    }
    if (type === 'dismissal') {
      return {
        title: 'QUYẾT ĐỊNH KỶ LUẬT CÁCH CHỨC',
        subtitle: '(V/v: Thi hành kỷ luật lao động cách chức theo Điều 124 Bộ luật Lao động)',
        article1Lead: 'Thi hành kỷ luật lao động bằng hình thức CÁCH CHỨC đối với Ông/Bà:',
        modalTitle: 'Văn Bản Quyết Định Kỷ Luật Cách Chức'
      };
    }
    return {
      title: 'QUYẾT ĐỊNH ĐIỀU ĐỘNG CÔNG TÁC',
      subtitle: '(V/v: Điều động, luân chuyển công tác cán bộ nhân viên)',
      article1Lead: 'Điều chuyển công tác đối với Ông/Bà:',
      modalTitle: 'Văn Bản Quyết Định Điều Chuyển Công Tác'
    };
  };

  return (
    <div className="transfer-manager-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 8px 16px rgba(99, 102, 241, 0.25)'
          }}>
            <Shuffle size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Bảng Quản Lý Điều Chuyển & Thăng Chức
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Theo dõi lịch sử biến động vị trí công tác, quyết định bổ nhiệm và luân chuyển nhân sự (Bảng DieuChuyenNhanVien)
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={loadData}
            title="Làm mới dữ liệu"
            id="btn-refresh-transfers"
          >
            <RefreshCw size={15} />
            <span>Làm mới</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportCSV}
            title="Xuất bảng Excel/CSV"
            id="btn-export-transfers"
          >
            <Download size={15} />
            <span>Xuất CSV</span>
          </button>

          {isAdmin && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setIsTransferModalOpen(true)}
              id="btn-create-transfer"
              style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={16} />
              <span>Tạo Quyết Định Điều Chuyển</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Thống kê nhanh (KPI Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Card 1: Tổng số điều chuyển */}
        <div className="stat-card" style={{ background: 'var(--card-bg)', borderRadius: '16px', padding: '18px 20px', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Tổng Quyết Định
              </span>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#6366f1', marginTop: '6px' }}>
                {stats.total || transfers.length}
              </h3>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
              <FileText size={20} />
            </div>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Toàn bộ lịch sử biến động từ trước đến nay
          </p>
        </div>

        {/* Card 2: Điều chuyển trong tháng */}
        <div className="stat-card" style={{ background: 'var(--card-bg)', borderRadius: '16px', padding: '18px 20px', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Biến Động Tháng Này
              </span>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>
                {transfers.filter(t => t.effective_date?.startsWith(currentMonth)).length}
              </h3>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <Calendar size={20} />
            </div>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Nhân sự luân chuyển có hiệu lực tháng {currentMonth}
          </p>
        </div>

        {/* Card 3: Phòng ban tiếp nhận nhiều nhất */}
        <div className="stat-card" style={{ background: 'var(--card-bg)', borderRadius: '16px', padding: '18px 20px', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Phòng Ban Tiếp Nhận
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                {stats.topDepartments?.[0]?.new_department || 'Tất cả cân bằng'}
              </h3>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <Building2 size={20} />
            </div>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            {stats.topDepartments?.[0]?.count ? `${stats.topDepartments[0].count} lượt điều chuyển đến` : 'Chưa có biến động lớn'}
          </p>
        </div>

        {/* Card 4: Tình trạng hồ sơ */}
        <div className="stat-card" style={{ background: 'var(--card-bg)', borderRadius: '16px', padding: '18px 20px', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Tỷ Lệ Hoàn Tất Hồ Sơ
              </span>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#8b5cf6', marginTop: '6px' }}>
                100%
              </h3>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Đã đồng bộ sang bảng nhân viên & gửi thông báo
          </p>
        </div>
      </div>

      {/* 3. Bộ lọc & Thanh tìm kiếm */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '16px',
        padding: '16px 20px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        boxShadow: 'var(--card-shadow)'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            className="input"
            placeholder="Tìm theo tên NV, mã NV, phòng ban, chức vụ, lý do..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '38px', borderRadius: '10px' }}
            id="transfer-search-input"
          />
        </div>

        {/* Filter loại quyết định (Thăng chức, Điều chuyển, Giáng chức, Cách chức) */}
        <div style={{ minWidth: '165px' }}>
          <select
            className="select"
            value={decisionFilter}
            onChange={(e) => setDecisionFilter(e.target.value)}
            style={{ borderRadius: '10px' }}
            id="transfer-decision-filter"
          >
            <option value="all">Tất cả loại quyết định</option>
            <option value="promotion">🌟 Thăng chức</option>
            <option value="transfer">🔄 Điều chuyển</option>
            <option value="demotion">⚠️ Giáng chức</option>
            <option value="dismissal">⛔ Cách chức</option>
          </select>
        </div>

        {/* Filter phòng ban */}
        <div style={{ minWidth: '170px' }}>
          <select
            className="select"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            style={{ borderRadius: '10px' }}
            id="transfer-dept-filter"
          >
            <option value="all">Tất cả phòng ban</option>
            {departments.map(d => (
              <option key={d.id || d.name} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Filter thời gian */}
        <div style={{ minWidth: '140px' }}>
          <select
            className="select"
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            style={{ borderRadius: '10px' }}
            id="transfer-time-filter"
          >
            <option value="all">Tất cả thời gian</option>
            <option value="this_month">Tháng này</option>
            <option value="this_year">Năm nay</option>
          </select>
        </div>

        {/* Reset filter nếu có */}
        {(searchTerm || deptFilter !== 'all' || timeFilter !== 'all' || decisionFilter !== 'all') && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSearchTerm('');
              setDeptFilter('all');
              setTimeFilter('all');
              setDecisionFilter('all');
            }}
          >
            Đặt lại
          </button>
        )}
      </div>

      {/* 4. Bảng Dữ Liệu Điều Chuyển (Bảng DieuChuyenNhanVien) */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        boxShadow: 'var(--card-shadow)'
      }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div className="status-indicator-dot" style={{ width: '16px', height: '16px', background: 'var(--primary)', margin: '0 auto 12px' }}></div>
            <p style={{ color: 'var(--text-secondary)' }}>Đang tải danh sách điều chuyển...</p>
          </div>
        ) : filteredTransfers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 20px' }}>
            <Shuffle size={48} style={{ color: 'var(--text-secondary)', margin: '0 auto 16px', opacity: 0.4 }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Chưa có quyết định điều chuyển nào
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '460px', margin: '8px auto 20px' }}>
              Khi nhân sự được điều chuyển phòng ban, thăng chức hoặc bổ nhiệm chức vụ mới, thông tin sẽ được lưu vết và thống kê đầy đủ tại đây.
            </p>
            {isAdmin && (
              <button
                className="btn btn-primary"
                onClick={() => setIsTransferModalOpen(true)}
              >
                <Plus size={16} /> Tạo Quyết Định Đầu Tiên
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--input-bg)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Mã QĐ & Nhân Sự
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Vị Trí Trước Điều Chuyển
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', width: '40px' }}></th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Vị Trí & Đơn Vị Mới
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Ngày Hiệu Lực
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Căn Cứ / Lý Do
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Thao Tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.map((t) => (
                  <tr
                    key={t.id}
                    style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s ease' }}
                    className="hover-row"
                  >
                    {/* Nhân sự */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={t.employee_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.employee_id}`}
                          alt={t.employee_name}
                          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(99, 102, 241, 0.2)' }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                              {t.employee_name || 'Nhân viên'}
                            </strong>
                            <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', fontSize: '0.72rem' }}>
                              QĐ-{t.id}
                            </span>
                            {renderDecisionTypeBadge(t.decision_type)}
                          </div>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                            Mã: <span style={{ fontWeight: 600 }}>{t.employee_id}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Vị trí cũ */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ background: 'var(--input-bg)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <p style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', margin: 0 }}>
                          {t.old_position}
                        </p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                          {t.old_department}
                        </p>
                      </div>
                    </td>

                    {/* Mũi tên */}
                    <td style={{ padding: '14px 4px', textAlign: 'center', color: '#6366f1' }}>
                      <ArrowRight size={18} />
                    </td>

                    {/* Vị trí mới */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                        <p style={{ fontWeight: 800, fontSize: '0.88rem', color: '#6366f1', margin: 0 }}>
                          {t.new_position}
                        </p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                          {t.new_department}
                        </p>
                      </div>
                    </td>

                    {/* Ngày hiệu lực */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontWeight: 600, fontSize: '0.84rem' }}>
                        <Calendar size={13} />
                        {t.effective_date}
                      </div>
                    </td>

                    {/* Lý do */}
                    <td style={{ padding: '14px 16px', maxWidth: '260px' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {t.reason}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                        Ký duyệt: <strong>{t.decision_maker_name || 'Admin'}</strong>
                      </p>
                    </td>

                    {/* Thao tác */}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        {/* Xem biểu mẫu quyết định chính thức */}
                        <button
                          className="btn-icon btn-sm"
                          onClick={() => setSelectedTransferForDecision(t)}
                          title="Xem & in Quyết định điều chuyển chính thức"
                          style={{ color: '#6366f1' }}
                          id={`btn-view-decision-${t.id}`}
                        >
                          <Eye size={16} />
                        </button>

                        {/* Xóa quyết định */}
                        {isAdmin && (
                          <button
                            className="btn-icon btn-sm btn-danger"
                            onClick={() => setTransferToDelete(t)}
                            title="Xóa bản ghi điều chuyển"
                            id={`btn-delete-transfer-${t.id}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Modal Tạo Quyết Định Điều Chuyển */}
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        employees={employees}
        departments={departments}
        positions={positions}
        currentUser={currentUser}
        onShowToast={onShowToast}
        onSuccess={() => {
          loadData();
          onRefreshEmployees?.();
        }}
      />

      {/* 6. Modal Xác Nhận Xóa */}
      <ConfirmModal
        isOpen={!!transferToDelete}
        title="Xác Nhận Xóa Bản Ghi Điều Chuyển"
        message={
          transferToDelete
            ? `Bạn có chắc muốn xóa quyết định điều chuyển QĐ-${transferToDelete.id} của nhân viên "${transferToDelete.employee_name}"?`
            : ''
        }
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        onConfirm={handleConfirmDelete}
        onCancel={() => setTransferToDelete(null)}
      />

      {/* 7. Modal Biểu Mẫu Quyết Định Bổ Nhiệm / Điều Chuyển Chính Thức (In ấn / Preview) */}
      {selectedTransferForDecision && (
        <div className="modal-overlay" onClick={() => setSelectedTransferForDecision(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            {(() => {
              const meta = getDecisionMeta(selectedTransferForDecision);
              return (
                <>
                  <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={20} style={{ color: '#6366f1' }} />
                      {meta.modalTitle}
                    </h3>
                    <button className="modal-close" onClick={() => setSelectedTransferForDecision(null)}>×</button>
                  </div>

                  {/* Khung văn bản quy chuẩn */}
                  <div
                    id="printable-decision-letter"
                    style={{
                      background: '#ffffff',
                      color: '#1e293b',
                      padding: '36px 40px',
                      borderRadius: '12px',
                      fontFamily: `'Times New Roman', Times, serif`,
                      lineHeight: 1.6,
                      marginTop: '16px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}
                  >
                    {/* Tiêu ngữ */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', textAlign: 'center', marginBottom: '24px' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.95rem' }}>CÔNG TY CỔ PHẦN CÔNG NGHỆ HRPRO</p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.85rem' }}>Số: {selectedTransferForDecision.id}/QĐ-TCNS</p>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.95rem' }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                        <p style={{ margin: '2px 0 0', fontWeight: 'bold', fontSize: '0.85rem' }}>Độc lập - Tự do - Hạnh phúc</p>
                        <div style={{ width: '120px', height: '1px', background: '#333', margin: '4px auto 0' }}></div>
                      </div>
                    </div>

                    {/* Tiêu đề */}
                    <div style={{ textAlign: 'center', margin: '30px 0 20px' }}>
                      <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>
                        {meta.title}
                      </h2>
                      <p style={{ fontStyle: 'italic', margin: '4px 0 0', fontSize: '0.95rem' }}>
                        {meta.subtitle}
                      </p>
                    </div>

                    {/* Căn cứ */}
                    <div style={{ fontSize: '0.95rem', marginBottom: '16px' }}>
                      <p style={{ margin: '4px 0' }}>- Căn cứ Bộ luật Lao động nước Cộng hòa Xã hội Chủ nghĩa Việt Nam;</p>
                      <p style={{ margin: '4px 0' }}>- Căn cứ Điều lệ tổ chức và hoạt động của Công ty CP Công nghệ HRPro;</p>
                      <p style={{ margin: '4px 0' }}>- Căn cứ yêu cầu công việc thực tế, thẩm quyền quản lý và đánh giá cán bộ nhân sự;</p>
                      <p style={{ margin: '4px 0', fontStyle: 'italic' }}>- Xét đề nghị của Trưởng phòng Quản trị Nhân sự,</p>
                    </div>

                    {/* Quyết định */}
                    <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.05rem', margin: '16px 0 10px' }}>
                      QUYẾT ĐỊNH:
                    </div>

                    <div style={{ fontSize: '0.95rem' }}>
                      <p style={{ margin: '8px 0' }}>
                        <strong>Điều 1.</strong> {meta.article1Lead} <strong>{selectedTransferForDecision.employee_name}</strong> (Mã nhân viên: <strong>{selectedTransferForDecision.employee_id}</strong>)
                      </p>
                      <div style={{ paddingLeft: '20px', margin: '6px 0' }}>
                        <p style={{ margin: '4px 0' }}>• Vị trí công tác trước đây: <strong>{selectedTransferForDecision.old_position}</strong> - Bộ phận: <strong>{selectedTransferForDecision.old_department}</strong></p>
                        <p style={{ margin: '4px 0' }}>• Vị trí công tác áp dụng: <strong style={{ color: '#4f46e5' }}>{selectedTransferForDecision.new_position}</strong> - Bộ phận: <strong style={{ color: '#4f46e5' }}>{selectedTransferForDecision.new_department}</strong></p>
                      </div>

                      <p style={{ margin: '8px 0' }}>
                        <strong>Điều 2.</strong> Thời gian áp dụng quyết định có hiệu lực thi hành kể từ ngày <strong>{selectedTransferForDecision.effective_date}</strong>.
                      </p>

                      <p style={{ margin: '8px 0' }}>
                        <strong>Điều 3.</strong> Lý do và căn cứ điều động / thi hành: {selectedTransferForDecision.reason}.
                      </p>

                      <p style={{ margin: '8px 0' }}>
                        <strong>Điều 4.</strong> Phòng Quản trị Nhân sự, Phòng Kế toán Tài chính, các đơn vị liên quan và Ông/Bà có tên tại Điều 1 chịu trách nhiệm thi hành quyết định này.
                      </p>
                    </div>

              {/* Chữ ký */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: '36px', textAlign: 'center' }}>
                <div>
                  <p style={{ fontWeight: 'bold', fontSize: '0.9rem', margin: 0 }}>Nơi nhận:</p>
                  <p style={{ fontSize: '0.85rem', margin: '2px 0 0' }}>- Như Điều 4;</p>
                  <p style={{ fontSize: '0.85rem', margin: '2px 0 0' }}>- Lưu: VT, HC-NS.</p>
                </div>
                <div>
                  <p style={{ fontStyle: 'italic', fontSize: '0.85rem', margin: 0 }}>Hà Nội, ngày {selectedTransferForDecision.effective_date}</p>
                  <p style={{ fontWeight: 'bold', fontSize: '0.95rem', margin: '4px 0 0', textTransform: 'uppercase' }}>
                    TM. BAN GIÁM ĐỐC
                  </p>
                  <p style={{ fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>Người ký duyệt</p>
                  <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontStyle: 'italic', fontWeight: 'bold' }}>
                    [Đã ký số điện tử]
                  </div>
                  <p style={{ fontWeight: 'bold', fontSize: '0.95rem', margin: 0 }}>
                    {selectedTransferForDecision.decision_maker_name || 'Admin HR'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="modal-footer" style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedTransferForDecision(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={16} /> In Quyết Định
              </button>
            </div>
          </>
        );
      })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferManager;
