// Tiện ích lọc theo Ngày, Giờ, Tuần, Tháng, Năm dùng chung cho các phân hệ

export const formatLocalDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayStr = () => formatLocalDate(new Date());

export const getCurrentMonthStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const getCurrentYearStr = () => String(new Date().getFullYear());

// Lấy thứ Hai của tuần hiện tại
export const getMondayOfWeek = (d = new Date()) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Thứ 2
  return new Date(date.setDate(diff));
};

// Lấy Chủ Nhật của tuần hiện tại
export const getSundayOfWeek = (d = new Date()) => {
  const monday = getMondayOfWeek(d);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
};

// Tính toán khoảng ngày theo Preset: 'all' | 'today' | 'week' | 'month' | 'year' | 'custom'
export const getPresetDateRange = (preset, customFrom = '', customTo = '', targetMonth = '') => {
  const now = new Date();
  switch (preset) {
    case 'today': {
      const today = getTodayStr();
      return { start: today, end: today, label: 'Hôm nay' };
    }
    case 'week': {
      const mon = formatLocalDate(getMondayOfWeek(now));
      const sun = formatLocalDate(getSundayOfWeek(now));
      return { start: mon, end: sun, label: 'Tuần này' };
    }
    case 'month': {
      const mStr = targetMonth || getCurrentMonthStr();
      const [y, m] = mStr.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      return {
        start: `${mStr}-01`,
        end: `${mStr}-${String(lastDay).padStart(2, '0')}`,
        label: `Tháng ${m}/${y}`
      };
    }
    case 'year': {
      const y = now.getFullYear();
      return { start: `${y}-01-01`, end: `${y}-12-31`, label: `Năm ${y}` };
    }
    case 'custom': {
      return {
        start: customFrom || '1970-01-01',
        end: customTo || '2099-12-31',
        label: 'Tùy chỉnh'
      };
    }
    case 'all':
    default:
      return { start: null, end: null, label: 'Toàn bộ thời gian' };
  }
};

// Kiểm tra 1 ngày cụ thể có nằm trong khoảng [start, end]
export const isDateInRange = (dateStr, start, end) => {
  if (!start && !end) return true;
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
};

// Kiểm tra khoảng ngày [from, to] có giao thoa với khoảng lọc [start, end] (Dùng cho Nghỉ phép)
export const isDateOverlap = (itemFromStr, itemToStr, filterStart, filterEnd) => {
  if (!filterStart && !filterEnd) return true;
  const from = (itemFromStr || '').slice(0, 10);
  const to = (itemToStr || from).slice(0, 10);

  if (filterStart && to < filterStart) return false;
  if (filterEnd && from > filterEnd) return false;
  return true;
};
