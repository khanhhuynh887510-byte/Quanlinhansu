import React from 'react';
import { UserPlus, Calendar, ChevronRight } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export const RecentActivity = ({ employees, onSelectEmployee }) => {
  // Sort by joinDate descending
  const recentEmployees = [...employees]
    .sort((a, b) => new Date(b.joinDate || '2000-01-01') - new Date(a.joinDate || '2000-01-01'))
    .slice(0, 5);

  return (
    <div className="recent-card" id="recent-employees-card">
      <div className="card-header">
        <h3 className="card-title">
          <UserPlus size={20} color="var(--primary)" />
          <span>Nhân Sự Mới Gia Nhập</span>
        </h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Gần đây nhất
        </span>
      </div>

      <div className="activity-list">
        {recentEmployees.map((emp) => (
          <div
            key={emp.id}
            className="activity-item"
            style={{ cursor: 'pointer' }}
            onClick={() => onSelectEmployee(emp)}
            title="Nhấn để xem chi tiết hồ sơ"
          >
            <img
              src={emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
              alt={emp.name}
              className="activity-avatar"
            />
            <div className="activity-details">
              <p className="activity-name">{emp.name}</p>
              <p className="activity-role">
                {emp.position} • {emp.department}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <Calendar size={13} />
              <span>{formatDate(emp.joinDate)}</span>
              <ChevronRight size={16} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
