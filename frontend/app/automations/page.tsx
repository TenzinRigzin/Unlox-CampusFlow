'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, getAuthHeaders } from '../../lib/api';
import Link from 'next/link';

export default function AutomationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('campusflow_token');
    const userData = localStorage.getItem('campusflow_user');
    
    if (!token || !userData) {
      router.push('/');
      return;
    }

    try {
      setUser(JSON.parse(userData));
    } catch (e) {
      router.push('/');
    }
  }, [router]);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/automations', {
        headers: getAuthHeaders(),
      });
      setLogs(response.data || []);
    } catch (err: any) {
      console.error('Error fetching automations', err);
      setError(err.response?.data?.error || 'Failed to fetch automation logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
  }, [user]);

  const formatTimestamp = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#090b11] flex items-center justify-center text-white">
        <div className="flex flex-col items-center space-y-4">
          <svg className="animate-spin h-10 w-10 text-purple-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-gray-400 font-light text-sm">Securing your session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090b11] text-white font-sans pb-20 relative selection:bg-purple-500 selection:text-white">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-[45vw] h-[45vw] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[45vw] h-[45vw] rounded-full bg-purple-600/10 blur-[150px] pointer-events-none"></div>

      {/* Header bar */}
      <header className="relative border-b border-white/5 bg-[#0e1220]/75 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <Link href="/dashboard" className="py-2.5 px-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-sm font-medium transition-all text-gray-300 flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Dashboard</span>
          </Link>
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            CampusFlow
          </span>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="py-2 px-3 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 rounded-xl text-xs font-semibold text-gray-300 transition-all flex items-center space-x-1.5"
            title="Reload webhooks log"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.2" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative max-w-5xl mx-auto px-4 pt-10 space-y-8 animate-slide-down">
        
        {/* Title Block */}
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
            My Automations
          </h1>
          <p className="text-sm text-gray-400 font-light leading-normal">
            Every webhook call CampusFlow has made — real, not mocked.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <svg className="animate-spin h-10 w-10 text-purple-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-[#121624]/30 border border-dashed border-white/10 rounded-3xl p-16 text-center">
            <div className="w-16 h-16 mx-auto bg-purple-500/5 rounded-2xl flex items-center justify-center border border-purple-500/10 mb-5 text-purple-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-bold">No automations yet</h3>
            <p className="text-gray-400 text-sm mt-1.5 max-w-sm mx-auto font-light leading-relaxed">
              Create a task to see activity here. Confirmed tasks trigger automatic calendar sync and Slack/WhatsApp notification alerts.
            </p>
          </div>
        ) : (
          <div className="bg-[#121624]/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-[#0e1220]/60 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Workflow</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6">Task ID</th>
                    <th className="py-4 px-6">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.map((log) => {
                    let badgeClass = 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
                    if (log.status === 'success') badgeClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                    if (log.status === 'failed') badgeClass = 'bg-rose-500/10 border-rose-500/20 text-rose-400';

                    return (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4.5 px-6 font-semibold text-gray-200">
                          {log.workflow_name}
                        </td>
                        <td className="py-4.5 px-6 text-center">
                          <span className={`inline-flex uppercase text-[9px] font-bold py-1 px-2.5 rounded-lg border ${badgeClass}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-4.5 px-6 font-mono text-gray-400">
                          {log.task_id ? (
                            <Link 
                              href={`/tasks/${log.task_id}`} 
                              className="text-purple-400 hover:text-purple-300 border-b border-dashed border-purple-400/30 hover:border-purple-300/60"
                            >
                              {String(log.task_id).substring(0, 8)}
                            </Link>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                        <td className="py-4.5 px-6 text-gray-400 font-light">
                          {formatTimestamp(log.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
