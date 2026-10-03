import React from 'react';
import { 
  X, Printer, CheckCircle2, AlertCircle, Building, 
  Calendar, Award, TrendingDown, ArrowDownRight, ArrowUpRight, DollarSign
} from 'lucide-react';

export const PayslipModal = ({ isOpen, payslip, onClose }) => {
  if (!isOpen || !payslip) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val) => {
    return (Number(val) || 0).toLocaleString('vi-VN') + ' ₫';
  };

  const statusBadge = {
    paid: { label: 'ĐÃ THANH TOÁN', class: 'badge-success', icon: CheckCircle2 },
    approved: { label: 'ĐÃ PHÊ DUYỆT', class: 'badge-info', icon: CheckCircle2 },
    draft: { label: 'BẢN DỰ THẢO', class: 'badge-warning', icon: AlertCircle }
  }[payslip.status || 'draft'];

  const StatusIcon = statusBadge.icon;

  // Tính toán các khoản tổng thu nhập và khấu trừ
  const earnedBase = Math.round((payslip.base_salary / payslip.standard_days) * payslip.actual_days);
  const totalEarnings = earnedBase + Number(payslip.allowance || 0) + Number(payslip.attendance_bonus || 0) + Number(payslip.performance_bonus || 0);
  const totalDeductions = Number(payslip.late_penalty || 0) + Number(payslip.unexcused_penalty || 0) + Number(payslip.insurance_deduction || 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-card payslip-modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', width: '95%' }}
      >
        {/* Header Action Bar */}
        <div className="payslip-modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`status-badge ${statusBadge.class}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <StatusIcon size={13} />
              {statusBadge.label}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Kỳ lương: <strong>{payslip.month}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={handlePrint}
              title="In phiếu lương"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={15} />
              <span>In Phiếu Lương</span>
            </button>
            <button className="btn-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Payslip Body */}
        <div className="payslip-print-container" id="printable-payslip">
          {/* Header Doanh nghiệp */}
          <div className="payslip-company-header">
            <div className="payslip-brand">
              <div className="payslip-logo-badge">HRPro</div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  CÔNG TY CỔ PHẦN CÔNG NGHỆ VÀ TRUYỀN THÔNG HRPRO
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Tòa nhà Innovation Hub, Phố Duy Tân, Cầu Giấy, Hà Nội | MST: 0108999888
                </p>
              </div>
            </div>
            <div className="payslip-code-box">
              <span className="payslip-code-label">MÃ PHIẾU LƯƠNG</span>
              <span className="payslip-code-val">{payslip.id}</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', margin: '20px 0 16px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '0.5px', color: 'var(--text-primary)', margin: 0 }}>
              PHIẾU LƯƠNG THU NHẬP NHÂN VIÊN
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Kỳ thanh toán: Tháng {payslip.month?.split('-')[1]} năm {payslip.month?.split('-')[0]}
            </p>
          </div>

          {/* Thông tin nhân viên */}
          <div className="payslip-emp-meta-grid">
            <div className="payslip-meta-item">
              <span className="meta-label">Mã nhân viên:</span>
              <strong className="meta-value">{payslip.employee_id}</strong>
            </div>
            <div className="payslip-meta-item">
              <span className="meta-label">Họ và tên:</span>
              <strong className="meta-value">{payslip.employee_name}</strong>
            </div>
            <div className="payslip-meta-item">
              <span className="meta-label">Phòng ban:</span>
              <span className="meta-value">{payslip.employee_department}</span>
            </div>
            <div className="payslip-meta-item">
              <span className="meta-label">Chức vụ:</span>
              <span className="meta-value">{payslip.employee_position}</span>
            </div>
            <div className="payslip-meta-item">
              <span className="meta-label">Số ngày công chuẩn:</span>
              <span className="meta-value">{payslip.standard_days} ngày</span>
            </div>
            <div className="payslip-meta-item">
              <span className="meta-label">Ngày công thực tế:</span>
              <strong className="meta-value" style={{ color: 'var(--primary)' }}>
                {payslip.actual_days} ngày
              </strong>
            </div>
          </div>

          {/* Hai cột: Các khoản cộng (Thu nhập) & Các khoản trừ (Khấu trừ) */}
          <div className="payslip-breakdown-grid">
            {/* Cột 1: Thu nhập & Thưởng */}
            <div className="breakdown-col income-col">
              <div className="breakdown-header" style={{ color: '#059669', background: 'rgba(16, 185, 129, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ArrowUpRight size={16} />
                  <span>I. CÁC KHOẢN THU NHẬP & THƯỞNG</span>
                </div>
              </div>
              <div className="breakdown-body">
                <div className="breakdown-row">
                  <span>Lương cơ bản hợp đồng:</span>
                  <strong>{formatCurrency(payslip.base_salary)}</strong>
                </div>
                <div className="breakdown-row">
                  <span>Lương tính theo công ({payslip.actual_days}/{payslip.standard_days}):</span>
                  <strong>{formatCurrency(earnedBase)}</strong>
                </div>
                <div className="breakdown-row">
                  <span>Phụ cấp (cơm trưa, đi lại, điện thoại):</span>
                  <span>{formatCurrency(payslip.allowance)}</span>
                </div>
                <div className="breakdown-row highlight-row reward-highlight">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Award size={14} color="#f59e0b" />
                    <strong>Thưởng chuyên cần:</strong>
                  </span>
                  <strong style={{ color: '#059669' }}>
                    +{formatCurrency(payslip.attendance_bonus)}
                  </strong>
                </div>
                <div className="breakdown-row highlight-row reward-highlight">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Award size={14} color="#6366f1" />
                    <strong>Thưởng đóng góp lớn / KPI:</strong>
                  </span>
                  <strong style={{ color: '#059669' }}>
                    +{formatCurrency(payslip.performance_bonus)}
                  </strong>
                </div>
                <div className="breakdown-total-row">
                  <span>TỔNG THU NHẬP (A):</span>
                  <strong style={{ color: '#059669', fontSize: '1.05rem' }}>
                    {formatCurrency(totalEarnings)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Cột 2: Khấu trừ & Phạt */}
            <div className="breakdown-col deduction-col">
              <div className="breakdown-header" style={{ color: '#dc2626', background: 'rgba(239, 68, 68, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ArrowDownRight size={16} />
                  <span>II. CÁC KHOẢN KHẤU TRỪ & PHẠT</span>
                </div>
              </div>
              <div className="breakdown-body">
                <div className="breakdown-row">
                  <span>Trích đóng BHXH, BHYT, BHTN (10.5%):</span>
                  <span>-{formatCurrency(payslip.insurance_deduction)}</span>
                </div>
                <div className="breakdown-row highlight-row penalty-highlight">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <TrendingDown size={14} color="#ef4444" />
                    <strong>Phạt đi làm muộn ({payslip.late_count} lần):</strong>
                  </span>
                  <strong style={{ color: '#dc2626' }}>
                    -{formatCurrency(payslip.late_penalty)}
                  </strong>
                </div>
                <div className="breakdown-row highlight-row penalty-highlight">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <TrendingDown size={14} color="#ef4444" />
                    <strong>Trừ nghỉ không phép ({payslip.absent_unexcused} ngày):</strong>
                  </span>
                  <strong style={{ color: '#dc2626' }}>
                    -{formatCurrency(payslip.unexcused_penalty)}
                  </strong>
                </div>
                <div className="breakdown-total-row">
                  <span>TỔNG KHẤU TRỪ (B):</span>
                  <strong style={{ color: '#dc2626', fontSize: '1.05rem' }}>
                    -{formatCurrency(totalDeductions)}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* NET SALARY - LƯƠNG THỰC LĨNH */}
          <div className="payslip-net-box">
            <div>
              <span style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.85)' }}>
                THỰC LĨNH CHUYỂN KHOẢN (A - B)
              </span>
              <h2 style={{ fontSize: '1.85rem', fontWeight: 900, margin: '4px 0 0', color: '#ffffff' }}>
                {formatCurrency(payslip.net_salary)}
              </h2>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)' }}>
              <p style={{ margin: 0 }}>
                Trạng thái: <strong>{statusBadge.label}</strong>
              </p>
              {payslip.payment_date && (
                <p style={{ margin: '4px 0 0' }}>
                  Thời gian: {payslip.payment_date}
                </p>
              )}
            </div>
          </div>

          {/* Ghi chú & Chữ ký */}
          {payslip.notes && (
            <div style={{ margin: '14px 0', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-tertiary)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <strong>Ghi chú:</strong> {payslip.notes}
            </div>
          )}

          <div className="payslip-signatures">
            <div className="signature-box">
              <span>Người lập biểu</span>
              <p className="signature-note">(Ký, họ tên)</p>
              <div className="signature-space"></div>
              <strong>Kế toán Tiền lương</strong>
            </div>
            <div className="signature-box">
              <span>Kế toán trưởng</span>
              <p className="signature-note">(Ký, họ tên)</p>
              <div className="signature-space"></div>
              <strong>Võ Minh Quân</strong>
            </div>
            <div className="signature-box">
              <span>Người nhận lương</span>
              <p className="signature-note">(Ký, họ tên)</p>
              <div className="signature-space"></div>
              <strong>{payslip.employee_name}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
