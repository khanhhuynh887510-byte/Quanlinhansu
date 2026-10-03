import { INITIAL_EMPLOYEES } from '../data/initialEmployees';

const EMPLOYEES_KEY = 'hrpro_employees_v1';
const THEME_KEY = 'hrpro_theme_v1';

export const loadEmployees = () => {
  try {
    const saved = localStorage.getItem(EMPLOYEES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading employees from localStorage:', err);
  }
  // Fallback to initial employees
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(INITIAL_EMPLOYEES));
  return INITIAL_EMPLOYEES;
};

export const saveEmployees = (employees) => {
  try {
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
  } catch (err) {
    console.error('Error saving employees to localStorage:', err);
  }
};

export const resetEmployees = () => {
  try {
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(INITIAL_EMPLOYEES));
    return INITIAL_EMPLOYEES;
  } catch (err) {
    console.error('Error resetting employees:', err);
    return INITIAL_EMPLOYEES;
  }
};

export const loadTheme = () => {
  return localStorage.getItem(THEME_KEY) || 'light';
};

export const saveTheme = (theme) => {
  localStorage.setItem(THEME_KEY, theme);
};

export const exportEmployeesToCSV = (employees) => {
  if (!employees || employees.length === 0) return;
  
  // Headers in Vietnamese
  const headers = ['Mã NV', 'Họ và tên', 'Email', 'Số điện thoại', 'Phòng ban', 'Chức vụ', 'Mức lương (VNĐ)', 'Trạng thái', 'Ngày vào làm', 'Ngày sinh', 'Giới tính', 'Địa chỉ'];
  const rows = employees.map(e => [
    `"${e.id || ''}"`,
    `"${(e.name || '').replace(/"/g, '""')}"`,
    `"${e.email || ''}"`,
    `"${e.phone || ''}"`,
    `"${e.department || ''}"`,
    `"${e.position || ''}"`,
    e.salary || 0,
    `"${e.status || ''}"`,
    `"${e.joinDate || ''}"`,
    `"${e.dob || ''}"`,
    `"${e.gender || ''}"`,
    `"${(e.address || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Danh_sach_nhan_su_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
