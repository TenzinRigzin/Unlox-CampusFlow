'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, getAuthHeaders } from '../../lib/api';
import Link from 'next/link';

// Demo Tasks shown when there are no real tasks in database
const demoTasks = [
  {
    id: 'demo-1',
    subject: 'DBMS',
    title: 'Assignment 1 — Relational Algebra & SQL Queries',
    deadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
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
  {
    id: 'demo-2',
    subject: 'Web Tech',
    title: 'Milestone 2 — Next.js Dashboard Implementation',
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // in 2 days
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
  {
    id: 'demo-3',
    subject: 'Mathematics',
    title: 'Calculus Quiz 3 — Integration Techniques',
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // in 5 days
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
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [automations, setAutomations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'tasks' | 'ai-hub' | 'automations'>('tasks');
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingAutos, setLoadingAutos] = useState(true);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Manual Task form state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSubject, setTaskSubject] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskReminder, setTaskReminder] = useState('');
  const [addToCalendar, setAddToCalendar] = useState(true);
  const [taskFormError, setTaskFormError] = useState('');
  const [taskFormSuccess, setTaskFormSuccess] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  // AI Task Extraction form state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiInputText, setAiInputText] = useState('');
  const [aiExtractionStep, setAiExtractionStep] = useState<null | 'classifying' | 'extracting' | 'editable'>(null);
  const [aiError, setAiError] = useState('');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [confirmingExtraction, setConfirmingExtraction] = useState(false);

  // AI Study Assistant form state
  const [lectureNotes, setLectureNotes] = useState('');
  const [aiMode, setAiMode] = useState<'flashcards' | 'quiz'>('flashcards');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [studyError, setStudyError] = useState('');
  const [generatedFlashcards, setGeneratedFlashcards] = useState<any[]>([]);
  const [generatedQuiz, setGeneratedQuiz] = useState<any[]>([]);
  
  // Flashcard interaction state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz interaction state
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Expanded log item
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

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

  // Toast timer auto-dismissal
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Helper to convert ISO string to YYYY-MM-DDTHH:MM for input fields
  const toDatetimeLocal = (isoStr: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '';
      const pad = (n: number) => n.toString().padStart(2, '0');
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const minutes = pad(d.getMinutes());
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (e) {
      return '';
    }
  };

  // Fetch Tasks and Automations
  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const response = await api.get('/tasks', {
        headers: getAuthHeaders(),
      });
      setTasks(response.data || []);
    } catch (err) {
      console.error('Error fetching tasks', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchAutomations = async () => {
    setLoadingAutos(true);
    try {
      const response = await api.get('/automations', {
        headers: getAuthHeaders(),
      });
      setAutomations(response.data || []);
    } catch (err) {
      console.error('Error fetching automations', err);
    } finally {
      setLoadingAutos(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchAutomations();
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('campusflow_token');
    localStorage.removeItem('campusflow_user');
    router.push('/');
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskFormError('');
    setTaskFormSuccess('');
    setAddingTask(true);

    if (!taskTitle || !taskSubject || !taskDeadline) {
      setTaskFormError('Title, Subject, and Deadline are required.');
      setAddingTask(false);
      return;
    }

    try {
      await api.post(
        '/tasks/manual',
        {
          title: taskTitle,
          subject: taskSubject,
          deadline: new Date(taskDeadline).toISOString(),
          reminderTime: taskReminder ? new Date(taskReminder).toISOString() : undefined,
          addToCalendar,
        },
        {
          headers: getAuthHeaders(),
        }
      );

      setToast({ message: 'Manual task created successfully!', type: 'success' });
      setTaskFormSuccess('Task created successfully!');
      setTaskTitle('');
      setTaskSubject('');
      setTaskDeadline('');
      setTaskReminder('');
      setAddToCalendar(true);
      
      // Reload tasks & automations
      fetchTasks();
      fetchAutomations();

      setTimeout(() => {
        setShowTaskForm(false);
        setTaskFormSuccess('');
      }, 1000);
    } catch (err: any) {
      setTaskFormError(err.response?.data?.error || 'Failed to create task.');
    } finally {
      setAddingTask(false);
    }
  };

  // AI Task Extraction execution
  const handleExtractDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiError('');
    if (!aiInputText.trim()) {
      setAiError('Please paste some text messages.');
      return;
    }

    try {
      // Step 1: Classifying
      setAiExtractionStep('classifying');
      const classResponse = await api.post('/ai/classify-message', {
        text: aiInputText,
      });

      // Step 2: Extracting
      setAiExtractionStep('extracting');
      const extractResponse = await api.post(
        '/ai/extract-task',
        { text: aiInputText },
        { headers: getAuthHeaders() }
      );

      const parsedData = extractResponse.data;
      // Pre-fill fields for editing
      setExtractedData({
        extractionId: parsedData.extractionId,
        title: parsedData.title || '',
        subject: parsedData.subject || '',
        deadline: toDatetimeLocal(parsedData.deadline),
        shortDescription: parsedData.shortDescription || '',
        longSummary: parsedData.longSummary || '',
      });

      setAiExtractionStep('editable');
    } catch (err: any) {
      setAiError(err.response?.data?.error || 'Extraction workflow failed. Please verify the backend service.');
      setAiExtractionStep(null);
    }
  };

  const handleConfirmExtraction = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmingExtraction(true);
    setAiError('');

    if (!extractedData.title || !extractedData.subject || !extractedData.deadline) {
      setAiError('Title, Course, and Deadline are required.');
      setConfirmingExtraction(false);
      return;
    }

    try {
      await api.post('/tasks/confirm', {
        extractionId: extractedData.extractionId,
        edits: {
          title: extractedData.title,
          subject: extractedData.subject,
          deadline: new Date(extractedData.deadline).toISOString(),
          shortDescription: extractedData.shortDescription,
          longSummary: extractedData.longSummary,
        },
      });

      setToast({ message: 'AI extracted task confirmed successfully!', type: 'success' });
      setShowAiModal(false);
      setExtractedData(null);
      setAiExtractionStep(null);
      
      // Reload tasks & automations
      fetchTasks();
      fetchAutomations();
    } catch (err: any) {
      setAiError(err.response?.data?.error || 'Failed to confirm task submission.');
    } finally {
      setConfirmingExtraction(false);
    }
  };

  const handleGenerateAi = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudyError('');
    setGeneratedFlashcards([]);
    setGeneratedQuiz([]);
    setGeneratingAi(true);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setSelectedAnswers({});
    setQuizSubmitted(false);

    if (!lectureNotes.trim()) {
      setStudyError('Please paste some lecture notes first.');
      setGeneratingAi(false);
      return;
    }

    try {
      const endpoint = aiMode === 'flashcards' ? '/ai/flashcards' : '/ai/quiz';
      const response = await api.post(
        endpoint,
        { notes: lectureNotes },
        { headers: getAuthHeaders() }
      );

      if (aiMode === 'flashcards') {
        setGeneratedFlashcards(response.data.flashcards || []);
      } else {
        setGeneratedQuiz(response.data.quiz || []);
      }
      setToast({ message: 'Study Pack generated successfully!', type: 'success' });
    } catch (err: any) {
      setStudyError(err.response?.data?.error || 'Failed to generate study pack. Try narrowing down the notes.');
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSelectQuizAnswer = (qIndex: number, optionIndex: number) => {
    if (quizSubmitted) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [qIndex]: optionIndex
    }));
  };

  const getUrgentTasksCount = () => {
    const now = new Date().getTime();
    const activeTasks = tasks.length > 0 ? tasks : demoTasks;
    return activeTasks.filter(task => {
      const deadline = new Date(task.deadline).getTime();
      const diffHrs = (deadline - now) / (1000 * 60 * 60);
      return diffHrs > 0 && diffHrs <= 48; // Due within next 48 hours
    }).length;
  };

  const formatDeadline = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getRelativeTimeLabel = (dateStr: string) => {
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
      return { text: `Due in ${diffHrs}h`, color: 'text-amber-400 bg-amber-400/10 border-amber-500/20' };
    }

    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) {
      return { text: 'Due tomorrow', color: 'text-purple-400 bg-purple-400/10 border-purple-500/20' };
    }
    return { text: `Due in ${diffDays}d`, color: 'text-blue-400 bg-blue-400/10 border-blue-500/20' };
  };

  // Determine if using database tasks or fallback demo tasks
  const isUsingDemo = tasks.length === 0 && !loadingTasks;
  const activeTasksList = tasks.length > 0 ? tasks : (loadingTasks ? [] : demoTasks);

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
    <div className="min-h-screen bg-[#090b11] text-white font-sans selection:bg-purple-500 selection:text-white pb-16">
      
      {/* BACKGROUND EFFECTS */}
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] rounded-full bg-purple-600/10 blur-[150px] pointer-events-none"></div>

      {/* SYSTEM TOAST ALERTS */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] p-4 rounded-xl border bg-[#121624]/90 backdrop-blur-xl shadow-2xl flex items-center space-x-3 max-w-sm animate-slide-down border-purple-500/30">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-200">System Notification</p>
            <p className="text-[11px] text-gray-400 font-light mt-0.5">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-gray-500 hover:text-gray-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* TOP HEADER NAVIGATION */}
      <header className="relative border-b border-white/5 bg-[#0e1220]/75 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl shadow-lg shadow-purple-600/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                CampusFlow
              </span>
              <span className="ml-2 text-xs py-0.5 px-2 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-300">
                Workspace
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-semibold text-gray-200">{user.name}</span>
              <span className="text-xs text-gray-400 font-light">{user.branch} • Year {user.year}</span>
            </div>
            <Link
              href="/study-buddy"
              className="py-2 px-4 rounded-xl border border-purple-500/20 bg-purple-500/10 hover:bg-purple-600 hover:text-white text-purple-300 transition-all text-sm font-semibold flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Study Buddy</span>
            </Link>
            <Link
              href="/automations"
              className="py-2 px-4 rounded-xl border border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-600 hover:text-white text-indigo-300 transition-all text-sm font-semibold flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Automations</span>
            </Link>
            <button
              onClick={handleLogout}
              className="py-2 px-4 rounded-xl border border-white/5 bg-white/5 hover:bg-red-500/10 hover:border-red-500/20 text-gray-300 hover:text-red-400 transition-all text-sm font-medium flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* WELCOME / STATS GRID */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          <div className="bg-[#121624]/40 border border-white/5 rounded-2xl p-5 backdrop-blur-md flex items-center space-x-4">
            <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <span className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Total Tasks</span>
              <span className="text-2xl font-bold text-white">{isUsingDemo ? 3 : tasks.length}</span>
            </div>
          </div>

          <div className="bg-[#121624]/40 border border-white/5 rounded-2xl p-5 backdrop-blur-md flex items-center space-x-4">
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <span className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Urgent Tasks</span>
              <span className="text-2xl font-bold text-white">{getUrgentTasksCount()}</span>
            </div>
          </div>

          <div className="bg-[#121624]/40 border border-white/5 rounded-2xl p-5 backdrop-blur-md flex items-center space-x-4">
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <span className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Automations</span>
              <span className="text-2xl font-bold text-white">{automations.length}</span>
            </div>
          </div>

          <div className="bg-[#121624]/40 border border-white/5 rounded-2xl p-5 backdrop-blur-md flex items-center space-x-4">
            <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <span className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Courses</span>
              <span className="text-2xl font-bold text-white">{user.subjects?.length || 0}</span>
            </div>
          </div>
        </section>

        {/* WORKSPACE NAVIGATION TABS */}
        <div className="flex border-b border-white/5 mb-8 space-x-6">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'tasks'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Academic Tasks</span>
          </button>
          
          <button
            onClick={() => setActiveTab('ai-hub')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'ai-hub'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>AI Study Hub</span>
          </button>

          <button
            onClick={() => setActiveTab('automations')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'automations'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            <span>n8n Webhook Log</span>
          </button>
        </div>

        {/* ==================== TAB 1: ACADEMIC TASKS ==================== */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold flex items-center space-x-2">
                  <span>Your Course Deadlines</span>
                  {isUsingDemo && (
                    <span className="text-[10px] py-0.5 px-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-md">
                      Displaying Demo Cards
                    </span>
                  )}
                </h2>
                <p className="text-sm text-gray-400">Manage, trace, and inspect deadlines extracted by AI or added manually.</p>
              </div>
              
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  onClick={() => { setShowAiModal(true); setAiExtractionStep(null); setAiInputText(''); setAiError(''); }}
                  className="flex-1 sm:flex-initial py-2.5 px-4 bg-indigo-600/90 hover:bg-indigo-600 rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-600/15 flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
                  </svg>
                  <span>Add Task via AI</span>
                </button>

                <button
                  onClick={() => { setShowTaskForm(!showTaskForm); setTaskFormError(''); setTaskFormSuccess(''); }}
                  className="flex-1 sm:flex-initial py-2.5 px-4 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-semibold transition-all shadow-md shadow-purple-600/15 flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Manually</span>
                </button>
              </div>
            </div>

            {/* MANUAL TASK FORM */}
            {showTaskForm && (
              <div className="bg-[#121624]/60 border border-white/10 rounded-2xl p-6 backdrop-blur-xl animate-slide-down">
                <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Manual Task Scheduler</span>
                </h3>

                {taskFormError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-xl">{taskFormError}</div>}
                {taskFormSuccess && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-300 text-sm rounded-xl">{taskFormSuccess}</div>}

                <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Task Title / Name</label>
                    <input
                      type="text"
                      required
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="e.g. Midterm Lab Project Submission"
                      className="w-full bg-[#090b11]/80 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Subject / Course</label>
                    <select
                      required
                      value={taskSubject}
                      onChange={(e) => setTaskSubject(e.target.value)}
                      className="w-full bg-[#090b11]/80 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <option value="">Select a Course</option>
                      {user.subjects?.map((sub: string) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Deadline Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={taskDeadline}
                      onChange={(e) => setTaskDeadline(e.target.value)}
                      className="w-full bg-[#090b11]/80 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Alert / Reminder Time</label>
                    <input
                      type="datetime-local"
                      value={taskReminder}
                      onChange={(e) => setTaskReminder(e.target.value)}
                      placeholder="Defaults to 1 hour before"
                      className="w-full bg-[#090b11]/80 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>

                  <div className="flex items-center space-x-3 pt-6">
                    <input
                      type="checkbox"
                      id="addToCalendar"
                      checked={addToCalendar}
                      onChange={(e) => setAddToCalendar(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-[#090b11]/80 border border-white/10"
                    />
                    <label htmlFor="addToCalendar" className="text-sm text-gray-300 select-none">Sync with Calendar</label>
                  </div>

                  <div className="md:col-span-3 flex justify-end space-x-3 pt-4 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setShowTaskForm(false)}
                      className="py-2.5 px-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-sm font-medium text-gray-300"
                    >
                      Discard
                    </button>
                    <button
                      type="submit"
                      disabled={addingTask}
                      className="py-2.5 px-5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all text-sm font-semibold disabled:opacity-50"
                    >
                      {addingTask ? 'Saving Task...' : 'Confirm Schedule'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TASK LIST */}
            {loadingTasks ? (
              <div className="flex justify-center py-12">
                <svg className="animate-spin h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-slide-down">
                {activeTasksList.map((task) => {
                  const relative = getRelativeTimeLabel(task.deadline);
                  return (
                    <div
                      key={task.id}
                      className={`group border rounded-2xl p-5 backdrop-blur-md flex flex-col justify-between hover:border-purple-500/30 transition-all duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.15)] hover:shadow-purple-500/5 ${
                        task.isDemo ? 'bg-[#121624]/20 border-white/5 border-dashed' : 'bg-[#121624]/40 border-white/5'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold py-1 px-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-300">
                            {task.subject}
                          </span>
                          <span className={`text-xs py-1 px-2.5 border rounded-lg font-semibold ${relative.color}`}>
                            {task.isDemo ? 'Demo Task' : relative.text}
                          </span>
                        </div>
                        
                        <h4 className="text-base font-bold text-gray-100 group-hover:text-purple-400 transition-colors">
                          {task.title}
                        </h4>
                        
                        <div className="mt-4 space-y-2.5 text-xs text-gray-400 font-light">
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Deadline: <b className="font-semibold text-gray-300">{formatDeadline(task.deadline)}</b></span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <span>Reminder Alert: <span className="text-gray-300 font-semibold">{formatDeadline(task.reminder_time)}</span></span>
                          </div>

                          {task.source_text && (
                            <div className="mt-3 p-2 bg-[#090b11]/40 border border-white/5 rounded-lg text-[11px] text-gray-500 italic max-w-full truncate">
                              Source: "{task.source_text}"
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 flex items-center space-x-1">
                          <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                          <span>{task.isDemo ? 'Demo Mode' : 'Calendar Synced'}</span>
                        </span>
                        
                        <Link 
                          href={`/tasks/${task.id}`}
                          className="py-1.5 px-3 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-600 hover:text-white transition-all text-xs font-semibold rounded-lg text-purple-300 flex items-center space-x-1"
                        >
                          <span>Deep Dive</span>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 2: AI STUDY HUB ==================== */}
        {activeTab === 'ai-hub' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">AI Study Companion</h2>
              <p className="text-sm text-gray-400">Generate interactive revision flashcards or quizzes from lecture notes instantly.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Lecture notes compiler */}
              <div className="lg:col-span-5 bg-[#121624]/40 border border-white/5 rounded-2xl p-6 backdrop-blur-md h-fit">
                <h3 className="text-base font-bold mb-4 flex items-center space-x-2">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Notes Compiler</span>
                </h3>

                {studyError && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-xl">
                    {studyError}
                  </div>
                )}

                <form onSubmit={handleGenerateAi} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Paste Lecture Notes / Reference Text</label>
                    <textarea
                      required
                      rows={10}
                      value={lectureNotes}
                      onChange={(e) => setLectureNotes(e.target.value)}
                      placeholder="e.g. Photosynthesis converts carbon dioxide and water into oxygen and glucose using light energy. Light reactions take place in the thylakoid membrane, generating ATP and NADPH. The Calvin cycle occurs in the stroma and uses ATP and NADPH to fix CO2 into G3P..."
                      className="w-full bg-[#090b11]/80 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none font-light leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Study Pack Format</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setAiMode('flashcards')}
                        className={`py-3 px-4 rounded-xl border font-semibold text-sm transition-all flex flex-col items-center justify-center space-y-1.5 ${
                          aiMode === 'flashcards'
                            ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                        <span>Revision Cards</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAiMode('quiz')}
                        className={`py-3 px-4 rounded-xl border font-semibold text-sm transition-all flex flex-col items-center justify-center space-y-1.5 ${
                          aiMode === 'quiz'
                            ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Knowledge Quiz</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={generatingAi}
                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 rounded-xl font-bold shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {generatingAi ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>AI digesting notes...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
                        </svg>
                        <span>Forge Study Pack</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Study packs output view */}
              <div className="lg:col-span-7 flex flex-col justify-center min-h-[400px]">
                
                {/* IDLE VIEW */}
                {!generatingAi && generatedFlashcards.length === 0 && generatedQuiz.length === 0 && (
                  <div className="bg-[#121624]/10 border border-dashed border-white/10 rounded-3xl p-12 text-center flex flex-col items-center justify-center h-full">
                    <div className="w-16 h-16 bg-purple-500/5 border border-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 mb-4 animate-bounce" style={{ animationDuration: '4s' }}>
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold">Forge Output Awaiting</h3>
                    <p className="text-gray-400 text-sm mt-1 max-w-sm font-light">
                      Type or paste your lectures notes on the left, choose your learning format, and hit compile to let the AI build flashcards or quizzes.
                    </p>
                  </div>
                )}

                {/* GENERATING LOAD SCREEN */}
                {generatingAi && (
                  <div className="bg-[#121624]/20 border border-white/5 rounded-3xl p-12 text-center flex flex-col items-center justify-center h-full space-y-6">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center text-purple-400">
                        <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-base font-bold">Synthesizing Notes...</h4>
                      <p className="text-xs text-gray-500 mt-1 max-w-xs font-light">
                        Groq LLM is extracting concepts, defining relationships, and packaging them into interactive structures.
                      </p>
                    </div>
                  </div>
                )}

                {/* FLASHCARDS INTERACTIVE SCREEN */}
                {generatedFlashcards.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-purple-400 font-semibold uppercase tracking-wider">Concept Flashcards</span>
                      <span className="text-xs text-gray-400">Card {currentCardIndex + 1} of {generatedFlashcards.length}</span>
                    </div>

                    {/* Flipped card wrapper */}
                    <div 
                      onClick={() => setIsFlipped(!isFlipped)}
                      className="cursor-pointer h-72 w-full perspective"
                    >
                      <div className={`relative w-full h-full duration-500 preserve-3d transform transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}>
                        
                        {/* Front of Card */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#121624] to-[#1e233b] border border-white/10 rounded-3xl p-8 flex flex-col justify-between backface-hidden shadow-2xl">
                          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest bg-purple-500/10 py-1 px-3 border border-purple-500/20 rounded-full w-fit">
                            Question / Prompt
                          </span>
                          <div className="text-lg font-bold text-center text-gray-100 px-4">
                            {generatedFlashcards[currentCardIndex].question}
                          </div>
                          <span className="text-xs text-gray-500 text-center flex items-center justify-center space-x-1.5">
                            <span>Tap card to reveal answer</span>
                            <svg className="w-3.5 h-3.5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.2" />
                            </svg>
                          </span>
                        </div>

                        {/* Back of Card */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#1e233b] to-[#1a1f33] border border-purple-500/30 rounded-3xl p-8 flex flex-col justify-between backface-hidden rotate-y-180 shadow-purple-500/5 shadow-2xl">
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest bg-emerald-500/10 py-1 px-3 border border-emerald-500/20 rounded-full w-fit">
                            Answer
                          </span>
                          <div className="text-base text-gray-200 text-center font-light leading-relaxed overflow-y-auto max-h-40 px-2">
                            {generatedFlashcards[currentCardIndex].answer}
                          </div>
                          <span className="text-xs text-gray-500 text-center">Tap to hide answer</span>
                        </div>

                      </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsFlipped(false);
                          setCurrentCardIndex(prev => Math.max(0, prev - 1));
                        }}
                        disabled={currentCardIndex === 0}
                        className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all disabled:opacity-30 disabled:pointer-events-none text-sm font-medium flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Previous</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsFlipped(false);
                          setCurrentCardIndex(prev => Math.min(generatedFlashcards.length - 1, prev + 1));
                        }}
                        disabled={currentCardIndex === generatedFlashcards.length - 1}
                        className="py-2.5 px-5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all disabled:opacity-30 disabled:pointer-events-none text-sm font-medium flex items-center space-x-2"
                      >
                        <span>Next Card</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* QUIZ INTERACTIVE SCREEN */}
                {generatedQuiz.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-purple-400 font-semibold uppercase tracking-wider">Concept Test</span>
                      {quizSubmitted && (
                        <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full py-1 px-3">
                          Score: {
                            generatedQuiz.filter((q, index) => selectedAnswers[index] === q.correctIndex).length
                          } / {generatedQuiz.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-5 overflow-y-auto max-h-[480px] pr-2 scrollbar-thin">
                      {generatedQuiz.map((q, qIndex) => {
                        const isCorrect = selectedAnswers[qIndex] === q.correctIndex;
                        return (
                          <div key={qIndex} className="bg-[#121624]/40 border border-white/5 rounded-2xl p-5 space-y-4">
                            <h4 className="text-sm font-bold text-gray-200">
                              {qIndex + 1}. {q.question}
                            </h4>
                            
                            <div className="grid grid-cols-1 gap-2.5">
                              {q.options.map((opt: string, optIndex: number) => {
                                const isSelected = selectedAnswers[qIndex] === optIndex;
                                const isThisCorrectOpt = optIndex === q.correctIndex;
                                
                                let optClass = 'bg-[#090b11]/50 border-white/10 hover:bg-[#090b11]/80 hover:border-white/20 text-gray-300';
                                if (isSelected) {
                                  if (quizSubmitted) {
                                    optClass = isCorrect 
                                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                                      : 'bg-red-500/20 border-red-500 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.1)]';
                                  } else {
                                    optClass = 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.1)]';
                                  }
                                } else if (quizSubmitted && isThisCorrectOpt) {
                                  // Reveal correct answer if user got it wrong
                                  optClass = 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300';
                                }

                                return (
                                  <button
                                    key={optIndex}
                                    type="button"
                                    onClick={() => handleSelectQuizAnswer(qIndex, optIndex)}
                                    className={`w-full py-2.5 px-4 text-left rounded-xl border text-xs font-medium transition-all ${optClass}`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {!quizSubmitted ? (
                      <button
                        onClick={() => setQuizSubmitted(true)}
                        disabled={Object.keys(selectedAnswers).length < generatedQuiz.length}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:pointer-events-none rounded-xl font-bold shadow-lg shadow-purple-600/10 transition-all text-sm"
                      >
                        Submit Answers
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedAnswers({});
                          setQuizSubmitted(false);
                        }}
                        className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl font-semibold transition-all text-sm text-gray-300"
                      >
                        Retry Quiz
                      </button>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: AUTOMATIONS LOG ==================== */}
        {activeTab === 'automations' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Automated Webhooks Tracker</h2>
                <p className="text-sm text-gray-400 font-light">Trace triggers and payloads dispatched to n8n workflow integrations.</p>
              </div>
              <button 
                onClick={fetchAutomations}
                className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-gray-300 transition-all"
                title="Refresh log"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.2" />
                </svg>
              </button>
            </div>

            {loadingAutos ? (
              <div className="flex justify-center py-12">
                <svg className="animate-spin h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : automations.length === 0 ? (
              <div className="bg-[#121624]/20 border border-white/5 rounded-3xl p-12 text-center">
                <div className="w-16 h-16 mx-auto bg-purple-500/5 rounded-2xl flex items-center justify-center border border-purple-500/10 mb-4">
                  <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold">No logs record</h3>
                <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto font-light">
                  Once deadlines are confirmed and n8n webhooks are executed, the detailed execution trace will render here.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {automations.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const dateStr = new Date(log.created_at).toLocaleString();
                  
                  let badgeClass = 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
                  if (log.status === 'success') badgeClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                  if (log.status === 'failed') badgeClass = 'bg-rose-500/10 border-rose-500/20 text-rose-400';

                  return (
                    <div 
                      key={log.id} 
                      className="bg-[#121624]/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md hover:border-purple-500/10 transition-all"
                    >
                      {/* Summary Banner row */}
                      <div 
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="p-4 flex items-center justify-between cursor-pointer select-none"
                      >
                        <div className="flex items-center space-x-3.5">
                          <span className={`text-[10px] uppercase font-bold py-1 px-2.5 rounded-lg border ${badgeClass}`}>
                            {log.status}
                          </span>
                          <div>
                            <span className="text-xs font-semibold text-gray-200 block md:inline">{log.workflow_name}</span>
                            <span className="hidden md:inline mx-2 text-gray-600">•</span>
                            <span className="text-[10px] text-gray-500 font-light">{dateStr}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <span className="text-[10px] font-mono text-gray-500">ID: {log.id.substring(0, 8)}</span>
                          <svg className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Detail Expansion drawer */}
                      {isExpanded && (
                        <div className="px-4 pb-5 pt-1 border-t border-white/5 bg-[#090b11]/30 grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-down">
                          
                          <div>
                            <span className="block text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-2">Webhook JSON Payload</span>
                            <pre className="p-3 bg-[#090b11]/80 border border-white/10 rounded-xl text-[10px] font-mono text-gray-300 overflow-x-auto max-h-60 leading-relaxed scrollbar-thin">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </div>

                          <div>
                            <span className="block text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mb-2">Endpoint Response</span>
                            <pre className="p-3 bg-[#090b11]/80 border border-white/10 rounded-xl text-[10px] font-mono text-gray-300 overflow-x-auto max-h-60 leading-relaxed scrollbar-thin">
                              {typeof log.response === 'object' 
                                ? JSON.stringify(log.response, null, 2)
                                : String(log.response)
                              }
                            </pre>
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

      {/* ==================== AI EXTRACTION MODAL DIALOG ==================== */}
      {showAiModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#090b11]/80 backdrop-blur-lg animate-fade-in">
          <div className="bg-[#121624] border border-white/10 w-full max-w-2xl rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-300">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-100">AI Deadline Extractor</h3>
                  <p className="text-xs text-gray-400 font-light">Paste a chat message containing assignment, quiz or project details.</p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowAiModal(false)}
                className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-gray-400 hover:text-gray-200 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {aiError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl">
                  {aiError}
                </div>
              )}

              {/* STEP 1: INITIAL INPUT */}
              {aiExtractionStep === null && (
                <form onSubmit={handleExtractDeadline} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">WhatsApp or Chat Message Content</label>
                    <textarea
                      required
                      rows={5}
                      value={aiInputText}
                      onChange={(e) => setAiInputText(e.target.value)}
                      placeholder='e.g. "Hey guys DBMS assignment 2 is due this Friday 6pm, covers normalization + ER diagrams"'
                      className="w-full bg-[#090b11]/80 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none font-light leading-relaxed"
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-600/15"
                    >
                      Extract Deadline
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: PROCESSING (Classifying / Extracting) */}
              {(aiExtractionStep === 'classifying' || aiExtractionStep === 'extracting') && (
                <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-indigo-400">
                      <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-200">
                      {aiExtractionStep === 'classifying' ? 'Classifying...' : 'Extracting...'}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs font-light">
                      {aiExtractionStep === 'classifying' 
                        ? 'Analyzing chat context to detect valid deadline alerts...' 
                        : 'Mapping structured database records from raw text...'}
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 3: EDITABLE CARD FORM */}
              {aiExtractionStep === 'editable' && extractedData && (
                <form onSubmit={handleConfirmExtraction} className="space-y-4 animate-slide-down">
                  <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4 mb-2">
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest block mb-1">Verify and Adjust Extracted Details</span>
                    <p className="text-xs text-gray-400 leading-normal font-light">
                      Review the data points extracted from your message text and modify them below before adding the deadline to your scheduler.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Task Title</label>
                      <input
                        type="text"
                        required
                        value={extractedData.title}
                        onChange={(e) => setExtractedData({ ...extractedData, title: e.target.value })}
                        className="w-full bg-[#090b11]/80 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Subject / Course</label>
                      <select
                        required
                        value={extractedData.subject}
                        onChange={(e) => setExtractedData({ ...extractedData, subject: e.target.value })}
                        className="w-full bg-[#090b11]/80 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      >
                        <option value="">Select a Course</option>
                        {user.subjects?.map((sub: string) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Extracted Deadline Date/Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={extractedData.deadline}
                        onChange={(e) => setExtractedData({ ...extractedData, deadline: e.target.value })}
                        className="w-full bg-[#090b11]/80 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Short Description</label>
                      <input
                        type="text"
                        value={extractedData.shortDescription}
                        onChange={(e) => setExtractedData({ ...extractedData, shortDescription: e.target.value })}
                        className="w-full bg-[#090b11]/80 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Detailed Summary (Long summary)</label>
                    <textarea
                      rows={4}
                      value={extractedData.longSummary}
                      onChange={(e) => setExtractedData({ ...extractedData, longSummary: e.target.value })}
                      className="w-full bg-[#090b11]/80 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none font-light leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setAiExtractionStep(null)}
                      className="py-2.5 px-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-sm font-medium text-gray-300"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={confirmingExtraction}
                      className="py-2.5 px-5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all text-sm font-semibold disabled:opacity-50"
                    >
                      {confirmingExtraction ? 'Confirming...' : 'Confirm Deadline'}
                    </button>
                  </div>
                </form>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
