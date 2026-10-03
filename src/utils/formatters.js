export const formatVND = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const [year, month, day] = dateString.split('-');
    if (!year || !month || !day) return dateString;
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
};

export const getDepartmentColor = (deptName) => {
  const colorMap = {
    'Kỹ thuật & Công nghệ': '#6366f1',
    'Kinh doanh & Bán hàng': '#10b981',
    'Marketing & Truyền thông': '#f59e0b',
    'Quản trị Nhân sự': '#ec4899',
    'Kế toán & Tài chính': '#8b5cf6',
  };
  return colorMap[deptName] || '#64748b';
};

export const getStatusBadgeInfo = (status) => {
  switch (status) {
    case 'Chính thức':
      return { label: 'Chính thức', className: 'badge-success' };
    case 'Thử việc':
      return { label: 'Thử việc', className: 'badge-warning' };
    case 'Tạm nghỉ':
    case 'Nghỉ việc':
      return { label: status, className: 'badge-danger' };
    default:
      return { label: status || 'Không rõ', className: 'badge-neutral' };
  }
};

export const generateNextEmployeeId = (employees) => {
  if (!employees || employees.length === 0) return 'NV001';
  const ids = employees
    .map(e => {
      const match = e.id && e.id.match(/^NV(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => !isNaN(n));
  
  const max = ids.length > 0 ? Math.max(...ids) : 0;
  const nextNum = max + 1;
  return `NV${nextNum.toString().padStart(3, '0')}`;
};
