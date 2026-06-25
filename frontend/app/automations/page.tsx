'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, getAuthHeaders } from '../../lib/api';
import Link from 'next/link';
import { PostIt, Tape, Doodle, cn } from '../../components/ui/Scatterbrain';

export default function AutomationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      const response = await api.get('/automations', { headers: getAuthHeaders() });
      setLogs(response.data || []);
    } catch (err: any) {
      console.error('Error fetching automations', err);
      setError(err.response?.data?.error || 'Failed to fetch automation logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchLogs();
  }, [user]);

  if (!user) return <div className="min-h-screen bg-cork flex justify-center items-center font-shrikhand text-2xl">Loading...</div>;

  return (
    <div className="min-h-screen bg-cork p-4 sm:p-8 relative overflow-x-hidden pb-32">
      <Doodle type="squiggly" className="top-20 left-10 w-32" />

      {/* HEADER POST-IT */}
      <div className="flex justify-center mb-12">
        <PostIt color="white" tape rotation={1} className="w-full max-w-4xl flex items-center justify-between p-4 px-8 shadow-md z-10">
          <div>
            <h1 className="font-shrikhand text-3xl">Automations</h1>
            <p className="font-caveat text-xl text-ink-light tracking-wider">Webhook Logs</p>
          </div>
          <div className="flex space-x-4 font-shrikhand">
            <Link href="/dashboard" className="underline hover:text-blue-500">Dashboard</Link>
            <Link href="/study-buddy" className="underline hover:text-pink-500">Study Buddy</Link>
          </div>
        </PostIt>
      </div>

      <div className="max-w-3xl mx-auto">
        <PostIt color="yellow" pin rotation={-1} className="p-8">
          <div className="flex justify-between items-center border-b-4 border-ink pb-4 mb-6">
            <div>
              <h2 className="font-shrikhand text-4xl">Activity Log</h2>
              <p className="font-caveat text-xl mt-1">Stuff happening in the background...</p>
            </div>
            <button 
              onClick={fetchLogs} 
              disabled={loading}
              className="font-shrikhand text-xl bg-ink text-white py-2 px-4 hover:scale-105 transition-transform"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {error && <div className="font-caveat text-2xl text-red-600 mb-6 border-2 border-red-600 p-2">{error}</div>}

          {loading ? (
            <div className="text-center font-caveat text-3xl py-12">Checking the logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Doodle type="x" className="w-16 mx-auto mb-4 relative" />
              <div className="font-caveat text-3xl">Nothing here yet!</div>
              <p className="font-zilla text-lg text-ink-light mt-2">Add some tasks or generate study packs to trigger webhooks.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {logs.map((log) => {
                const date = new Date(log.created_at);
                const isSuccess = log.status === 'success';
                return (
                  <div key={log.id} className="border-2 border-ink p-4 bg-white/50 relative group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-shrikhand text-xl">{log.workflow_name}</div>
                      <div className={cn(
                        "font-caveat text-xl px-2 py-1 rotate-3 border-2 border-ink",
                        isSuccess ? "bg-green" : "bg-pink"
                      )}>
                        {log.status}
                      </div>
                    </div>
                    
                    <div className="font-zilla text-sm">
                      <span className="font-bold">Task ID:</span> {log.task_id ? String(log.task_id).substring(0, 8) : 'N/A'}
                    </div>
                    <div className="font-zilla text-sm">
                      <span className="font-bold">Time:</span> {date.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PostIt>
      </div>
    </div>
  );
}
