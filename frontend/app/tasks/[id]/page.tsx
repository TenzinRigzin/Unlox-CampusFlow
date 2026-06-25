'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, getAuthHeaders } from '../../../lib/api';
import Link from 'next/link';

// Demo tasks database for client-side rendering
const demoTasksDb: { [key: string]: any } = {
  'demo-1': {
    id: 'demo-1',
    subject: 'DBMS',
    title: 'Assignment 1 — Relational Algebra & SQL Queries',
    deadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    reminder_time: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    source_text: 'DBMS Assignment 1 due yesterday at 12pm. Make sure to compile all queries.',
    add_to_calendar: true,
    isDemo: true,
    details: {
      long_summary: 'This assignment covers relational algebra expressions, tuple relational calculus, and basic SQL query formulation. Students must implement queries against the University schema and submit both the algebraic formulas and the executed query outputs.',
      links: ['university-db-schema.pdf', 'sql-practice-playground.com'],
      notes_or_attachments_mentioned: ['DBMS_Assignment_1.pdf', 'university_schema.sql']
    }
  },
  'demo-2': {
    id: 'demo-2',
    subject: 'Web Tech',
    title: 'Milestone 2 — Next.js Dashboard Implementation',
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    reminder_time: new Date(Date.now() + (2 * 24 - 1) * 60 * 60 * 1000).toISOString(),
    source_text: 'Hey Web Tech students, milestone 2 of the team project is due in two days.',
    add_to_calendar: true,
    isDemo: true,
    details: {
      long_summary: 'Implement a modern Next.js client-side dashboard with Tailwind CSS styling and integration to API routes. Requirements include a responsive sidebar, user authentication page, custom components for charts, and clean route transitions.',
      links: ['github.com/webtech-nextjs-boilerplate', 'nextjs.org/docs/app/building-your-application'],
      notes_or_attachments_mentioned: ['milestone_2_guidelines.md', 'figma_dashboard_wireframe.png']
    }
  },
  'demo-3': {
    id: 'demo-3',
    subject: 'Mathematics',
    title: 'Calculus Quiz 3 — Integration Techniques',
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    reminder_time: new Date(Date.now() + (5 * 24 - 1) * 60 * 60 * 1000).toISOString(),
    source_text: 'Quiz 3 covers integration by parts and trigonometric substitution next Tuesday.',
    add_to_calendar: true,
    isDemo: true,
    details: {
      long_summary: 'Calculus III Quiz 3 covers integration by parts, trigonometric substitutions, partial fraction decomposition, and numerical approximation methods (Simpson\'s rule). Cheat sheet of size A4 (one-sided) is allowed.',
      links: ['khanacademy.org/math/calculus-home', 'mit-opencourseware-integration-techniques'],
      notes_or_attachments_mentioned: ['integration_formulas_sheet.pdf', 'sample_quiz_problems.pdf']
    }
  }
};

export default function TaskDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('campusflow_token');
    if (!token) {
      router.push('/');
      return;
    }

    const taskIdStr = String(id);

    // Gracefully handle demo IDs client-side
    if (taskIdStr.startsWith('demo')) {
      const demoTaskObj = demoTasksDb[taskIdStr];
      if (demoTaskObj) {
        setTask(demoTaskObj);
        setLoading(false);
      } else {
        setError('Demo task not found.');
        setLoading(false);
      }
      return;
    }

    const fetchTaskDetails = async () => {
      try {
        const response = await api.get(`/tasks/${id}`, {
          headers: getAuthHeaders(),
        });
        setTask(response.data);
      } catch (err: any) {
        console.error('Error fetching task details', err);
        setError(err.response?.data?.error || 'Failed to load task details. It may have been deleted or you do not have permission.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTaskDetails();
    }
  }, [id, router]);

  const formatDeadline = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      year: 'numeric'
    });
  };

  const getRelativeTimeLabel = (dateStr: string) => {
    if (!dateStr) return { text: '', color: '' };
    const now = new Date().getTime();
    const target = new Date(dateStr).getTime();
    const diff = target - now;

    if (diff < 0) {
      return { text: 'Overdue', color: 'text-red-400 bg-red-400/10 border-red-500/20' };
    }

    const diffHrs = Math.floor(diff / (1000 * 60 * 60));
    if (diffHrs < 24) {
      if (diffHrs === 0) {
        const diffMins = Math.floor(diff / (1000 * 60));
        return { text: `Due in ${diffMins}m`, color: 'text-amber-400 bg-amber-400/10 border-amber-500/20 animate-pulse' };
      }
      return { text: `Due in ${diffHrs}h`, color: 'text-amber-400 bg-amber-400/10 border-amber-500/20 animate-pulse' };
    }

    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) {
      return { text: 'Due tomorrow', color: 'text-purple-400 bg-purple-400/10 border-purple-500/20' };
    }
    return { text: `Due in ${diffDays}d`, color: 'text-blue-400 bg-blue-400/10 border-blue-500/20' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090b11] flex items-center justify-center text-white">
        <div className="flex flex-col items-center space-y-4">
          <svg className="animate-spin h-10 w-10 text-purple-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-gray-400 font-light text-sm">Extracting database file details...</span>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-[#090b11] text-white flex items-center justify-center p-4">
        <div className="bg-[#121624]/60 border border-white/5 p-8 rounded-3xl max-w-md w-full text-center shadow-xl backdrop-blur-xl">
          <div className="w-16 h-16 mx-auto bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-400 mb-5">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold">Failed to Fetch Details</h3>
          <p className="text-gray-400 text-sm mt-2 font-light leading-relaxed">{error || 'Something went wrong.'}</p>
          <Link href="/dashboard" className="mt-6 inline-flex items-center space-x-2 py-2.5 px-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold transition-all text-gray-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Workspace</span>
          </Link>
        </div>
      </div>
    );
  }

  const relativeTime = getRelativeTimeLabel(task.deadline);

  return (
    <div className="min-h-screen bg-[#090b11] text-white font-sans selection:bg-purple-500 selection:text-white pb-16">
      
      {/* GLOW DECORATIONS */}
      <div className="absolute top-0 left-1/4 w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-indigo-600/10 to-purple-600/10 blur-[180px] pointer-events-none"></div>

      {/* HEADER BANNER */}
      <header className="relative border-b border-white/5 bg-[#0e1220]/75 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/dashboard" className="py-2.5 px-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-sm font-medium transition-all text-gray-300 flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Dashboard</span>
          </Link>
          
          <div className="text-right flex items-center space-x-3">
            {task.isDemo && (
              <span className="text-[10px] py-0.5 px-2 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 rounded-md">
                Demo Detail View
              </span>
            )}
            <span className="text-xs text-gray-500 font-light font-mono">ID: {String(task.id).substring(0, 8)}</span>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: MAIN TASK HIGHLIGHTS */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Main Header box */}
            <div className="bg-[#121624]/40 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold py-1.5 px-3.5 bg-purple-500/15 border border-purple-500/30 rounded-xl text-purple-300">
                  {task.subject}
                </span>
                <span className={`text-xs py-1 px-3 border rounded-xl font-bold ${relativeTime.color}`}>
                  {task.isDemo ? 'Demo Card' : relativeTime.text}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                {task.title}
              </h1>
              
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5 pt-6 border-t border-white/5 text-sm">
                <div>
                  <span className="block text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-1">Target Deadline</span>
                  <div className="flex items-center space-x-2 text-gray-200">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-semibold">{formatDeadline(task.deadline)}</span>
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-1">Automated Warning Alert</span>
                  <div className="flex items-center space-x-2 text-gray-200">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="font-semibold">{formatDeadline(task.reminder_time)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Summary Description section */}
            <div className="bg-[#121624]/40 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-md space-y-5">
              <h3 className="text-base font-bold text-gray-100 flex items-center space-x-2 pb-3 border-b border-white/5">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>AI-Extracted Concept Overview</span>
              </h3>
              
              <div className="text-sm font-light text-gray-300 leading-relaxed space-y-4">
                {task.details?.long_summary ? (
                  task.details.long_summary.split('\n').map((para: string, index: number) => (
                    <p key={index}>{para}</p>
                  ))
                ) : (
                  <p className="text-gray-500 italic">No details or long summary extracted for this task.</p>
                )}
              </div>
            </div>

            {/* Source Content section */}
            {task.source_text && (
              <div className="bg-[#121624]/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md space-y-3.5">
                <span className="block text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Original Raw Text Source</span>
                <div className="p-4 bg-[#090b11]/70 border border-white/5 rounded-2xl text-xs font-mono text-gray-400 leading-relaxed whitespace-pre-wrap">
                  {task.source_text}
                </div>
              </div>
            )}

          </div>

          {/* RIGHT: RESOURCES & REFERENCES SIDEBAR */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Extracted Links card */}
            <div className="bg-[#121624]/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md space-y-4">
              <h3 className="text-sm font-bold text-gray-200 flex items-center space-x-2 pb-2.5 border-b border-white/5">
                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span>Extracted Web Links</span>
              </h3>
              
              {task.details?.links && task.details.links.length > 0 ? (
                <div className="space-y-2">
                  {task.details.links.map((link: string, idx: number) => (
                    <a
                      key={idx}
                      href={link.startsWith('http') ? link : `https://${link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all text-xs font-medium text-purple-300 truncate"
                    >
                      {link}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 font-light italic">No reference links found in source.</p>
              )}
            </div>

            {/* Notes & Attachments Mentioned card */}
            <div className="bg-[#121624]/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md space-y-4">
              <h3 className="text-sm font-bold text-gray-200 flex items-center space-x-2 pb-2.5 border-b border-white/5">
                <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span>Mentioned Attachments</span>
              </h3>
              
              {task.details?.notes_or_attachments_mentioned && task.details.notes_or_attachments_mentioned.length > 0 ? (
                <div className="space-y-2">
                  {task.details.notes_or_attachments_mentioned.map((note: string, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-300 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="font-light truncate">{note}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 font-light italic">No attachments mentioned in source.</p>
              )}
            </div>

            {/* Smart Study Tip card */}
            <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-purple-500/20 rounded-3xl p-6 space-y-3 shadow-[0_4px_20px_rgba(168,85,247,0.05)]">
              <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">AI Study Strategy</span>
              <h4 className="text-sm font-bold text-gray-200">Suggested Action Plan</h4>
              <p className="text-xs text-gray-400 leading-relaxed font-light">
                We recommend segmenting this project into 3 distinct milestones: Concept review, draft outline, and final validation. Paste relevant lecture slides/notes in the <b>AI Study Hub</b> tab on your dashboard to auto-generate flashcards for rapid revision!
              </p>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
