'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, getAuthHeaders } from '../../lib/api';
import Link from 'next/link';

export default function StudyBuddyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // Note inputs & loading
  const [notes, setNotes] = useState('');
  const [subject, setSubject] = useState('');
  const [studyTime, setStudyTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState('');
  const [n8nTriggered, setN8nTriggered] = useState(false);

  // Generated study pack
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [quiz, setQuiz] = useState<any[]>([]);

  // Flashcards state
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFlashcards([]);
    setQuiz([]);
    setCurrentCardIdx(0);
    setIsFlipped(false);
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setN8nTriggered(false);

    if (!notes.trim()) {
      setError('Please paste lecture notes to begin.');
      return;
    }

    setLoading(true);
    setLoadingStep('Building your flashcards...');

    const delayTimer = setTimeout(() => {
      setLoadingStep('Creating quiz...');
    }, 1500);

    try {
      const resp = await api.post(
        '/ai/generate-study-pack',
        {
          notes,
          subject: subject.trim() || undefined,
          // Only pass studyTime if the user picked one
          studyTime: studyTime ? new Date(studyTime).toISOString() : undefined,
        },
        { headers: getAuthHeaders() }
      );

      setFlashcards(resp.data.flashcards || []);
      setQuiz(resp.data.quiz || []);
      setN8nTriggered(true);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'AI generation failed. Please try a shorter text or check backend availability.');
    } finally {
      clearTimeout(delayTimer);
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleSelectAnswer = (qIdx: number, optionIdx: number) => {
    if (quizSubmitted) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [qIdx]: optionIdx
    }));
  };

  const getScore = () => {
    return quiz.filter((q, index) => selectedAnswers[index] === q.correctIndex).length;
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
        <div className="max-w-4xl mx-auto px-4 h-20 flex items-center justify-between">
          <Link href="/dashboard" className="py-2.5 px-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-sm font-medium transition-all text-gray-300 flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Dashboard</span>
          </Link>
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            CampusFlow
          </span>
          <span className="text-xs text-gray-500 font-light font-mono">Study Pack Generator</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative max-w-3xl mx-auto px-4 pt-10 space-y-8">
        
        {/* Title Block */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
            AI Study Buddy
          </h1>
          <p className="text-sm text-gray-400 font-light max-w-md mx-auto leading-normal">
            Paste your lecture notes — get flashcards and a quiz instantly.
          </p>
        </div>

        {/* Input Text Form */}
        <div className="bg-[#121624]/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md shadow-2xl">
          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleGenerate} className="space-y-5">
            {/* Subject + Study Time row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Subject / Topic</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Physics, DBMS"
                  disabled={loading}
                  className="w-full bg-[#090b11]/80 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Study Session Time <span className="normal-case font-light text-gray-500">(optional)</span></label>
                <input
                  type="datetime-local"
                  value={studyTime}
                  onChange={(e) => setStudyTime(e.target.value)}
                  disabled={loading}
                  className="w-full bg-[#090b11]/80 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Lecture Notes or Reading Content</label>
              <textarea
                required
                rows={8}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Paste lecture notes here..."
                disabled={loading}
                className="w-full bg-[#090b11]/80 border border-white/10 rounded-2xl py-3.5 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none font-light leading-relaxed disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 rounded-xl font-bold shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center space-x-2.5 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="font-semibold text-sm animate-pulse">{loadingStep}</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
                  </svg>
                  <span>Generate Study Pack</span>
                </>
              )}
            </button>

            {/* n8n success banner */}
            {n8nTriggered && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2 animate-slide-down">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Study session added to Google Calendar &amp; WhatsApp notification sent via n8n ✓</span>
              </div>
            )}
          </form>
        </div>

        {/* ==================== FLASHCARDS SECTION ==================== */}
        {flashcards.length > 0 && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-300 to-indigo-300 bg-clip-text text-transparent">Concept Flashcards</h2>
              <span className="text-xs text-gray-400 font-mono bg-white/5 py-1 px-3 border border-white/5 rounded-full">
                Card {currentCardIdx + 1} of {flashcards.length}
              </span>
            </div>

            {/* Flippable Card Container */}
            <div 
              onClick={() => setIsFlipped(!isFlipped)} 
              className="cursor-pointer h-72 w-full perspective"
            >
              <div className={`relative w-full h-full duration-500 preserve-3d transform transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}>
                
                {/* Front of Card (Question) */}
                <div className="absolute inset-0 bg-white text-gray-900 rounded-2xl p-8 flex flex-col justify-between backface-hidden shadow-xl border border-gray-100">
                  <span className="text-[10px] text-purple-600 font-bold uppercase tracking-widest bg-purple-50 py-1 px-3.5 rounded-full w-fit">
                    Question
                  </span>
                  
                  <div className="text-lg font-bold text-center text-gray-800 px-4 leading-normal">
                    {flashcards[currentCardIdx].question}
                  </div>

                  <div className="text-center text-[10px] text-gray-400 font-light flex items-center justify-center space-x-1">
                    <span>Tap card to reveal answer</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.2" />
                    </svg>
                  </div>
                </div>

                {/* Back of Card (Answer) */}
                <div className="absolute inset-0 bg-white text-gray-900 rounded-2xl p-8 flex flex-col justify-between backface-hidden rotate-y-180 shadow-xl border border-gray-100">
                  <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest bg-emerald-50 py-1 px-3.5 rounded-full w-fit">
                    Answer
                  </span>
                  
                  <div className="text-base text-gray-700 text-center font-light leading-relaxed overflow-y-auto max-h-40 px-2">
                    {flashcards[currentCardIdx].answer}
                  </div>

                  <div className="text-center text-[10px] text-gray-400 font-light">
                    Tap to hide answer
                  </div>
                </div>

              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => {
                  setIsFlipped(false);
                  setCurrentCardIdx(prev => Math.max(0, prev - 1));
                }}
                disabled={currentCardIdx === 0}
                className="py-2 px-4 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-xs font-semibold transition-all flex items-center space-x-1 text-gray-300"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Previous</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsFlipped(false);
                  setCurrentCardIdx(prev => Math.min(flashcards.length - 1, prev + 1));
                }}
                disabled={currentCardIdx === flashcards.length - 1}
                className="py-2 px-5 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-xs font-semibold transition-all flex items-center space-x-1"
              >
                <span>Next Card</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ==================== QUIZ SECTION ==================== */}
        {quiz.length > 0 && (
          <div className="space-y-6 pt-6 border-t border-white/5 animate-slide-down">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-300 to-indigo-300 bg-clip-text text-transparent">Knowledge Assessment</h2>
              {quizSubmitted && (
                <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full py-1 px-3.5">
                  You got {getScore()} / {quiz.length} correct.
                </span>
              )}
            </div>

            <div className="space-y-5">
              {quiz.map((q, qIdx) => {
                const answerSelected = selectedAnswers[qIdx] !== undefined;
                const isCorrect = selectedAnswers[qIdx] === q.correctIndex;
                
                return (
                  <div key={qIdx} className="bg-[#121624]/40 border border-white/5 rounded-2xl p-5 space-y-4">
                    <h4 className="text-sm font-bold text-gray-200">
                      {qIdx + 1}. {q.question}
                    </h4>

                    <div className="grid grid-cols-1 gap-2.5">
                      {q.options.map((opt: string, optIdx: number) => {
                        const isSelected = selectedAnswers[qIdx] === optIdx;
                        const isCorrectOption = optIdx === q.correctIndex;

                        let optClass = 'bg-[#090b11]/50 border-white/10 text-gray-300 hover:bg-[#090b11]/80';
                        if (isSelected) {
                          if (quizSubmitted) {
                            optClass = isCorrect 
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                              : 'bg-red-500/20 border-red-500 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.1)]';
                          } else {
                            optClass = 'bg-purple-500/20 border-purple-500 text-purple-300';
                          }
                        } else if (quizSubmitted && isCorrectOption) {
                          // Highlight correct option if user got it wrong
                          optClass = 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300';
                        }

                        return (
                          <label
                            key={optIdx}
                            onClick={() => handleSelectAnswer(qIdx, optIdx)}
                            className={`w-full py-2.5 px-4 text-left rounded-xl border text-xs font-medium cursor-pointer transition-all flex items-center space-x-3 select-none ${optClass}`}
                          >
                            <input
                              type="radio"
                              name={`quiz-q-${qIdx}`}
                              checked={isSelected}
                              disabled={quizSubmitted}
                              onChange={() => {}} // handled by click
                              className="w-4 h-4 text-purple-600 focus:ring-purple-500 bg-[#090b11] border-white/10 focus:ring-offset-[#121624] pointer-events-none"
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Calm and specific feedback message */}
                    {quizSubmitted && (
                      <div className={`mt-3 p-3 rounded-xl text-xs font-light ${
                        isCorrect 
                          ? 'bg-emerald-500/5 border border-emerald-500/10 text-emerald-300' 
                          : 'bg-red-500/5 border border-red-500/10 text-red-300'
                      }`}>
                        {isCorrect ? (
                          <span>
                            <b>Correct</b> — Option {String.fromCharCode(65 + q.correctIndex)} accurately reflects the concepts described in your lecture notes.
                          </span>
                        ) : (
                          <span>
                            <b>Incorrect</b> — The correct answer is Option {String.fromCharCode(65 + q.correctIndex)}. Option {String.fromCharCode(65 + (selectedAnswers[qIdx] || 0))} does not align with the context from your notes.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!quizSubmitted ? (
              <button
                onClick={() => setQuizSubmitted(true)}
                disabled={Object.keys(selectedAnswers).length < quiz.length}
                className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:pointer-events-none rounded-xl font-bold shadow-lg shadow-purple-600/10 transition-all text-sm"
              >
                Submit Quiz
              </button>
            ) : (
              <button
                onClick={() => {
                  setSelectedAnswers({});
                  setQuizSubmitted(false);
                }}
                className="w-full py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl font-semibold transition-all text-sm text-gray-300"
              >
                Reset Assessment
              </button>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
