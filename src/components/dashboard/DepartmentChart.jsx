import React from 'react';
import { PieChart } from 'lucide-react';
import { getDepartmentColor } from '../../utils/formatters';

export const DepartmentChart = ({ employees, departments }) => {
  const total = employees.length || 1;

  const departmentCounts = departments.map(dept => {
    const count = employees.filter(e => e.department === dept.name).length;
    const percentage = Math.round((count / total) * 100);
    return {
      ...dept,
      count,
      percentage
    };
  }).sort((a, b) => b.count - a.count);

  return (
    <div className="chart-card" id="department-distribution-chart">
      <div className="card-header">
        <h3 className="card-title">
          <PieChart size={20} color="var(--primary)" />
          <span>Phân Bổ Nhân Sự Theo Phòng Ban</span>
        </h3>
        <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
          {employees.length} nhân viên
        </span>
      </div>

      <div className="dept-chart-list">
        {departmentCounts.map((dept) => {
          const color = dept.color || getDepartmentColor(dept.name);
          return (
            <div key={dept.id} className="dept-bar-item">
              <div className="dept-bar-info">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: color
                    }}
                  />
                  {dept.name}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  <strong>{dept.count}</strong> người ({dept.percentage}%)
                </span>
              </div>
              <div className="dept-progress-bg">
                <div
                  className="dept-progress-fill"
                  style={{
                    width: `${dept.percentage}%`,
                    backgroundColor: color
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
