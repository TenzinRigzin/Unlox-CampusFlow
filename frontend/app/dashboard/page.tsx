'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, getAuthHeaders } from '../../lib/api';
import Link from 'next/link';
import { PostIt, Pin, Tape, Doodle, cn } from '../../components/ui/Scatterbrain';

// Demo Tasks shown when there are no real tasks in database
const demoTasks = [
  {
    id: 'demo-1',
    subject: 'DBMS',
    title: 'Assignment 1 — Relational Algebra',
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    isDemo: true,
  },
  {
    id: 'demo-2',
    subject: 'Web Tech',
    title: 'Milestone 2',
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    isDemo: true,
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Manual Task form state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSubject, setTaskSubject] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskFormError, setTaskFormError] = useState('');

  // AI Task Extraction form state
  const [aiInputText, setAiInputText] = useState('');
  const [aiExtractionStep, setAiExtractionStep] = useState<null | 'classifying' | 'extracting' | 'editable'>(null);
  const [aiError, setAiError] = useState('');
  const [extractedData, setExtractedData] = useState<any>(null);

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

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const response = await api.get('/tasks', { headers: getAuthHeaders() });
      setTasks(response.data || []);
    } catch (err) {
      console.error('Error fetching tasks', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    if (user) fetchTasks();
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('campusflow_token');
    localStorage.removeItem('campusflow_user');
    router.push('/');
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskFormError('');

    if (!taskTitle || !taskSubject || !taskDeadline) {
      setTaskFormError('Missing fields');
      return;
    }

    try {
      await api.post(
        '/tasks/manual',
        {
          title: taskTitle,
          subject: taskSubject,
          deadline: new Date(taskDeadline).toISOString(),
          addToCalendar: true,
        },
        { headers: getAuthHeaders() }
      );
      setTaskTitle('');
      setTaskSubject('');
      setTaskDeadline('');
      setShowTaskForm(false);
      fetchTasks();
    } catch (err: any) {
      setTaskFormError(err.response?.data?.error || 'Failed to create task.');
    }
  };

  const handleExtractDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiError('');
    if (!aiInputText.trim()) return;

    try {
      setAiExtractionStep('classifying');
      await api.post('/ai/classify-message', { text: aiInputText });

      setAiExtractionStep('extracting');
      const extractResponse = await api.post(
        '/ai/extract-task',
        { text: aiInputText },
        { headers: getAuthHeaders() }
      );

      const parsedData = extractResponse.data;
      setExtractedData({
        extractionId: parsedData.extractionId,
        title: parsedData.title || '',
        subject: parsedData.subject || '',
        deadline: parsedData.deadline || '',
      });
      setAiExtractionStep('editable');
    } catch (err: any) {
      setAiError(err.response?.data?.error || 'Extraction failed.');
      setAiExtractionStep(null);
    }
  };

  const handleConfirmExtraction = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiError('');

    try {
      await api.post('/tasks/confirm', {
        extractionId: extractedData.extractionId,
        edits: {
          title: extractedData.title,
          subject: extractedData.subject,
          deadline: new Date(extractedData.deadline).toISOString(),
        },
      });

      setExtractedData(null);
      setAiExtractionStep(null);
      setAiInputText('');
      fetchTasks();
    } catch (err: any) {
      setAiError(err.response?.data?.error || 'Confirmation failed.');
    }
  };

  const activeTasksList = tasks.length > 0 ? tasks : (loadingTasks ? [] : demoTasks);
  const colors: ('yellow' | 'blue' | 'pink' | 'green' | 'orange' | 'purple')[] = ['yellow', 'blue', 'pink', 'green', 'orange', 'purple'];
  const getRotation = (index: number) => {
    const rots = [2, -3, 1, -2, 4, -1];
    return rots[index % rots.length];
  };

  if (!user) return <div className="min-h-screen bg-cork flex justify-center items-center font-shrikhand text-2xl">Loading...</div>;

  return (
    <div className="min-h-screen bg-cork p-4 sm:p-8">
      <Doodle type="squiggly" className="top-10 left-10 w-40" />

      {/* HEADER POST-IT */}
      <div className="flex justify-center mb-12">
        <PostIt color="white" tape rotation={1} className="w-full max-w-4xl flex items-center justify-between p-4 px-8">
          <div>
            <h1 className="font-shrikhand text-3xl">CampusFlow</h1>
            <p className="font-caveat text-xl text-ink-light tracking-wider">Welcome, {user.name}!</p>
          </div>
          <div className="flex space-x-4 font-shrikhand">
            <Link href="/study-buddy" className="underline hover:text-blue-500">Study Buddy</Link>
            <Link href="/automations" className="underline hover:text-pink-500">Automations</Link>
            <button onClick={handleLogout} className="underline hover:text-red-500">Sign Out</button>
          </div>
        </PostIt>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[350px_1fr] gap-12 items-start">
        
        {/* LEFT COLUMN: Input Forms */}
        <div className="space-y-8">
          
          <PostIt color="blue" pin pinColor="blue" rotation={-2}>
            <h2 className="font-shrikhand text-2xl mb-4">AI Magic Paste</h2>
            <p className="font-zilla text-sm mb-4">Paste WhatsApp messages or emails here, AI will figure out the deadline.</p>
            
            {aiExtractionStep === 'editable' && extractedData ? (
              <form onSubmit={handleConfirmExtraction} className="space-y-3">
                <input
                  type="text"
                  value={extractedData.title}
                  onChange={e => setExtractedData({...extractedData, title: e.target.value})}
                  className="w-full bg-white/50 border-2 border-ink p-2 font-zilla text-sm"
                />
                <input
                  type="text"
                  value={extractedData.subject}
                  onChange={e => setExtractedData({...extractedData, subject: e.target.value})}
                  className="w-full bg-white/50 border-2 border-ink p-2 font-zilla text-sm"
                />
                <input
                  type="datetime-local"
                  value={extractedData.deadline.substring(0, 16)}
                  onChange={e => setExtractedData({...extractedData, deadline: e.target.value})}
                  className="w-full bg-white/50 border-2 border-ink p-2 font-zilla text-sm"
                />
                <button type="submit" className="w-full mt-2 bg-ink text-white font-shrikhand text-xl py-2">
                  Looks Good!
                </button>
              </form>
            ) : (
              <form onSubmit={handleExtractDeadline} className="space-y-3">
                <textarea
                  value={aiInputText}
                  onChange={e => setAiInputText(e.target.value)}
                  className="w-full h-32 bg-white/50 border-2 border-ink p-2 font-caveat text-xl resize-none"
                  placeholder="Paste message here..."
                />
                <button 
                  type="submit" 
                  disabled={aiExtractionStep !== null}
                  className="w-full bg-ink text-white font-shrikhand text-xl py-2 hover:scale-105 transition-transform"
                >
                  {aiExtractionStep ? 'Thinking...' : 'Extract!'}
                </button>
              </form>
            )}
            {aiError && <p className="font-caveat text-lg text-red-700 mt-2">{aiError}</p>}
          </PostIt>

          {/* Toggle Manual Add */}
          {!showTaskForm ? (
            <button onClick={() => setShowTaskForm(true)} className="font-caveat text-2xl underline rotate-3 ml-10 hover:text-pink-600">
              + Or add manually
            </button>
          ) : (
            <PostIt color="pink" pin pinColor="red" rotation={3}>
              <h2 className="font-shrikhand text-2xl mb-4">Manual Entry</h2>
              <form onSubmit={handleCreateTask} className="space-y-3">
                <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Title" className="w-full bg-white/50 border-2 border-ink p-2 font-zilla text-sm" />
                <input type="text" value={taskSubject} onChange={e => setTaskSubject(e.target.value)} placeholder="Subject" className="w-full bg-white/50 border-2 border-ink p-2 font-zilla text-sm" />
                <input type="datetime-local" value={taskDeadline} onChange={e => setTaskDeadline(e.target.value)} className="w-full bg-white/50 border-2 border-ink p-2 font-zilla text-sm" />
                <button type="submit" className="w-full mt-2 bg-ink text-white font-shrikhand text-xl py-2">Save</button>
                <button type="button" onClick={() => setShowTaskForm(false)} className="w-full font-caveat text-lg underline">Cancel</button>
              </form>
            </PostIt>
          )}
        </div>

        {/* RIGHT COLUMN: Task Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {activeTasksList.map((task, idx) => {
            const date = new Date(task.deadline);
            return (
              <PostIt 
                key={task.id} 
                color={colors[idx % colors.length]} 
                rotation={getRotation(idx)} 
                pin 
                pinColor={['red', 'blue', 'green', 'gold'][idx % 4] as any}
                className="hover:z-20 transition-transform hover:scale-105"
              >
                <div className="font-caveat text-lg uppercase tracking-widest text-ink/70 mb-2">{task.subject}</div>
                <h3 className="font-shrikhand text-2xl mb-4 leading-tight">{task.title}</h3>
                
                <div className="mt-4 border-t-2 border-ink/20 pt-2 flex items-center space-x-2">
                  <span className="font-zilla font-bold">Due:</span>
                  <span className="font-caveat text-xl">{date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {task.isDemo && (
                  <div className="absolute -bottom-4 -right-4 font-caveat text-lg bg-white border-2 border-ink px-2 rotate-12">
                    Demo Task
                  </div>
                )}
              </PostIt>
            );
          })}
        </div>
      </div>
    </div>
  );
}
