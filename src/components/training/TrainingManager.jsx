import React, { useState, useEffect, useMemo } from 'react';
import { 
  GraduationCap, Plus, Search, Filter, Calendar, Users, 
  Award, CheckCircle2, Clock, XCircle, BookOpen, ExternalLink, 
  ChevronRight, Edit, Trash2, UserPlus, Star, DollarSign,
  AlertCircle, ShieldAlert, Sparkles, FileText, Check
} from 'lucide-react';
import { api } from '../../services/api';

export const TrainingManager = ({ employees = [], onShowToast, currentUser }) => {
  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';

  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  
  // Selected course detail
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseAttendees, setCourseAttendees] = useState([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Modals
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState(null);
  const [courseFormData, setCourseFormData] = useState({
    id: '',
    title: '',
    description: '',
    format: 'Trực tiếp',
    instructor: '',
    start_date: '',
    end_date: '',
    budget: 0,
    status: 'upcoming'
  });

  // Modal Add Attendee
  const [isAddAttendeeModalOpen, setIsAddAttendeeModalOpen] = useState(false);
  const [selectedEmpToEnroll, setSelectedEmpToEnroll] = useState('');

  // Modal Grade Attendee
  const [gradingAttendee, setGradingAttendee] = useState(null);
  const [gradeData, setGradeData] = useState({
    status: 'Đạt chứng chỉ',
    score: '',
    certificate_code: ''
  });

  // Load courses
  const loadCourses = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCourses();
      setCourses(data || []);
      if (selectedCourse) {
        // Refresh selected course if any
        const updated = (data || []).find(c => c.id === selectedCourse.id);
        if (updated) loadCourseDetail(updated.id);
      }
    } catch (err) {
      onShowToast?.(`Lỗi khi tải danh sách khóa học: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourseDetail = async (courseId) => {
    setIsDetailLoading(true);
    try {
      const data = await api.getCourseById(courseId);
      if (data) {
        setSelectedCourse(data);
        setCourseAttendees(data.attendees || []);
      }
    } catch (err) {
      onShowToast?.(`Lỗi tải chi tiết khóa học: ${err.message}`, 'error');
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      const matchSearch = (c.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.instructor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.id || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchFormat = formatFilter === 'all' || c.format === formatFilter;
      return matchSearch && matchStatus && matchFormat;
    });
  }, [courses, searchTerm, statusFilter, formatFilter]);

  // Summary statistics
  const stats = useMemo(() => {
    const total = courses.length;
    const inProgress = courses.filter(c => c.status === 'in_progress').length;
    const upcoming = courses.filter(c => c.status === 'upcoming').length;
    const totalBudget = courses.reduce((sum, c) => sum + (Number(c.budget) || 0), 0);
    const totalAttendees = courses.reduce((sum, c) => sum + (Number(c.attendees_count) || 0), 0);
    return { total, inProgress, upcoming, totalBudget, totalAttendees };
  }, [courses]);

  // Open create course modal
  const handleOpenCreateModal = () => {
    setCourseToEdit(null);
    setCourseFormData({
      id: `KH${String(courses.length + 1).padStart(3, '0')}`,
      title: '',
      description: '',
      format: 'Trực tiếp',
      instructor: '',
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      budget: 10000000,
      status: 'upcoming'
    });
    setIsCourseModalOpen(true);
  };

  // Open edit course modal
  const handleOpenEditModal = (course) => {
    setCourseToEdit(course);
    setCourseFormData({
      id: course.id,
      title: course.title,
      description: course.description || '',
      format: course.format || 'Trực tiếp',
      instructor: course.instructor || '',
      start_date: course.start_date || '',
      end_date: course.end_date || '',
      budget: course.budget || 0,
      status: course.status || 'upcoming'
    });
    setIsCourseModalOpen(true);
  };

  // Save course
  const handleSaveCourse = async (e) => {
    e.preventDefault();
    try {
      if (courseToEdit) {
        await api.updateCourse(courseToEdit.id, courseFormData);
        onShowToast?.('Cập nhật khóa học thành công!', 'success');
      } else {
        await api.createCourse(courseFormData);
        onShowToast?.('Tạo khóa học mới thành công!', 'success');
      }
      setIsCourseModalOpen(false);
      loadCourses();
    } catch (err) {
      onShowToast?.(`Lỗi lưu khóa học: ${err.message}`, 'error');
    }
  };

  // Delete course
  const handleDeleteCourse = async (id, title) => {
    if (!window.confirm(`Bạn có chắc muốn xóa khóa học "${title}"? Tất cả dữ liệu học viên liên quan sẽ bị xóa.`)) {
      return;
    }
    try {
      await api.deleteCourse(id);
      onShowToast?.('Đã xóa khóa học thành công!', 'success');
      if (selectedCourse?.id === id) {
        setSelectedCourse(null);
        setCourseAttendees([]);
      }
      loadCourses();
    } catch (err) {
      onShowToast?.(`Lỗi xóa khóa học: ${err.message}`, 'error');
    }
  };

  // Enroll attendee
  const handleEnrollAttendee = async (e) => {
    e.preventDefault();
    if (!selectedEmpToEnroll || !selectedCourse) return;
    try {
      await api.enrollCourse(selectedCourse.id, {
        employee_id: selectedEmpToEnroll,
        status: 'Đang học'
      });
      onShowToast?.('Đã thêm học viên vào khóa học thành công!', 'success');
      setIsAddAttendeeModalOpen(false);
      setSelectedEmpToEnroll('');
      loadCourseDetail(selectedCourse.id);
      loadCourses();
    } catch (err) {
      onShowToast?.(`Lỗi ghi danh học viên: ${err.message}`, 'error');
    }
  };

  // Open grading modal
  const handleOpenGrading = (att) => {
    setGradingAttendee(att);
    setGradeData({
      status: att.status || 'Đạt chứng chỉ',
      score: att.score !== null && att.score !== undefined ? att.score : 9.0,
      certificate_code: att.certificate_code || `CERT-${selectedCourse.id}-${att.employee_id}`
    });
  };

  // Submit grading
  const handleSaveGrading = async (e) => {
    e.preventDefault();
    if (!gradingAttendee || !selectedCourse) return;
    try {
      await api.updateCourseAttendee(selectedCourse.id, gradingAttendee.employee_id, gradeData);
      onShowToast?.('Cập nhật điểm và chứng chỉ thành công!', 'success');
      setGradingAttendee(null);
      loadCourseDetail(selectedCourse.id);
      loadCourses();
    } catch (err) {
      onShowToast?.(`Lỗi cập nhật đánh giá: ${err.message}`, 'error');
    }
  };

  // Remove attendee
  const handleRemoveAttendee = async (empId, empName) => {
    if (!window.confirm(`Hủy ghi danh học viên ${empName} khỏi khóa học này?`)) return;
    try {
      await api.removeCourseAttendee(selectedCourse.id, empId);
      onShowToast?.('Đã xóa học viên khỏi khóa học', 'success');
      loadCourseDetail(selectedCourse.id);
      loadCourses();
    } catch (err) {
      onShowToast?.(`Lỗi xóa học viên: ${err.message}`, 'error');
    }
  };

  const getFormatBadgeColor = (fmt) => {
    switch (fmt) {
      case 'Trực tiếp': return { bg: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' };
      case 'Trực tuyến E-learning': return { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981' };
      case 'Workshop': return { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' };
      default: return { bg: 'rgba(100, 116, 139, 0.12)', color: '#64748b' };
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'upcoming':
        return <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>Sắp diễn ra</span>;
      case 'in_progress':
        return <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>Đang diễn ra</span>;
      case 'completed':
        return <span className="badge" style={{ background: 'rgba(100, 116, 139, 0.12)', color: '#64748b' }}>Đã hoàn thành</span>;
      case 'cancelled':
        return <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>Đã hủy</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="tab-content-container" id="training-manager-view">
      {/* Header Banner */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GraduationCap size={28} style={{ color: 'var(--primary)' }} />
            Quản Lý Đào Tạo & Phát Triển Nhân Lực
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.95rem' }}>
            Lên kế hoạch chương trình đào tạo, tổ chức lớp học, điểm danh và cấp chứng chỉ nâng cao năng lực cho nhân sự.
          </p>
        </div>

        {isAdmin && (
          <button className="btn btn-primary" onClick={handleOpenCreateModal} id="btn-create-course">
            <Plus size={18} />
            <span>Tạo Khóa Học Mới</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="stat-card" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tổng Số Khóa Học</p>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{stats.total}</h3>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
            <Clock size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Đang Giảng Dạy</p>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', margin: 0 }}>{stats.inProgress}</h3>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
            <Users size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Lượt Nhân Viên Đào Tạo</p>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#3b82f6', margin: 0 }}>{stats.totalAttendees}</h3>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tổng Ngân Sách Dự Kiến</p>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b', margin: 0 }}>
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(stats.totalBudget)}
            </h3>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="filter-bar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'center' }}>
        <div className="search-input-wrap" style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            className="input"
            placeholder="Tìm theo tên khóa học, giảng viên, mã khóa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '42px', width: '100%', borderRadius: '12px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <select 
            className="select" 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ borderRadius: '12px', minWidth: '150px' }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="upcoming">Sắp diễn ra</option>
            <option value="in_progress">Đang diễn ra</option>
            <option value="completed">Đã hoàn thành</option>
          </select>

          <select 
            className="select" 
            value={formatFilter} 
            onChange={(e) => setFormatFilter(e.target.value)}
            style={{ borderRadius: '12px', minWidth: '160px' }}
          >
            <option value="all">Tất cả hình thức</option>
            <option value="Trực tiếp">Trực tiếp</option>
            <option value="Trực tuyến E-learning">Trực tuyến E-learning</option>
            <option value="Workshop">Workshop</option>
          </select>
        </div>
      </div>

      {/* Main Content Layout: Course List on Left, Selected Course Detail on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedCourse ? '1fr 1.3fr' : '1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Column: Course Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', background: 'var(--card-bg)', borderRadius: '16px' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Đang tải danh sách khóa học...</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', background: 'var(--card-bg)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
              <GraduationCap size={44} style={{ color: 'var(--text-secondary)', margin: '0 auto 12px', opacity: 0.6 }} />
              <h4 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Không tìm thấy khóa học phù hợp</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Thử thay đổi bộ lọc hoặc thêm khóa đào tạo mới.</p>
            </div>
          ) : (
            filteredCourses.map((c) => {
              const isSelected = selectedCourse?.id === c.id;
              const formatStyle = getFormatBadgeColor(c.format);

              return (
                <div
                  key={c.id}
                  className={`course-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => loadCourseDetail(c.id)}
                  style={{
                    background: 'var(--card-bg)',
                    borderRadius: '16px',
                    padding: '20px',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    boxShadow: isSelected ? '0 8px 24px rgba(99, 102, 241, 0.15)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, padding: '4px 10px', borderRadius: '8px', ...formatStyle }}>
                        {c.format}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        Mã: {c.id}
                      </span>
                    </div>
                    {getStatusBadge(c.status)}
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.4 }}>
                    {c.title}
                  </h3>

                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {c.description || 'Chưa có mô tả chi tiết cho chương trình này.'}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '0.84rem', color: 'var(--text-secondary)', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>Giảng viên:</span> <strong style={{ color: 'var(--text-primary)' }}>{c.instructor}</strong>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600 }}>Thời gian:</span> {c.start_date}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600 }}>Học viên:</span> <strong style={{ color: 'var(--primary)' }}>{c.attendees_count || 0} người</strong>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600 }}>Ngân sách:</span> {new Intl.NumberFormat('vi-VN').format(c.budget)}đ
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed var(--border-color)' }}>
                    {isAdmin && (
                      <>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => { e.stopPropagation(); handleOpenEditModal(c); }}
                          title="Chỉnh sửa khóa học"
                        >
                          <Edit size={14} /> Sửa
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={(e) => { e.stopPropagation(); handleDeleteCourse(c.id, c.title); }}
                          title="Xóa khóa học"
                        >
                          <Trash2 size={14} /> Xóa
                        </button>
                      </>
                    )}
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={(e) => { e.stopPropagation(); loadCourseDetail(c.id); }}
                    >
                      Chi tiết & Học viên <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Selected Course Detail & Attendees */}
        {selectedCourse && (
          <div style={{ background: 'var(--card-bg)', borderRadius: '20px', padding: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                  <span className="badge" style={getFormatBadgeColor(selectedCourse.format)}>
                    {selectedCourse.format}
                  </span>
                  {getStatusBadge(selectedCourse.status)}
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Mã: {selectedCourse.id}</span>
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {selectedCourse.title}
                </h2>
              </div>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedCourse(null)}
              >
                Đóng
              </button>
            </div>

            {/* Course Overview Meta */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: 'var(--input-bg)', padding: '16px', borderRadius: '14px', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Giảng viên / Đơn vị</span>
                <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{selectedCourse.instructor}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Thời gian đào tạo</span>
                <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{selectedCourse.start_date} ➔ {selectedCourse.end_date}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Ngân sách dự kiến</span>
                <p style={{ fontWeight: 700, color: '#f59e0b', marginTop: '2px' }}>
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedCourse.budget)}
                </p>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Mục tiêu & Nội dung khóa học:</h4>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {selectedCourse.description || 'Chưa có mô tả cho khóa học này.'}
              </p>
            </div>

            {/* Attendees Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} style={{ color: 'var(--primary)' }} />
                  Danh Sách Học Viên Tham Gia ({courseAttendees.length})
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Theo dõi kết quả học tập, chấm điểm và cấp chứng chỉ hoàn thành.
                </p>
              </div>

              {(isAdmin || isManager) && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsAddAttendeeModalOpen(true)}
                  id="btn-add-attendee"
                >
                  <UserPlus size={15} />
                  <span>{isManager ? 'Đề cử nhân sự' : 'Ghi danh học viên'}</span>
                </button>
              )}
            </div>

            {/* Attendees List */}
            {isDetailLoading ? (
              <p style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>Đang tải danh sách học viên...</p>
            ) : courseAttendees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', background: 'var(--input-bg)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                <Users size={32} style={{ color: 'var(--text-secondary)', margin: '0 auto 8px', opacity: 0.5 }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Chưa có học viên nào đăng ký khóa học này.</p>
              </div>
            ) : (
              <div className="attendee-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {courseAttendees.map((att) => {
                  const isPassed = att.status === 'Đạt chứng chỉ' || att.status === 'Hoàn thành';
                  const isFailed = att.status === 'Trượt';

                  return (
                    <div
                      key={att.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px 16px',
                        background: 'var(--card-bg)',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={att.employee_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                          alt={att.employee_name}
                          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{att.employee_name}</strong>
                            <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'var(--input-bg)', borderRadius: '6px', color: 'var(--text-secondary)' }}>
                              {att.employee_id}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {att.employee_position} • {att.employee_department}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Status badge */}
                        <div>
                          <span
                            className="badge"
                            style={{
                              background: isPassed ? 'rgba(16, 185, 129, 0.12)' : isFailed ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                              color: isPassed ? '#10b981' : isFailed ? '#ef4444' : '#3b82f6',
                              fontWeight: 700
                            }}
                          >
                            {att.status}
                          </span>
                          {att.score !== null && att.score !== undefined && (
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', textAlign: 'right' }}>
                              Điểm: <span style={{ color: '#6366f1' }}>{att.score}/10</span>
                            </div>
                          )}
                        </div>

                        {/* Certificate code */}
                        {att.certificate_code && (
                          <div style={{ fontSize: '0.78rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '4px 8px', borderRadius: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Award size={13} /> {att.certificate_code}
                          </div>
                        )}

                        {/* Action buttons */}
                        {isAdmin && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenGrading(att)}
                              title="Chấm điểm & Đánh giá"
                              style={{ padding: '6px 10px' }}
                            >
                              <Star size={14} style={{ color: '#f59e0b' }} />
                              <span>Đánh giá</span>
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleRemoveAttendee(att.employee_id, att.employee_name)}
                              title="Xóa học viên"
                              style={{ padding: '6px 8px' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: Create / Edit Course */}
      {isCourseModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCourseModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GraduationCap style={{ color: 'var(--primary)' }} />
                {courseToEdit ? 'Chỉnh Sửa Khóa Học' : 'Tạo Khóa Đào Tạo Mới'}
              </h3>
              <button className="modal-close" onClick={() => setIsCourseModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleSaveCourse} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="label">Mã khóa học (ID):</label>
                <input
                  type="text"
                  className="input"
                  required
                  disabled={!!courseToEdit}
                  value={courseFormData.id}
                  onChange={(e) => setCourseFormData({ ...courseFormData, id: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label">Tên chương trình đào tạo *:</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="Ví dụ: Kỹ năng giao tiếp & Thuyết trình chuyên nghiệp"
                  value={courseFormData.title}
                  onChange={(e) => setCourseFormData({ ...courseFormData, title: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="label">Hình thức đào tạo:</label>
                  <select
                    className="select"
                    value={courseFormData.format}
                    onChange={(e) => setCourseFormData({ ...courseFormData, format: e.target.value })}
                  >
                    <option value="Trực tiếp">Trực tiếp</option>
                    <option value="Trực tuyến E-learning">Trực tuyến E-learning</option>
                    <option value="Workshop">Workshop</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Giảng viên / Đơn vị đào tạo *:</label>
                  <input
                    type="text"
                    className="input"
                    required
                    placeholder="Ví dụ: ThS. Lê Văn Hùng"
                    value={courseFormData.instructor}
                    onChange={(e) => setCourseFormData({ ...courseFormData, instructor: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="label">Ngày bắt đầu *:</label>
                  <input
                    type="date"
                    className="input"
                    required
                    value={courseFormData.start_date}
                    onChange={(e) => setCourseFormData({ ...courseFormData, start_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="label">Ngày kết thúc *:</label>
                  <input
                    type="date"
                    className="input"
                    required
                    value={courseFormData.end_date}
                    onChange={(e) => setCourseFormData({ ...courseFormData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="label">Ngân sách dự kiến (VNĐ):</label>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    step="500000"
                    value={courseFormData.budget}
                    onChange={(e) => setCourseFormData({ ...courseFormData, budget: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="label">Trạng thái khóa học:</label>
                  <select
                    className="select"
                    value={courseFormData.status}
                    onChange={(e) => setCourseFormData({ ...courseFormData, status: e.target.value })}
                  >
                    <option value="upcoming">Sắp diễn ra</option>
                    <option value="in_progress">Đang diễn ra</option>
                    <option value="completed">Đã hoàn thành</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="label">Mô tả nội dung chi tiết:</label>
                <textarea
                  className="input"
                  rows="3"
                  placeholder="Mô tả mục tiêu, lộ trình học và quyền lợi học viên..."
                  value={courseFormData.description}
                  onChange={(e) => setCourseFormData({ ...courseFormData, description: e.target.value })}
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCourseModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {courseToEdit ? 'Lưu Thay Đổi' : 'Tạo Khóa Học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add / Nominate Attendee */}
      {isAddAttendeeModalOpen && selectedCourse && (
        <div className="modal-overlay" onClick={() => setIsAddAttendeeModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {isManager ? 'Đề Cử Nhân Sự Tham Gia' : 'Ghi Danh Học Viên Vào Lớp'}
              </h3>
              <button className="modal-close" onClick={() => setIsAddAttendeeModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleEnrollAttendee} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Khóa học: <strong style={{ color: 'var(--text-primary)' }}>{selectedCourse.title}</strong>
              </p>

              <div className="form-group">
                <label className="label">Chọn nhân sự cần tham gia *:</label>
                <select
                  className="select"
                  required
                  value={selectedEmpToEnroll}
                  onChange={(e) => setSelectedEmpToEnroll(e.target.value)}
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {employees
                    .filter(emp => !courseAttendees.some(att => att.employee_id === emp.id))
                    .map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.id} - {emp.name} ({emp.position} • {emp.department})
                      </option>
                    ))}
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddAttendeeModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={!selectedEmpToEnroll}>
                  Xác Nhận Ghi Danh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Grading & Certificate */}
      {gradingAttendee && selectedCourse && (
        <div className="modal-overlay" onClick={() => setGradingAttendee(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award style={{ color: '#f59e0b' }} />
                Đánh Giá & Cấp Chứng Chỉ
              </h3>
              <button className="modal-close" onClick={() => setGradingAttendee(null)}>×</button>
            </div>

            <form onSubmit={handleSaveGrading} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'var(--input-bg)', padding: '12px 16px', borderRadius: '12px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Học viên:</p>
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  {gradingAttendee.employee_name} ({gradingAttendee.employee_id})
                </strong>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {gradingAttendee.employee_position} • {gradingAttendee.employee_department}
                </p>
              </div>

              <div className="form-group">
                <label className="label">Kết quả học tập / Đánh giá:</label>
                <select
                  className="select"
                  value={gradeData.status}
                  onChange={(e) => setGradeData({ ...gradeData, status: e.target.value })}
                >
                  <option value="Đang học">Đang học</option>
                  <option value="Hoàn thành">Hoàn thành khóa học</option>
                  <option value="Đạt chứng chỉ">Đạt chứng chỉ tốt nghiệp</option>
                  <option value="Trượt">Không đạt / Trượt</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label">Điểm số đánh giá (Thang điểm 10):</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  max="10"
                  step="0.5"
                  placeholder="Ví dụ: 8.5"
                  value={gradeData.score}
                  onChange={(e) => setGradeData({ ...gradeData, score: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label">Mã số chứng chỉ (Tùy chọn):</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Để trống hệ thống sẽ tự sinh mã"
                  value={gradeData.certificate_code}
                  onChange={(e) => setGradeData({ ...gradeData, certificate_code: e.target.value })}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setGradingAttendee(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Lưu Đánh Giá
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
