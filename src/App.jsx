import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Toast } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { StatCards } from './components/dashboard/StatCards';
import { DepartmentChart } from './components/dashboard/DepartmentChart';
import { RecentActivity } from './components/dashboard/RecentActivity';
import { EmployeeList } from './components/employees/EmployeeList';
import { EmployeeModal } from './components/employees/EmployeeModal';
import { EmployeeDetailModal } from './components/employees/EmployeeDetailModal';
import { DepartmentList } from './components/departments/DepartmentList';
import { AttendanceTracker } from './components/attendance/AttendanceTracker';
import { PayrollHub } from './components/payroll/PayrollHub';
import { LeaveManager } from './components/leaves/LeaveManager';
import { ContractManager } from './components/contracts/ContractManager';
import { AdminReportViewer } from './components/reports/AdminReportViewer';
import { TrainingManager } from './components/training/TrainingManager';
import { EmployeePortal } from './components/employee-portal/EmployeePortal';
import { ManagerPortal } from './components/manager/ManagerPortal';
import { LoginModal } from './components/auth/LoginModal';
import { AccountManager } from './components/auth/AccountManager';
import { TransferModal } from './components/employees/TransferModal';
import { TransferHistoryModal } from './components/employees/TransferHistoryModal';
import { TransferManager } from './components/employees/TransferManager';
import { DEPARTMENTS } from './data/initialEmployees';
import { api } from './services/api';
import {
  loadTheme,
  saveTheme,
  exportEmployeesToCSV
} from './utils/storage';

export function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('hr_current_user');
      return saved ? JSON.parse(saved) : { username: 'admin', role: 'admin', employee_name: 'Admin HR' };
    } catch {
      return { username: 'admin', role: 'admin', employee_name: 'Admin HR' };
    }
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [departmentsList, setDepartmentsList] = useState(DEPARTMENTS);
  const [positionsList, setPositionsList] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState('connecting'); // 'connecting' | 'connected' | 'error'
  const [dbName, setDbName] = useState('quan_li_nhan_su');

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem('hr_current_user');
      const user = saved ? JSON.parse(saved) : null;
      if (user?.role === 'employee') return 'emp_dashboard';
      if (user?.role === 'manager') return 'mgr_dashboard';
      return 'dashboard';
    } catch {
      return 'dashboard';
    }
  });
  const [theme, setTheme] = useState(loadTheme);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState(null);
  const [detailEmployee, setDetailEmployee] = useState(null);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isTransferHistoryModalOpen, setIsTransferHistoryModalOpen] = useState(false);
  const [selectedTransferEmp, setSelectedTransferEmp] = useState(null);
  const [selectedTransferEmpId, setSelectedTransferEmpId] = useState(null);

  // Toast state
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Theme synchronization with HTML tag
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveTheme(theme);
  }, [theme]);

  // Khởi tạo tải dữ liệu từ MySQL Backend
  const loadDatabaseData = useCallback(async () => {
    setIsLoading(true);
    try {
      const health = await api.checkHealth();
      if (health.database === 'connected') {
        setDbStatus('connected');
        if (health.currentDatabase) setDbName(health.currentDatabase);

        // Lấy danh sách nhân viên, điểm danh, phòng ban & chức vụ từ MySQL
        const [emps, att, depts, pos] = await Promise.all([
          api.getEmployees(),
          api.getAttendance(),
          api.getDepartments().catch(() => DEPARTMENTS),
          api.getPositions().catch(() => [])
        ]);
        setEmployees(emps || []);
        setAttendanceData(att || {});
        if (depts && depts.length > 0) setDepartmentsList(depts);
        if (pos && pos.length > 0) setPositionsList(pos);
      } else {
        throw new Error(health.error || 'Cơ sở dữ liệu MySQL không phản hồi');
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu từ MySQL:', err);
      setDbStatus('error');
      addToast(`Không thể kết nối cơ sở dữ liệu MySQL: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadDatabaseData();
  }, [loadDatabaseData]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Xử lý chuyển đổi tài khoản thành công
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('hr_current_user', JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }

    if (user.role === 'employee') {
      setActiveTab('emp_dashboard');
    } else if (user.role === 'manager') {
      setActiveTab('mgr_dashboard');
    } else {
      setActiveTab('dashboard');
    }
    // Tải lại dữ liệu nhân sự để cập nhật nhân viên mới tự đăng ký
    loadDatabaseData();
    addToast(`Đăng nhập thành công! Xin chào ${user.employee_name || user.username}`, 'success');
  };

  // CRUD Handlers với MySQL
  const handleOpenAddModal = () => {
    setEmployeeToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (emp) => {
    setEmployeeToEdit(emp);
    setIsFormModalOpen(true);
  };

  const handleSaveEmployee = async (empData) => {
    try {
      if (employeeToEdit) {
        // Cập nhật vào MySQL
        const result = await api.updateEmployee(empData.id, empData);
        const updated = result?.data || result;
        setEmployees(prev =>
          prev.map(emp => (emp.id === updated.id ? updated : emp))
        );

        // Nếu nhân viên vừa sửa chính là người đang đăng nhập → sync currentUser ngay
        if (currentUser?.employee_id === updated.id) {
          const syncedUser = {
            ...currentUser,
            employee_name: updated.name || currentUser.employee_name,
            employee_avatar: updated.avatar || currentUser.employee_avatar,
            employee_email: updated.email || currentUser.employee_email,
            employee_department: updated.department || currentUser.employee_department,
            employee_position: updated.position || currentUser.employee_position,
            employee_phone: updated.phone || currentUser.employee_phone,
            // Nếu username cũng được đổi theo email
            ...(result?.username_updated ? { username: result.username_updated.newUsername } : {})
          };
          setCurrentUser(syncedUser);
          try { localStorage.setItem('hr_current_user', JSON.stringify(syncedUser)); } catch {}
        }

        // Kiểm tra nếu tên đăng nhập cũng bị đổi theo email
        if (result?.username_updated) {
          const { oldUsername, newUsername } = result.username_updated;
          addToast(
            `⚠️ Tên đăng nhập của ${empData.name} đã đổi từ "${oldUsername}" → "${newUsername}". Thông báo cho nhân viên đăng nhập lại bằng tài khoản mới!`,
            'warning'
          );
        } else {
          addToast(`Đã lưu cập nhật nhân viên ${empData.name} vào MySQL!`, 'success');
        }
      } else {
        // Thêm mới vào MySQL
        const result = await api.createEmployee(empData);
        const created = result?.data || result;
        setEmployees(prev => [created, ...prev]);

        // Thông báo tài khoản tự động tạo
        if (result?.account_created) {
          const { username, password } = result.account_created;
          addToast(
            `🎉 Thêm ${empData.name} thành công! Tài khoản tự động tạo: "${username}" / MK: "${password}". Vào Quản lý tài khoản để đổi mật khẩu.`,
            'info'
          );
        } else {
          addToast(`Thêm nhân viên ${empData.name} (${created.id}) vào MySQL thành công!`, 'success');
        }


        // Confetti effect
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {
          // Confetti optional
        }
      }
      setIsFormModalOpen(false);
      setEmployeeToEdit(null);
    } catch (error) {
      console.error('Lỗi khi lưu nhân viên:', error);
      addToast(error.message || 'Lỗi khi lưu dữ liệu nhân viên vào MySQL', 'error');
    }
  };


  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;
    const name = employeeToDelete.name;
    const empId = employeeToDelete.id;
    try {
      await api.deleteEmployee(empId);
      setEmployees(prev => prev.filter(emp => emp.id !== empId));
      setEmployeeToDelete(null);
      addToast(`Đã xóa nhân viên ${name} (${empId}) khỏi cơ sở dữ liệu MySQL`, 'info');
    } catch (error) {
      console.error('Lỗi khi xóa nhân viên:', error);
      addToast(error.message || 'Lỗi khi xóa nhân viên khỏi MySQL', 'error');
    }
  };

  const handleResetData = async () => {
    try {
      setIsLoading(true);
      const resetEmps = await api.resetData();
      setEmployees(resetEmps);
      const att = await api.getAttendance();
      setAttendanceData(att || {});
      addToast('Đã khôi phục dữ liệu mẫu ban đầu trong cơ sở dữ liệu MySQL!', 'info');
    } catch (error) {
      console.error('Lỗi khi khôi phục dữ liệu:', error);
      addToast(error.message || 'Lỗi khi khôi phục dữ liệu', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAttendance = async (empId, newStatus) => {
    setAttendanceData(prev => ({
      ...prev,
      [empId]: newStatus
    }));

    try {
      await api.saveAttendance(empId, newStatus);
    } catch (error) {
      console.error('Lỗi lưu điểm danh:', error);
      addToast('Không thể lưu trạng thái điểm danh vào MySQL', 'error');
    }
  };

  const handleExportCSV = () => {
    exportEmployeesToCSV(employees);
    addToast('Đã tải xuống danh sách nhân sự định dạng CSV!', 'success');
  };

  const handleNavigateToDepartment = (deptName) => {
    setSelectedDeptFilter(deptName);
    setActiveTab('employees');
  };

  const isEmployeeRole = currentUser?.role === 'employee';
  const isManagerRole = currentUser?.role === 'manager';

  return (
    <div className="app-container">
      {/* Toast notifications */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        employeeCount={employees.length}
        onResetData={handleResetData}
        onExportCSV={handleExportCSV}
        currentUser={currentUser}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
      />

      {/* Main Layout Area */}
      <div className="main-content">
        <Navbar
          activeTab={activeTab}
          theme={theme}
          toggleTheme={toggleTheme}
          onOpenAddModal={handleOpenAddModal}
          dbStatus={dbStatus}
          dbName={dbName}
          currentUser={currentUser}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onNavigate={(tab) => setActiveTab(tab)}
        />

        <main className="content-body">
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
              <div className="status-indicator-dot" style={{ width: '16px', height: '16px', background: 'var(--primary)', marginBottom: '16px' }}></div>
              <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Đang tải dữ liệu từ cơ sở dữ liệu MySQL...</p>
            </div>
          ) : isEmployeeRole ? (
            /* ========================================================
               GIAO DIỆN CỔNG THÔNG TIN NHÂN VIÊN (EMPLOYEE PORTAL)
               ======================================================== */
            <EmployeePortal
              currentUser={currentUser}
              onShowToast={addToast}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onUpdateCurrentUser={(patch) => {
                const syncedUser = { ...currentUser, ...patch };
                setCurrentUser(syncedUser);
                try { localStorage.setItem('hr_current_user', JSON.stringify(syncedUser)); } catch {}
              }}
            />
          ) : isManagerRole ? (
            /* ========================================================
               GIAO DIỆN TRƯỞNG PHÒNG (MANAGER PORTAL)
               ======================================================== */
            <ManagerPortal
              currentUser={currentUser}
              onShowToast={addToast}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              employees={employees}
            />
          ) : (
            /* ========================================================
               GIAO DIỆN QUẢN TRỊ VIÊN (ADMIN DASHBOARD & HUBS)
               ======================================================== */
            <>
              {/* TAB 1: DASHBOARD */}
              {activeTab === 'dashboard' && (
                <div id="dashboard-view">
                  <StatCards employees={employees} departments={DEPARTMENTS} />
                  
                  <div className="dashboard-grid">
                    <DepartmentChart employees={employees} departments={DEPARTMENTS} />
                    <RecentActivity
                      employees={employees}
                      onSelectEmployee={(emp) => setDetailEmployee(emp)}
                    />
                  </div>

                  {/* Quick View Table of Top Employees */}
                  <div style={{ marginTop: '28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        Nhân Sự Tiêu Biểu Toàn Công Ty
                      </h3>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setActiveTab('employees')}
                      >
                        Xem tất cả ({employees.length})
                      </button>
                    </div>
                    <EmployeeList
                      employees={employees.slice(0, 5)}
                      onViewEmployee={(emp) => setDetailEmployee(emp)}
                      onEditEmployee={handleOpenEditModal}
                      onDeleteEmployee={(emp) => setEmployeeToDelete(emp)}
                      onOpenAddModal={handleOpenAddModal}
                      selectedDepartmentFilter={selectedDeptFilter}
                      setSelectedDepartmentFilter={setSelectedDeptFilter}
                      onOpenTransfer={(emp) => {
                        setSelectedTransferEmp(emp || null);
                        setIsTransferModalOpen(true);
                      }}
                      onOpenTransferHistory={(empId) => {
                        setSelectedTransferEmpId(empId || null);
                        setIsTransferHistoryModalOpen(true);
                      }}
                      isAdmin={currentUser?.role === 'admin'}
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: EMPLOYEES */}
              {activeTab === 'employees' && (
                <EmployeeList
                  employees={employees}
                  onViewEmployee={(emp) => setDetailEmployee(emp)}
                  onEditEmployee={handleOpenEditModal}
                  onDeleteEmployee={(emp) => setEmployeeToDelete(emp)}
                  onOpenAddModal={handleOpenAddModal}
                  selectedDepartmentFilter={selectedDeptFilter}
                  setSelectedDepartmentFilter={setSelectedDeptFilter}
                  onOpenTransfer={(emp) => {
                    setSelectedTransferEmp(emp || null);
                    setIsTransferModalOpen(true);
                  }}
                  onOpenTransferHistory={(empId) => {
                    setSelectedTransferEmpId(empId || null);
                    setIsTransferHistoryModalOpen(true);
                  }}
                  isAdmin={currentUser?.role === 'admin'}
                />
              )}

              {/* TAB 2.5: ĐIỀU CHUYỂN & THĂNG CHỨC (BẢNG DIEUCHUYENNHANVIEN) */}
              {activeTab === 'transfers' && (
                <TransferManager
                  employees={employees}
                  currentUser={currentUser}
                  onShowToast={addToast}
                  departments={departmentsList}
                  positions={positionsList}
                  onRefreshEmployees={loadDatabaseData}
                />
              )}

              {/* TAB 3: DEPARTMENTS */}
              {activeTab === 'departments' && (
                <DepartmentList
                  departments={departmentsList}
                  employees={employees}
                  onSelectDepartment={handleNavigateToDepartment}
                  currentUser={currentUser}
                  onShowToast={addToast}
                />
              )}

              {/* TAB 4: ATTENDANCE */}
              {activeTab === 'attendance' && (
                <AttendanceTracker
                  employees={employees}
                  attendanceData={attendanceData}
                  onToggleStatus={handleToggleAttendance}
                />
              )}

              {/* TAB 5: PAYROLL & BONUSES/PENALTIES */}
              {activeTab === 'payroll' && (
                <PayrollHub
                  employees={employees}
                  onShowToast={addToast}
                />
              )}

              {/* TAB 6: LEAVE MANAGEMENT */}
              {activeTab === 'leaves' && (
                <LeaveManager
                  employees={employees}
                  onShowToast={addToast}
                />
              )}

              {/* TAB 7: CONTRACT MANAGEMENT */}
              {activeTab === 'contracts' && (
                <ContractManager
                  employees={employees}
                  onShowToast={addToast}
                />
              )}

              {/* TAB 8: WORK REPORTS FROM EMPLOYEES */}
              {activeTab === 'reports' && (
                <AdminReportViewer
                  employees={employees}
                  onShowToast={addToast}
                />
              )}

              {/* TAB 9: ACCOUNT MANAGEMENT */}
              {activeTab === 'accounts' && (
                <AccountManager
                  employees={employees}
                  onShowToast={addToast}
                />
              )}

              {/* TAB 10: ĐÀO TẠO & PHÁT TRIỂN */}
              {activeTab === 'training' && (
                <TrainingManager
                  employees={employees}
                  onShowToast={addToast}
                  currentUser={currentUser}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* MODAL: Đăng nhập & Đăng ký đa tài khoản */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        employees={employees}
      />

      {/* MODAL: Thêm / Sửa nhân viên */}
      <EmployeeModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEmployeeToEdit(null);
        }}
        onSubmit={handleSaveEmployee}
        employeeToEdit={employeeToEdit}
        allEmployees={employees}
      />

      {/* MODAL: Xem chi tiết hồ sơ */}
      <EmployeeDetailModal
        isOpen={!!detailEmployee}
        employee={detailEmployee}
        onClose={() => setDetailEmployee(null)}
        onEdit={(emp) => {
          setDetailEmployee(null);
          handleOpenEditModal(emp);
        }}
        onDelete={(emp) => {
          setDetailEmployee(null);
          setEmployeeToDelete(emp);
        }}
        onOpenTransfer={(emp) => {
          setDetailEmployee(null);
          setSelectedTransferEmp(emp || null);
          setIsTransferModalOpen(true);
        }}
        onViewTransferHistory={(empId) => {
          setDetailEmployee(null);
          setSelectedTransferEmpId(empId || null);
          setIsTransferHistoryModalOpen(true);
        }}
        isAdmin={currentUser?.role === 'admin'}
      />

      {/* MODAL: Xác nhận xóa nhân viên */}
      <ConfirmModal
        isOpen={!!employeeToDelete}
        title="Xác Nhận Xóa Nhân Viên"
        message={
          employeeToDelete
            ? `Bạn có chắc chắn muốn xóa nhân viên "${employeeToDelete.name}" (${employeeToDelete.id})? Dữ liệu sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu MySQL.`
            : ''
        }
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        onConfirm={handleConfirmDelete}
        onCancel={() => setEmployeeToDelete(null)}
      />

      {/* MODAL: Điều chuyển nhân sự */}
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setSelectedTransferEmp(null);
        }}
        employees={employees}
        departments={departmentsList}
        positions={positionsList}
        selectedEmployee={selectedTransferEmp}
        currentUser={currentUser}
        onShowToast={addToast}
        onSuccess={() => {
          loadDatabaseData();
          addToast('Thực hiện quyết định điều chuyển nhân sự thành công!', 'success');
        }}
      />

      {/* MODAL: Lịch sử điều chuyển */}
      <TransferHistoryModal
        isOpen={isTransferHistoryModalOpen}
        onClose={() => {
          setIsTransferHistoryModalOpen(false);
          setSelectedTransferEmpId(null);
        }}
        employeeId={selectedTransferEmpId}
        onShowToast={addToast}
        isAdmin={currentUser?.role === 'admin'}
      />
    </div>
  );
}

export default App;
