import React, { useState } from 'react';
import { CheckCircle2, Clock, XCircle, Search } from 'lucide-react';
import { getDepartmentColor } from '../../utils/formatters';

export const AttendanceTracker = ({ employees, attendanceData: externalAttendance, onToggleStatus }) => {
  // State for attendance status mapped by employee ID
  const [internalAttendance, setInternalAttendance] = useState(() => {
    const initial = {};
    employees.forEach((emp, index) => {
      if (index === 2) initial[emp.id] = 'late';
      else if (index === 9) initial[emp.id] = 'absent';
      else initial[emp.id] = 'present';
    });
    return initial;
  });

  const attendanceData = externalAttendance || internalAttendance;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const todayStr = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  const handleToggleStatus = (empId, newStatus) => {
    if (onToggleStatus) {
      onToggleStatus(empId, newStatus);
    } else {
      setInternalAttendance(prev => ({
        ...prev,
        [empId]: newStatus
      }));
    }
  };

  const presentCount = Object.values(attendanceData).filter(s => s === 'present').length;
  const lateCount = Object.values(attendanceData).filter(s => s === 'late').length;
  const absentCount = Object.values(attendanceData).filter(s => s === 'absent').length;

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase());

    const currentStatus = attendanceData[emp.id] || 'present';
    const matchesStatus = filterStatus === 'all' || currentStatus === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div id="attendance-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Điểm Danh & Theo Dõi Chấm Công Hôm Nay
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textTransform: 'capitalize' }}>
            📅 {todayStr}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: 'var(--success-light)', color: 'var(--success-text)', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.85rem' }}>
            <CheckCircle2 size={16} /> Đúng giờ: {presentCount}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: 'var(--warning-light)', color: 'var(--warning-text)', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.85rem' }}>
            <Clock size={16} /> Đi muộn: {lateCount}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: 'var(--danger-light)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.85rem' }}>
            <XCircle size={16} /> Nghỉ phép: {absentCount}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar-card">
        <div className="search-box">
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Tìm theo tên, mã NV hoặc phòng ban..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái điểm danh</option>
            <option value="present">Đúng giờ</option>
            <option value="late">Đi muộn</option>
            <option value="absent">Vắng / Nghỉ</option>
          </select>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="attendance-table-wrap">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Nhân viên</th>
              <th>Phòng ban & Chức vụ</th>
              <th>Trạng thái chấm công</th>
              <th style={{ textAlign: 'center' }}>Thao tác nhanh</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp) => {
              const status = attendanceData[emp.id] || 'present';
              const deptColor = getDepartmentColor(emp.department);

              return (
                <tr key={emp.id}>
                  <td>
                    <div className="employee-cell">
                      <img
                        src={emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                        alt={emp.name}
                        className="table-avatar"
                      />
                      <div>
                        <div className="emp-name">{emp.name}</div>
                        <div className="emp-id-sub">{emp.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.position}</div>
                    <div style={{ fontSize: '0.775rem', color: deptColor, fontWeight: 600 }}>{emp.department}</div>
                  </td>
                  <td>
                    {status === 'present' && (
                      <span className="badge badge-success">
                        <CheckCircle2 size={13} /> Có mặt đúng giờ
                      </span>
                    )}
                    {status === 'late' && (
                      <span className="badge badge-warning">
                        <Clock size={13} /> Đi muộn (15p)
                      </span>
                    )}
                    {status === 'absent' && (
                      <span className="badge badge-danger">
                        <XCircle size={13} /> Vắng / Nghỉ phép
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        className={`attendance-status-btn ${status === 'present' ? 'present' : ''}`}
                        onClick={() => handleToggleStatus(emp.id, 'present')}
                        title="Đánh dấu đúng giờ"
                      >
                        Đúng giờ
                      </button>
                      <button
                        className={`attendance-status-btn ${status === 'late' ? 'late' : ''}`}
                        onClick={() => handleToggleStatus(emp.id, 'late')}
                        title="Đánh dấu đi muộn"
                      >
                        Đi muộn
                      </button>
                      <button
                        className={`attendance-status-btn ${status === 'absent' ? 'absent' : ''}`}
                        onClick={() => handleToggleStatus(emp.id, 'absent')}
                        title="Đánh dấu nghỉ phép"
                      >
                        Nghỉ phép
                      </button>
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
