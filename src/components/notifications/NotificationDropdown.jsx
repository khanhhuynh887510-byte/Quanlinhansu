import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Bell, CheckCheck, Clock, FileText, Calendar, 
  Award, ChevronRight, X, Sparkles
} from 'lucide-react';
import { api } from '../../services/api';

export const NotificationDropdown = ({ currentUser, onNavigate, onNotificationCountChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await api.getNotifications({
        role: currentUser.role,
        employee_id: currentUser.employee_id
      });
      if (res?.success) {
        setNotifications(res.data || []);
        setUnreadCount(res.unread_count || 0);
        if (onNotificationCountChange) {
          onNotificationCountChange(res.unread_count || 0);
        }
      }
    } catch (error) {
      console.error('Lỗi tải thông báo:', error);
    }
  }, [currentUser, onNotificationCountChange]);

  useEffect(() => {
    loadNotifications();
    // Tự động kiểm tra thông báo mới mỗi 15 giây
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen(prev => !prev);
    if (!isOpen) {
      loadNotifications();
    }
  };

  const handleMarkAsRead = async (noti) => {
    if (!noti.is_read) {
      try {
        await api.markNotificationRead(noti.id);
        setNotifications(prev => prev.map(n => n.id === noti.id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (e) {
        // ignore
      }
    }

    if (noti.link_tab && onNavigate) {
      onNavigate(noti.link_tab);
      setIsOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead(currentUser.role, currentUser.employee_id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      if (onNotificationCountChange) onNotificationCountChange(0);
    } catch (e) {
      // ignore
    }
  };

  const getNotiIcon = (type) => {
    switch (type) {
      case 'leave_request':
        return { icon: Calendar, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' };
      case 'work_report':
        return { icon: FileText, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
      case 'attendance_appeal':
        return { icon: Clock, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
      case 'reward_notice':
        return { icon: Award, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' };
      default:
        return { icon: Sparkles, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' };
    }
  };

  return (
    <div className="notification-wrapper" ref={dropdownRef}>
      <button 
        className={`btn-icon notification-bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={handleToggle}
        title={unreadCount > 0 ? `Bạn có ${unreadCount} thông báo mới` : 'Thông báo'}
        aria-label="Xem thông báo"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="notification-badge-count">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown-menu">
          {/* Header */}
          <div className="noti-dropdown-header">
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Thông Báo
              </h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {unreadCount > 0 ? `${unreadCount} tin chưa đọc` : 'Không có tin mới'}
              </span>
            </div>

            {unreadCount > 0 && (
              <button 
                className="btn btn-secondary btn-sm"
                onClick={handleMarkAllRead}
                style={{ fontSize: '0.75rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <CheckCheck size={13} />
                <span>Đã đọc tất cả</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="noti-dropdown-list">
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--text-muted)' }}>
                <Bell size={28} style={{ opacity: 0.3, marginBottom: '6px' }} />
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Hộp thông báo trống</p>
              </div>
            ) : (
              notifications.map((noti) => {
                const iconConfig = getNotiIcon(noti.type);
                const IconComponent = iconConfig.icon;

                return (
                  <div 
                    key={noti.id} 
                    className={`noti-item ${!noti.is_read ? 'unread' : ''}`}
                    onClick={() => handleMarkAsRead(noti)}
                  >
                    <div 
                      className="noti-item-icon" 
                      style={{ background: iconConfig.bg, color: iconConfig.color }}
                    >
                      <IconComponent size={16} />
                    </div>

                    <div className="noti-item-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <strong className="noti-item-title">{noti.title}</strong>
                        {!noti.is_read && <span className="noti-unread-dot"></span>}
                      </div>
                      <p className="noti-item-message">{noti.message}</p>
                      <div className="noti-item-meta">
                        <span>{noti.sender_name || 'Hệ thống'}</span>
                        <span>•</span>
                        <span>{noti.created_at ? new Date(noti.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : 'Vừa xong'}</span>
                      </div>
                    </div>

                    <ChevronRight size={14} className="noti-arrow" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
