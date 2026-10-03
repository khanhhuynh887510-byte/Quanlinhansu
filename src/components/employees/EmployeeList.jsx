import React, { useState, useMemo } from 'react';
import { Search, LayoutGrid, List, UserPlus, SlidersHorizontal, ArrowUpDown, Users, Shuffle, History } from 'lucide-react';
import { EmployeeTable } from './EmployeeTable';
import { EmployeeCard } from './EmployeeCard';
import { DEPARTMENTS } from '../../data/initialEmployees';

export const EmployeeList = ({
  employees,
  onViewEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onOpenAddModal,
  onOpenTransfer,
  onOpenTransferHistory,
  selectedDepartmentFilter,
  setSelectedDepartmentFilter,
  isAdmin = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('id'); // 'id', 'name', 'salary', 'joinDate'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === 'table' ? 8 : 6;

  // Filter and sort logic
  const filteredEmployees = useMemo(() => {
    const searchLower = (searchTerm || '').trim().toLowerCase();
    return employees
      .filter((emp) => {
        if (!emp) return false;
        const matchesSearch =
          !searchLower ||
          (emp.name || '').toLowerCase().includes(searchLower) ||
          (emp.id || '').toLowerCase().includes(searchLower) ||
          (emp.email || '').toLowerCase().includes(searchLower) ||
          (emp.phone || '').includes(searchLower) ||
          (emp.cccd && String(emp.cccd).includes(searchLower)) ||
          (emp.position || '').toLowerCase().includes(searchLower);

        const matchesDept =
          selectedDepartmentFilter === 'all' ||
          emp.department === selectedDepartmentFilter;

        const matchesStatus =
          statusFilter === 'all' || emp.status === statusFilter;

        return matchesSearch && matchesDept && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return (a.name || '').localeCompare(b.name || '', 'vi');
        }
        if (sortBy === 'salary') {
          return (Number(b.salary) || 0) - (Number(a.salary) || 0);
        }
        if (sortBy === 'joinDate') {
          return new Date(b.joinDate || '2000-01-01') - new Date(a.joinDate || '2000-01-01');
        }
        return (a.id || '').localeCompare(b.id || '');
      });
  }, [employees, searchTerm, selectedDepartmentFilter, statusFilter, sortBy]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEmployees.slice(start, start + itemsPerPage);
  }, [filteredEmployees, currentPage, itemsPerPage]);

  const handleDepartmentChange = (e) => {
    setSelectedDepartmentFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div id="employees-container">
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users style={{ color: 'var(--primary)' }} />
            Quản Lý Hồ Sơ Nhân Sự & Điều Chuyển
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '2px' }}>
            Tổng cộng: <strong style={{ color: 'var(--primary)' }}>{employees.length} nhân sự</strong> toàn hệ thống.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => onOpenTransferHistory?.()}
            id="btn-transfer-history"
            style={{ borderRadius: '10px' }}
          >
            <History size={16} />
            <span>Lịch Sử Điều Chuyển</span>
          </button>

          {isAdmin && (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => onOpenTransfer?.()}
                id="btn-open-transfer"
                style={{ borderRadius: '10px' }}
              >
                <Shuffle size={16} />
                <span>Quyết Định Điều Chuyển</span>
              </button>

              <button
                className="btn btn-primary"
                onClick={onOpenAddModal}
                id="btn-add-employee"
                style={{ borderRadius: '10px' }}
              >
                <UserPlus size={16} />
                <span>Tiếp Nhận Nhân Sự</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="toolbar-card">
        <div className="search-box">
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Tìm theo tên, mã NV, CCCD, email, SĐT, chức vụ..."
            value={searchTerm}
            onChange={handleSearchChange}
            id="employee-search-input"
          />
        </div>

        <div className="filter-group">
          <select
            className="filter-select"
            value={selectedDepartmentFilter}
            onChange={handleDepartmentChange}
            id="department-filter-select"
          >
            <option value="all">Tất cả phòng ban</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept.id} value={dept.name}>{dept.name}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={handleStatusChange}
            id="status-filter-select"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Đang làm việc">Đang làm việc</option>
            <option value="Chính thức">Chính thức</option>
            <option value="Thử việc">Thử việc</option>
            <option value="Đang nghỉ thai sản">Đang nghỉ thai sản</option>
            <option value="Đã nghỉ việc">Đã nghỉ việc</option>
          </select>

          <select
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            id="sort-filter-select"
          >
            <option value="id">Sắp xếp: Mã NV</option>
            <option value="name">Sắp xếp: Tên A-Z</option>
            <option value="salary">Sắp xếp: Lương cao đến thấp</option>
            <option value="joinDate">Sắp xếp: Mới gia nhập</option>
          </select>

          <div className="view-mode-toggle">
            <button
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Chế độ xem bảng"
              id="view-mode-table-btn"
            >
              <List size={18} />
            </button>
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Chế độ xem lưới"
              id="view-mode-grid-btn"
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Employee Content */}
      {filteredEmployees.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Users size={32} />
          </div>
          <h3>Không tìm thấy nhân sự phù hợp</h3>
          <p>Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt các tiêu chí lọc phòng ban và trạng thái.</p>
          {isAdmin && (
            <button className="btn btn-primary" onClick={onOpenAddModal}>
              <UserPlus size={16} />
              <span>Tiếp Nhận Nhân Sự Mới</span>
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        <EmployeeTable
          employees={paginatedEmployees}
          onViewEmployee={onViewEmployee}
          onEditEmployee={onEditEmployee}
          onDeleteEmployee={onDeleteEmployee}
          onView={onViewEmployee}
          onEdit={onEditEmployee}
          onDelete={onDeleteEmployee}
          onOpenTransfer={onOpenTransfer}
          onOpenTransferHistory={onOpenTransferHistory}
          isAdmin={isAdmin}
        />
      ) : (
        <div className="employees-grid">
          {paginatedEmployees.map((emp) => (
            <EmployeeCard
              key={emp.id}
              employee={emp}
              onViewEmployee={onViewEmployee}
              onEditEmployee={onEditEmployee}
              onDeleteEmployee={onDeleteEmployee}
              onView={onViewEmployee}
              onEdit={onEditEmployee}
              onDelete={onDeleteEmployee}
              onOpenTransfer={onOpenTransfer}
              onOpenTransferHistory={onOpenTransferHistory}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {filteredEmployees.length > itemsPerPage && (
        <div className="pagination">
          <span className="pagination-info">
            Hiển thị <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> đến{' '}
            <strong>{Math.min(currentPage * itemsPerPage, filteredEmployees.length)}</strong> trong tổng số{' '}
            <strong>{filteredEmployees.length}</strong> nhân sự
          </span>
          <div className="pagination-buttons">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              id="pagination-prev-btn"
            >
              Trang trước
            </button>
            <span className="pagination-current" style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '0.85rem', fontWeight: 600 }}>
              {currentPage} / {totalPages}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              id="pagination-next-btn"
            >
              Trang sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
