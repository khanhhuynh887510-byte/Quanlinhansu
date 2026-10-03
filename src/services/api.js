// API Service giao tiếp với MySQL Backend qua Express API

const API_BASE = '/api';

async function handleResponse(res) {
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Lỗi HTTP ${res.status}`);
    }
    return data;
  }
  if (!res.ok) {
    throw new Error(`Lỗi kết nối máy chủ HTTP ${res.status}`);
  }
  return null;
}

export const api = {
  // 1. Kiểm tra kết nối
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return await handleResponse(res);
    } catch (err) {
      return { success: false, database: 'disconnected', error: err.message };
    }
  },

  // 2. Nhân viên (Employees)
  async getEmployees() {
    const res = await fetch(`${API_BASE}/employees`);
    const result = await handleResponse(res);
    return result?.data || [];
  },

  async getEmployeeById(id) {
    const res = await fetch(`${API_BASE}/employees/${encodeURIComponent(id)}`);
    const result = await handleResponse(res);
    return result?.data;
  },

  async createEmployee(employeeData) {
    const res = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employeeData)
    });
    const result = await handleResponse(res);
    // Trả cả result để caller đọc account_created
    return result;
  },


  async updateEmployee(id, employeeData) {
    const res = await fetch(`${API_BASE}/employees/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employeeData)
    });
    const result = await handleResponse(res);
    // Trả cả result để caller biết username_updated
    return result;
  },

  async deleteEmployee(id) {
    const res = await fetch(`${API_BASE}/employees/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return await handleResponse(res);
  },

  async updateEmployeeProfile(id, profileData) {
    const res = await fetch(`${API_BASE}/employees/${encodeURIComponent(id)}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
    const result = await handleResponse(res);
    return result?.data;
  },

  // 3. Phòng ban (Departments)
  async getDepartments() {
    const res = await fetch(`${API_BASE}/departments`);
    const result = await handleResponse(res);
    return result?.data || [];
  },

  async createDepartment(data) {
    const res = await fetch(`${API_BASE}/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async updateDepartment(id, data) {
    const res = await fetch(`${API_BASE}/departments/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async deleteDepartment(id) {
    const res = await fetch(`${API_BASE}/departments/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return await handleResponse(res);
  },

  // 3.1. Chức vụ (Positions)
  async getPositions() {
    const res = await fetch(`${API_BASE}/positions`);
    const result = await handleResponse(res);
    return result?.data || [];
  },

  async createPosition(data) {
    const res = await fetch(`${API_BASE}/positions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async updatePosition(id, data) {
    const res = await fetch(`${API_BASE}/positions/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async deletePosition(id) {
    const res = await fetch(`${API_BASE}/positions/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return await handleResponse(res);
  },

  // 4. Chấm công (Attendance)
  async getAttendance(date) {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    const res = await fetch(`${API_BASE}/attendance${query}`);
    const result = await handleResponse(res);
    return result?.data || {};
  },

  async getAttendanceByEmployee(employeeId) {
    const res = await fetch(`${API_BASE}/attendance/history/${encodeURIComponent(employeeId)}`);
    const result = await handleResponse(res);
    return result?.data || [];
  },

  async saveAttendance(employeeId, status, date) {
    const res = await fetch(`${API_BASE}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: employeeId,
        status,
        date
      })
    });
    return await handleResponse(res);
  },

  async appealAttendance(data) {
    const res = await fetch(`${API_BASE}/attendance/appeal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async getTodayAttendance(employeeId) {
    const res = await fetch(`${API_BASE}/attendance/today/${encodeURIComponent(employeeId)}`);
    const result = await handleResponse(res);
    return result?.data;
  },

  async checkIn(employeeId) {
    const res = await fetch(`${API_BASE}/attendance/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: employeeId })
    });
    return await handleResponse(res);
  },

  async checkOut(employeeId) {
    const res = await fetch(`${API_BASE}/attendance/check-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: employeeId })
    });
    return await handleResponse(res);
  },


  // 5. Khôi phục dữ liệu mẫu MySQL
  async resetData() {
    const res = await fetch(`${API_BASE}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await handleResponse(res);
    return result?.data || [];
  },

  // 6. Quản lý Lương & Thưởng Phạt (Payroll)
  async getPayroll(month) {
    const query = month ? `?month=${encodeURIComponent(month)}` : '';
    const res = await fetch(`${API_BASE}/payroll${query}`);
    const result = await handleResponse(res);
    return result?.data || [];
  },

  async getPayslip(id) {
    const res = await fetch(`${API_BASE}/payroll/${encodeURIComponent(id)}`);
    const result = await handleResponse(res);
    return result?.data;
  },

  async calculatePayroll(month) {
    const res = await fetch(`${API_BASE}/payroll/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month })
    });
    return await handleResponse(res);
  },

  async updatePayroll(id, data) {
    const res = await fetch(`${API_BASE}/payroll/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async bulkPayPayroll(month) {
    const res = await fetch(`${API_BASE}/payroll/bulk-pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month })
    });
    return await handleResponse(res);
  },

  // 7. Khen thưởng & Kỷ luật (Rewards & Penalties)
  async getRewardsPenalties(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/rewards-penalties${query ? `?${query}` : ''}`);
    const result = await handleResponse(res);
    return result?.data || [];
  },

  async createRewardPenalty(data) {
    const res = await fetch(`${API_BASE}/rewards-penalties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async deleteRewardPenalty(id) {
    const res = await fetch(`${API_BASE}/rewards-penalties/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return await handleResponse(res);
  },

  // 8. Quản lý Nghỉ phép (Leaves)
  async getLeaves(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/leaves${query ? `?${query}` : ''}`);
    const result = await handleResponse(res);
    return result?.data || [];
  },

  async createLeave(data) {
    const res = await fetch(`${API_BASE}/leaves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async updateLeaveStatus(id, status) {
    const res = await fetch(`${API_BASE}/leaves/${encodeURIComponent(id)}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return await handleResponse(res);
  },

  async deleteLeave(id) {
    const res = await fetch(`${API_BASE}/leaves/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return await handleResponse(res);
  },

  // 9. Quản lý Hợp đồng Lao động (Contracts)
  async getContracts(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/contracts${query ? `?${query}` : ''}`);
    const result = await handleResponse(res);
    return result?.data || [];
  },

  async getExpiringContracts() {
    const res = await fetch(`${API_BASE}/contracts/expiring`);
    const result = await handleResponse(res);
    return result?.data || [];
  },

  async createContract(data) {
    const res = await fetch(`${API_BASE}/contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async updateContract(id, data) {
    const res = await fetch(`${API_BASE}/contracts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async deleteContract(id) {
    const res = await fetch(`${API_BASE}/contracts/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return await handleResponse(res);
  },

  // 10. Xác thực & Tài khoản (Auth)
  async login(username, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const result = await handleResponse(res);
    return result?.data;
  },

  async register(data) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await handleResponse(res);
    return result?.data;
  },

  async getUsers() {
    const res = await fetch(`${API_BASE}/auth/users`);
    const result = await handleResponse(res);
    return result?.data || [];
  },

  async getUnregisteredEmployees() {
    const res = await fetch(`${API_BASE}/auth/unregistered-employees`);
    const result = await handleResponse(res);
    return result?.data || [];
  },

  async changePassword(data) {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async resetUserPassword(userId, newPassword = '123') {
    const res = await fetch(`${API_BASE}/auth/users/${encodeURIComponent(userId)}/reset-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword })
    });
    return await handleResponse(res);
  },

  async deleteUser(userId) {
    const res = await fetch(`${API_BASE}/auth/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE'
    });
    return await handleResponse(res);
  },

  async toggleUserStatus(userId) {
    const res = await fetch(`${API_BASE}/auth/users/${encodeURIComponent(userId)}/toggle-status`, {
      method: 'PUT'
    });
    return await handleResponse(res);
  },

  async updateUserRole(userId, role) {
    const res = await fetch(`${API_BASE}/auth/users/${encodeURIComponent(userId)}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    return await handleResponse(res);
  },

  // 10.0. Quản lý Phòng ban & Chức vụ (Departments & Positions)
  async getDepartments() {
    const res = await fetch(`${API_BASE}/departments`);
    const result = await handleResponse(res);
    return result?.data || [];
  },

  async createDepartment(data) {
    const res = await fetch(`${API_BASE}/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async updateDepartment(id, data) {
    const res = await fetch(`${API_BASE}/departments/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async deleteDepartment(id) {
    const res = await fetch(`${API_BASE}/departments/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return await handleResponse(res);
  },

  async getPositions() {
    const res = await fetch(`${API_BASE}/positions`);
    const result = await handleResponse(res);
    return result?.data || [];
  },

  async createPosition(data) {
    const res = await fetch(`${API_BASE}/positions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async updatePosition(id, data) {
    const res = await fetch(`${API_BASE}/positions/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async deletePosition(id) {
    const res = await fetch(`${API_BASE}/positions/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return await handleResponse(res);
  },

  // 10.1. Điều chuyển & Thăng chức (Transfers / DieuChuyenNhanVien)
  async getTransfers() {
    const res = await fetch(`${API_BASE}/transfers`);
    const result = await handleResponse(res);
    return result?.data || [];
  },

  async getTransferStats() {
    const res = await fetch(`${API_BASE}/transfers/stats`);
    const result = await handleResponse(res);
    return result?.data || { total: 0, thisMonth: 0, topDepartments: [] };
  },

  async getTransferById(id) {
    const res = await fetch(`${API_BASE}/transfers/${encodeURIComponent(id)}`);
    const result = await handleResponse(res);
    return result?.data;
  },

  async getEmployeeTransfers(employeeId) {
    const res = await fetch(`${API_BASE}/transfers/employee/${encodeURIComponent(employeeId)}`);
    const result = await handleResponse(res);
    return result?.data || [];
  },

  async createTransfer(data) {
    const res = await fetch(`${API_BASE}/transfers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async updateTransfer(id, data) {
    const res = await fetch(`${API_BASE}/transfers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async deleteTransfer(id) {
    const res = await fetch(`${API_BASE}/transfers/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return await handleResponse(res);
  },

  // Alias Tiếng Việt cho Bảng DieuChuyenNhanVien
  async getDieuChuyen() {
    return this.getTransfers();
  },

  async getDieuChuyenNhanVien(empId) {
    return empId ? this.getEmployeeTransfers(empId) : this.getTransfers();
  },

  async createDieuChuyen(data) {
    return this.createTransfer(data);
  },

  // 10.2. Quản lý Đào tạo & Phát triển (Courses & Training)
  async getCourses() {
    const res = await fetch(`${API_BASE}/courses`);
    const result = await handleResponse(res);
    return result?.data || [];
  },

  async getCourseById(id) {
    const res = await fetch(`${API_BASE}/courses/${encodeURIComponent(id)}`);
    const result = await handleResponse(res);
    return result?.data;
  },

  async createCourse(data) {
    const res = await fetch(`${API_BASE}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async updateCourse(id, data) {
    const res = await fetch(`${API_BASE}/courses/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async deleteCourse(id) {
    const res = await fetch(`${API_BASE}/courses/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return await handleResponse(res);
  },

  async getMyCourses(employeeId) {
    const res = await fetch(`${API_BASE}/courses/my-courses/${encodeURIComponent(employeeId)}`);
    const result = await handleResponse(res);
    return result?.data || [];
  },

  async enrollCourse(courseId, data) {
    const res = await fetch(`${API_BASE}/courses/${encodeURIComponent(courseId)}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async updateCourseAttendee(courseId, employeeId, data) {
    const res = await fetch(`${API_BASE}/courses/${encodeURIComponent(courseId)}/attendees/${encodeURIComponent(employeeId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async removeCourseAttendee(courseId, employeeId) {
    const res = await fetch(`${API_BASE}/courses/${encodeURIComponent(courseId)}/attendees/${encodeURIComponent(employeeId)}`, {
      method: 'DELETE'
    });
    return await handleResponse(res);
  },


  // 11. Thông báo thời gian thực (Notifications)
  async getNotifications(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/notifications${query ? `?${query}` : ''}`);
    return await handleResponse(res);
  },

  async sendNotification(data) {
    const res = await fetch(`${API_BASE}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async broadcastNotification(data) {
    const res = await fetch(`${API_BASE}/notifications/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async sendNotificationToEmployee(data) {
    const res = await fetch(`${API_BASE}/notifications/send-to-employee`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async markNotificationRead(id) {
    const res = await fetch(`${API_BASE}/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PUT'
    });
    return await handleResponse(res);
  },

  async markAllNotificationsRead(role, employee_id) {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, employee_id })
    });
    return await handleResponse(res);
  },

  async deleteNotification(id) {
    const res = await fetch(`${API_BASE}/notifications/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return await handleResponse(res);
  },

  async clearAllNotifications(role, employee_id) {
    const res = await fetch(`${API_BASE}/notifications/clear-all`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, employee_id })
    });
    return await handleResponse(res);
  },

  // 12. Báo cáo công việc (Work Reports)
  async getReports(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/reports${query ? `?${query}` : ''}`);
    const result = await handleResponse(res);
    return result?.data || [];
  },

  async createReport(data) {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await handleResponse(res);
  },

  async submitReportFeedback(id, feedback) {
    const res = await fetch(`${API_BASE}/reports/${encodeURIComponent(id)}/feedback`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manager_feedback: feedback })
    });
    return await handleResponse(res);
  },

  async deleteReport(id) {
    const res = await fetch(`${API_BASE}/reports/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return await handleResponse(res);
  }
};
