import React from 'react';
import { Users, UserCheck, Clock, Building2, Wallet } from 'lucide-react';
import { formatVND } from '../../utils/formatters';

export const StatCards = ({ employees, departments }) => {
  const totalEmployees = employees.length;
  const officialEmployees = employees.filter(e => e.status === 'Chính thức').length;
  const probationEmployees = employees.filter(e => e.status === 'Thử việc').length;
  const totalPayroll = employees.reduce((sum, e) => sum + (Number(e.salary) || 0), 0);

  const stats = [
    {
      label: 'Tổng số nhân sự',
      value: totalEmployees,
      sub: 'Đang hoạt động trong hệ thống',
      icon: Users,
      accent: '#4f46e5',
      iconBg: 'rgba(79, 70, 229, 0.12)',
      iconColor: '#4f46e5'
    },
    {
      label: 'Nhân viên chính thức',
      value: officialEmployees,
      sub: `${Math.round((officialEmployees / (totalEmployees || 1)) * 100)}% tổng quy mô`,
      icon: UserCheck,
      accent: '#10b981',
      iconBg: 'rgba(16, 185, 129, 0.12)',
      iconColor: '#10b981'
    },
    {
      label: 'Nhân sự thử việc',
      value: probationEmployees,
      sub: 'Cần đánh giá định kỳ',
      icon: Clock,
      accent: '#f59e0b',
      iconBg: 'rgba(245, 158, 11, 0.12)',
      iconColor: '#f59e0b'
    },
    {
      label: 'Phòng ban chuyên môn',
      value: departments.length,
      sub: 'Các đơn vị nghiệp vụ',
      icon: Building2,
      accent: '#8b5cf6',
      iconBg: 'rgba(139, 92, 246, 0.12)',
      iconColor: '#8b5cf6'
    },
    {
      label: 'Tổng quỹ lương / Tháng',
      value: formatVND(totalPayroll),
      sub: 'Ước tính lương cơ bản',
      icon: Wallet,
      accent: '#0ea5e9',
      iconBg: 'rgba(14, 165, 233, 0.12)',
      iconColor: '#0ea5e9'
    }
  ];

  return (
    <div className="stats-grid" id="dashboard-stats-grid">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className="stat-card"
            style={{ '--card-accent': stat.accent }}
          >
            <div className="stat-content">
              <p className="stat-label">{stat.label}</p>
              <h3 className="stat-value">{stat.value}</h3>
              <span className="stat-sub">{stat.sub}</span>
            </div>
            <div
              className="stat-icon"
              style={{
                backgroundColor: stat.iconBg,
                color: stat.iconColor
              }}
            >
              <Icon size={24} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
