import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationsApi } from '../../services/api';
import { formatDateTime } from '../../utils';
import type { Notification } from '../../types';
import toast from 'react-hot-toast';

const typeColors: Record<string, string> = {
  success: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  info: 'bg-blue-100 text-blue-700',
};

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  const fetch = async () => {
    try {
      const res = await notificationsApi.list({ limit: 50 });
      setNotifications(res.data.data);
      setUnread(res.data.unread);
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      fetch();
      toast.success('All marked as read');
    } catch { toast.error('Failed'); }
  };

  const markRead = async (n: Notification) => {
    if (n.isRead) return;
    await notificationsApi.markRead(n.id);
    fetch();
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Notifications</h1>
          <p className="text-slate-500 text-sm">{unread} unread</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-5 py-4">
              <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2"><div className="skeleton h-3 w-48 rounded" /><div className="skeleton h-2.5 w-64 rounded" /></div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No notifications yet</p>
          </div>
        ) : (
          notifications.map(n => (
            <div key={n.id} onClick={() => markRead(n)} className={`flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50/60 transition-colors ${!n.isRead ? 'bg-blue-50/30' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${typeColors[n.type] || 'bg-slate-100 text-slate-600'}`}>
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium ${!n.isRead ? 'text-slate-800' : 'text-slate-600'}`}>{n.title}</p>
                  {!n.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{n.message}</p>
                <p className="text-xs text-slate-400 mt-1">{formatDateTime(n.createdAt)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
