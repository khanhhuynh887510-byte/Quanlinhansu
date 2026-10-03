import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Upload, Link2, Image, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { DEPARTMENTS as STATIC_DEPTS, POSITIONS as STATIC_POS } from '../../data/initialEmployees';
import { generateNextEmployeeId } from '../../utils/formatters';
import { api } from '../../services/api';

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=250&q=80'
];

export const EmployeeModal = ({
  isOpen,
  onClose,
  onSubmit,
  employeeToEdit,
  allEmployees = []
}) => {
  const [departments, setDepartments] = useState(STATIC_DEPTS);
  const [positions, setPositions] = useState(STATIC_POS);

  // Avatar tab mode: 'upload' | 'url' | 'preset'
  const [avatarMode, setAvatarMode] = useState('upload');
  const [urlInput, setUrlInput] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    department: 'Kỹ thuật & Công nghệ (IT)',
    position: 'Nhân viên',
    salary: 15000000,
    status: 'Đang làm việc',
    joinDate: new Date().toISOString().slice(0, 10),
    dob: '1995-01-01',
    gender: 'Nam',
    address: 'Hà Nội',
    cccd: '',
    avatar: DEFAULT_AVATARS[0],
    notes: ''
  });

  const [errors, setErrors] = useState({});

  // Tải danh mục phòng ban và chức vụ từ DB
  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const [deptData, posData] = await Promise.all([
          api.getDepartments(),
          api.getPositions()
        ]);
        if (deptData && deptData.length > 0) setDepartments(deptData);
        if (posData && posData.length > 0) setPositions(posData.map(p => p.name));
      } catch (e) {
        console.error('Lỗi tải danh mục trong EmployeeModal:', e);
      }
    };
    if (isOpen) {
      fetchCatalogs();
    }
  }, [isOpen]);

  useEffect(() => {
    if (employeeToEdit) {
      setFormData({
        ...employeeToEdit,
        cccd: employeeToEdit.cccd || '',
        salary: employeeToEdit.salary || 10000000,
        status: employeeToEdit.status || 'Đang làm việc',
        avatar: employeeToEdit.avatar || DEFAULT_AVATARS[0]
      });
      setUrlInput(employeeToEdit.avatar?.startsWith('http') ? employeeToEdit.avatar : '');
      setAvatarMode(employeeToEdit.avatar?.startsWith('data:') ? 'upload' : 'url');
      setUploadStatus(employeeToEdit.avatar?.startsWith('data:') ? 'Ảnh đã lưu từ trước' : '');
    } else {
      const nextId = generateNextEmployeeId(allEmployees);
      const randomAvatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
      setFormData({
        id: nextId,
        name: '',
        email: '',
        phone: '',
        department: departments[0]?.name || 'Kỹ thuật & Công nghệ (IT)',
        position: positions[0] || 'Nhân viên',
        salary: 18000000,
        status: 'Đang làm việc',
        joinDate: new Date().toISOString().slice(0, 10),
        dob: '1996-05-15',
        gender: 'Nam',
        address: '',
        cccd: '',
        avatar: randomAvatar,
        notes: ''
      });
      setUrlInput('');
      setAvatarMode('upload');
      setUploadStatus('');
    }
    setErrors({});
  }, [employeeToEdit, isOpen, allEmployees]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'salary' ? Number(value) : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Nén và resize ảnh trước khi lưu Base64 để tối ưu bộ nhớ MySQL và network
  const processImageFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn tệp định dạng hình ảnh (PNG, JPG, WEBP, GIF)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400; // 400x400 là kích thước tối ưu cho avatar sắc nét
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        const approxSizeKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);

        setFormData(prev => ({ ...prev, avatar: compressedDataUrl }));
        setUploadStatus(`Đã tải: ${file.name} (~${approxSizeKb} KB)`);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleUrlChange = (e) => {
    const url = e.target.value;
    setUrlInput(url);
    if (url.trim()) {
      setFormData(prev => ({ ...prev, avatar: url.trim() }));
    }
  };

  const selectPresetAvatar = (url) => {
    setFormData(prev => ({ ...prev, avatar: url }));
    setUrlInput(url);
    setUploadStatus('');
  };

  const randomizeAvatar = () => {
    const newAvatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
    setFormData(prev => ({ ...prev, avatar: newAvatar }));
    setUrlInput(newAvatar);
    setUploadStatus('');
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'Vui lòng nhập họ và tên';
    }
    if (!formData.email || !formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không đúng định dạng';
    }
    if (!formData.phone || !formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    }
    if (formData.salary <= 0) {
      newErrors.salary = 'Mức lương phải lớn hơn 0';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const isBase64 = formData.avatar?.startsWith('data:');
  const isUrl = formData.avatar?.startsWith('http');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">
              {employeeToEdit ? 'Chỉnh Sửa Hồ Sơ Nhân Viên' : 'Tiếp Nhận Nhân Sự Mới'}
            </h3>
            <p className="modal-subtitle">
              {employeeToEdit ? `Cập nhật thông tin nhân sự mã ${formData.id}` : 'Nhập thông tin lý lịch cá nhân và phân bổ phòng ban'}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* AVATAR PICKER SECTION (Hỗ trợ Tải ảnh lên / Nhập link / Kho mẫu) */}
            <div className="avatar-picker-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Image size={16} color="var(--primary)" />
                  Ảnh đại diện nhân viên
                </span>
                
                {/* Mode Selector Tabs */}
                <div className="avatar-tabs">
                  <button
                    type="button"
                    className={`avatar-tab-btn ${avatarMode === 'upload' ? 'active' : ''}`}
                    onClick={() => setAvatarMode('upload')}
                  >
                    <Upload size={13} />
                    <span>Tải ảnh từ máy</span>
                  </button>

                  <button
                    type="button"
                    className={`avatar-tab-btn ${avatarMode === 'url' ? 'active' : ''}`}
                    onClick={() => setAvatarMode('url')}
                  >
                    <Link2 size={13} />
                    <span>Nhập link ảnh</span>
                  </button>

                  <button
                    type="button"
                    className={`avatar-tab-btn ${avatarMode === 'preset' ? 'active' : ''}`}
                    onClick={() => setAvatarMode('preset')}
                  >
                    <Sparkles size={13} />
                    <span>Kho ảnh mẫu</span>
                  </button>
                </div>
              </div>

              <div className="avatar-picker-main">
                {/* Avatar Preview Box */}
                <div className="avatar-preview-box">
                  <img
                    src={formData.avatar || DEFAULT_AVATARS[0]}
                    alt={formData.name || 'Preview'}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = DEFAULT_AVATARS[0];
                    }}
                  />
                  <div className="avatar-badge">
                    {isBase64 ? 'Tải lên' : isUrl ? 'Link URL' : 'Ảnh mẫu'}
                  </div>
                </div>

                {/* Mode 1: Tải ảnh từ máy */}
                {avatarMode === 'upload' && (
                  <div className="avatar-controls-panel">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      style={{ display: 'none' }}
                      id="employee-avatar-file-input"
                    />

                    <div
                      className={`avatar-dropzone ${isDragging ? 'dragging' : ''}`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                    >
                      <Upload size={22} color="var(--primary)" />
                      <div className="avatar-dropzone-text">
                        Nhấn để chọn ảnh hoặc kéo thả ảnh vào đây
                      </div>
                      <div className="avatar-dropzone-sub">
                        Hỗ trợ JPG, PNG, WEBP. Hệ thống sẽ tự động tối ưu hóa kích thước.
                      </div>
                    </div>

                    {uploadStatus && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--success-text)', fontWeight: 600 }}>
                        <Check size={14} />
                        <span>{uploadStatus}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Mode 2: Nhập Link URL */}
                {avatarMode === 'url' && (
                  <div className="avatar-controls-panel">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>
                      Dán đường link ảnh trực tiếp (URL):
                    </label>
                    <div className="avatar-url-box">
                      <input
                        type="url"
                        className="form-input"
                        placeholder="https://images.unsplash.com/photo-..."
                        value={urlInput}
                        onChange={handleUrlChange}
                        id="employee-avatar-url-input"
                      />
                      {urlInput && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setUrlInput('');
                            randomizeAvatar();
                          }}
                          title="Xóa link"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Mẹo: Nhấp chuột phải vào ảnh bất kỳ trên mạng và chọn "Sao chép địa chỉ hình ảnh".
                    </span>
                  </div>
                )}

                {/* Mode 3: Kho ảnh mẫu có sẵn */}
                {avatarMode === 'preset' && (
                  <div className="avatar-controls-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        Chọn một hình đại diện mẫu:
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={randomizeAvatar}
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        <RefreshCw size={12} />
                        <span>Đổi ngẫu nhiên</span>
                      </button>
                    </div>

                    <div className="avatar-presets-wrap">
                      {DEFAULT_AVATARS.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`avatar-preset-thumb ${formData.avatar === url ? 'active' : ''}`}
                          onClick={() => selectPresetAvatar(url)}
                        >
                          <img src={url} alt={`preset-${idx}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* FORM INPUTS */}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  Mã nhân viên (MaNV) <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="id"
                  value={formData.id}
                  onChange={handleChange}
                  className="form-input"
                  readOnly={!!employeeToEdit}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Họ và tên <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Ví dụ: Nguyễn Văn An"
                  required
                />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Số CCCD / CMND:
                </label>
                <input
                  type="text"
                  name="cccd"
                  value={formData.cccd}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Ví dụ: 048198001234"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Email liên hệ <span className="required">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="nv.an@minhkhanh.vn"
                  required
                />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Số điện thoại <span className="required">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="0905 123 456"
                  required
                />
                {errors.phone && <span className="form-error">{errors.phone}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Phòng ban (PhongBan) *</label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="form-select"
                >
                  {/* Đảm bảo phòng ban hiện tại luôn xuất hiện nếu không nằm trong danh sách static */}
                  {formData.department && !departments.some(d => d.name === formData.department) && (
                    <option value={formData.department}>{formData.department}</option>
                  )}
                  {departments.map(dept => (
                    <option key={dept.id || dept.name} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Chức vụ (ChucVu) *</label>
                <select
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className="form-select"
                >
                  {/* Đảm bảo chức vụ hiện tại luôn xuất hiện nếu không nằm trong danh sách static */}
                  {formData.position && !positions.includes(formData.position) && (
                    <option value={formData.position}>{formData.position}</option>
                  )}
                  {positions.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Lương cơ bản (VNĐ) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  name="salary"
                  value={formData.salary}
                  onChange={handleChange}
                  step="500000"
                  min="0"
                  className="form-input"
                  required
                />
                {errors.salary && <span className="form-error">{errors.salary}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Trạng thái nhân sự</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="Đang làm việc">Đang làm việc</option>
                  <option value="Chính thức">Chính thức</option>
                  <option value="Thử việc">Thử việc</option>
                  <option value="Đang nghỉ thai sản">Đang nghỉ thai sản</option>
                  <option value="Đã nghỉ việc">Đã nghỉ việc</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Giới tính</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Ngày sinh</label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob || ''}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ngày ký HĐ nhận việc</label>
                <input
                  type="date"
                  name="joinDate"
                  value={formData.joinDate || ''}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Địa chỉ thường trú</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Ví dụ: Phường Khương Mai, Quận Thanh Xuân, Hà Nội"
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Ghi chú & Đánh giá sơ bộ</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="2"
                  className="form-textarea"
                  placeholder="Kinh nghiệm, chuyên môn, nguyện vọng phát triển..."
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" id="btn-submit-employee">
              {employeeToEdit ? 'Lưu Thay Đổi' : 'Thêm Nhân Viên'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
