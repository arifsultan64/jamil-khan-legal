import React, { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import {
  fetchContactMessagesAdmin,
  fetchSubscribersAdmin,
  updateContactMessageStatusAdmin,
} from '../../services/firestoreService';
import type { ContactMessage, SubscriberRecord } from '../../types/portal';
import { formatDisplayDate } from '../../utils/formatters';
import { usePageSeo } from '../../utils/seo';

export const AdminInboxPage: React.FC = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [subscribers, setSubscribers] = useState<SubscriberRecord[]>([]);
  const [tab, setTab] = useState<'messages' | 'subscribers'>('messages');

  usePageSeo({
    title: 'Inbox & Subscribers | Admin CMS',
    description: 'Manage visitor contact inquiries and newsletter subscribers.',
    canonicalPath: '/admin/inbox',
  });

  const load = useCallback(async () => {
    const [msgs, subs] = await Promise.all([fetchContactMessagesAdmin(), fetchSubscribersAdmin()]);
    setMessages(msgs);
    setSubscribers(subs);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const exportSubscribersCsv = () => {
    const rows = ['email,status', ...subscribers.map((s) => `${s.email},${s.status}`)].join('\n');
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jameel-khan-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#0F2342]">Inquiries &amp; Subscribers</h1>
          <p className="text-xs text-slate-500 mt-1">
            Private visitor messages and newsletter subscriber registry.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-md">
          <button
            type="button"
            onClick={() => setTab('messages')}
            className={`px-3 py-1.5 text-xs font-medium rounded cursor-pointer ${
              tab === 'messages' ? 'bg-[#0F2342] text-white' : 'text-slate-600'
            }`}
          >
            Contact Inquiries ({messages.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('subscribers')}
            className={`px-3 py-1.5 text-xs font-medium rounded cursor-pointer ${
              tab === 'subscribers' ? 'bg-[#0F2342] text-white' : 'text-slate-600'
            }`}
          >
            Subscribers ({subscribers.length})
          </button>
        </div>
      </div>

      {tab === 'messages' ? (
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-md p-8 text-center text-sm text-slate-500">
              No contact inquiries received yet.
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="bg-white border border-slate-200 rounded-md p-5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-serif text-lg font-bold text-[#0F2342]">{m.subject}</h2>
                    <p className="text-xs text-slate-500">
                      From: <strong>{m.senderName}</strong> ({m.senderEmail}) · {formatDisplayDate(m.createdAt)}
                    </p>
                  </div>
                  <select
                    value={m.status}
                    onChange={(e) => updateContactMessageStatusAdmin(m.id, e.target.value as any).then(load)}
                    className="px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                  >
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line pt-2 border-t border-slate-100">
                  {m.message}
                </p>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-[#0F2342]">Newsletter Subscribers</h2>
            {subscribers.length > 0 && (
              <button
                type="button"
                onClick={exportSubscribersCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#0F2342] border border-slate-300 rounded-md hover:border-[#0F2342] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            )}
          </div>

          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Subscribed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscribers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">No subscribers yet.</td>
                </tr>
              ) : (
                subscribers.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2.5 font-medium text-[#0F2342]">{s.email}</td>
                    <td className="px-4 py-2.5 text-xs capitalize">{s.status}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500 tabular-nums">{formatDisplayDate(s.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
