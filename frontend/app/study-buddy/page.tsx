'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, getAuthHeaders } from '../../lib/api';
import Link from 'next/link';
import { PostIt, Doodle, cn } from '../../components/ui/Scatterbrain';

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
          studyTime: studyTime ? new Date(studyTime).toISOString() : undefined,
        },
        { headers: getAuthHeaders() }
      );

      setFlashcards(resp.data.flashcards || []);
      setQuiz(resp.data.quiz || []);
      setN8nTriggered(true);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'AI generation failed.');
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

  const InputLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-sm font-semibold mb-1 uppercase tracking-widest font-caveat text-ink-light">
      {children}
    </label>
  );

  const baseInputClass = "w-full bg-white/40 border-2 border-ink p-2 focus:outline-none focus:bg-white transition-colors text-ink placeholder-ink-light/50";

  if (!user) return <div className="min-h-screen bg-paper flex justify-center items-center font-shrikhand text-2xl">Loading...</div>;

  return (
    <div className="min-h-screen bg-paper p-4 sm:p-8 relative-content overflow-x-hidden pb-32">
      <Doodle type="circle" className="top-20 right-10 w-40" />

      {/* HEADER POST-IT */}
      <div className="flex justify-center mb-12 relative z-20">
        <PostIt color="white" tape rotation={-1} className="w-full max-w-4xl flex items-center justify-between p-4 px-8 shadow-md">
          <div>
            <h1 className="font-shrikhand text-3xl">AI Study Buddy</h1>
            <p className="font-caveat text-xl text-ink-light tracking-wider">Turn notes into gold.</p>
          </div>
          <div className="flex space-x-4 font-shrikhand">
            <Link href="/dashboard" className="underline hover:text-blue-500">Dashboard</Link>
            <Link href="/automations" className="underline hover:text-pink-500">Automations</Link>
          </div>
        </PostIt>
      </div>

      <div className="max-w-4xl mx-auto space-y-12">
        {/* INPUT SECTION */}
        <PostIt color="yellow" pin pinColor="red" rotation={1}>
          <h2 className="font-shrikhand text-2xl mb-2">Study Pack Generator</h2>
          <p className="font-zilla text-sm mb-6 text-ink-light">Paste your lecture notes here, and we'll spin up flashcards and a quiz.</p>
          
          {error && <div className="font-caveat text-xl text-red-600 mb-4">{error}</div>}
          {n8nTriggered && <div className="font-caveat text-xl text-green-700 mb-4 rotate-1">✓ Study session added to Calendar & WhatsApp via n8n!</div>}

          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <InputLabel>Subject</InputLabel>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Physics, DBMS..."
                  className={baseInputClass}
                />
              </div>
              <div>
                <InputLabel>Study Time (optional)</InputLabel>
                <input
                  type="datetime-local"
                  value={studyTime}
                  onChange={(e) => setStudyTime(e.target.value)}
                  className={baseInputClass}
                />
              </div>
            </div>

            <div>
              <InputLabel>Lecture Notes</InputLabel>
              <textarea
                required
                rows={6}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Paste the raw text of your notes here..."
                className={cn(baseInputClass, "resize-none font-zilla")}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-ink text-white font-shrikhand text-2xl py-3 hover:scale-105 transition-transform"
            >
              {loading ? loadingStep : 'Generate Study Pack!'}
            </button>
          </form>
        </PostIt>

        {/* FLASHCARDS */}
        {flashcards.length > 0 && (
          <div className="space-y-6 pt-10">
            <h2 className="font-shrikhand text-3xl text-center">Flashcards ({currentCardIdx + 1} / {flashcards.length})</h2>
            <div className="flex justify-center perspective relative">
              <div
                className={cn(
                  "cursor-pointer w-full max-w-md h-64 preserve-3d transition-transform duration-500",
                  isFlipped ? "rotate-y-180" : ""
                )}
                onClick={() => setIsFlipped(!isFlipped)}
              >
                {/* FRONT */}
                <PostIt color="blue" rotation={-2} className="absolute inset-0 backface-hidden flex flex-col justify-center items-center text-center p-8">
                  <div className="font-caveat text-xl tracking-widest uppercase mb-4 opacity-70">Question</div>
                  <div className="font-shrikhand text-2xl">{flashcards[currentCardIdx].question}</div>
                  <div className="absolute bottom-4 font-caveat text-sm opacity-50">Tap to flip</div>
                </PostIt>

                {/* BACK */}
                <PostIt color="green" rotation={1} className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col justify-center items-center text-center p-8">
                  <div className="font-caveat text-xl tracking-widest uppercase mb-4 opacity-70">Answer</div>
                  <div className="font-zilla text-lg leading-snug overflow-y-auto">{flashcards[currentCardIdx].answer}</div>
                </PostIt>
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center space-x-6 pt-4">
              <button
                onClick={() => { setIsFlipped(false); setCurrentCardIdx(Math.max(0, currentCardIdx - 1)); }}
                disabled={currentCardIdx === 0}
                className="font-shrikhand text-xl underline disabled:opacity-30"
              >
                Previous
              </button>
              <button
                onClick={() => { setIsFlipped(false); setCurrentCardIdx(Math.min(flashcards.length - 1, currentCardIdx + 1)); }}
                disabled={currentCardIdx === flashcards.length - 1}
                className="font-shrikhand text-xl underline disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* QUIZ */}
        {quiz.length > 0 && (
          <div className="space-y-6 pt-10">
            <div className="flex justify-between items-end">
              <h2 className="font-shrikhand text-3xl">Pop Quiz</h2>
              {quizSubmitted && (
                <div className="font-caveat text-2xl rotate-2 bg-pink border-2 border-ink px-3 shadow-md">
                  Score: {getScore()} / {quiz.length}
                </div>
              )}
            </div>

            <div className="space-y-6">
              {quiz.map((q, qIdx) => {
                const answerSelected = selectedAnswers[qIdx] !== undefined;
                const isCorrect = selectedAnswers[qIdx] === q.correctIndex;
                
                return (
                  <PostIt key={qIdx} color="white" rotation={qIdx % 2 === 0 ? 1 : -1} className="p-6 pb-8 border-dashed border-2">
                    <h3 className="font-shrikhand text-xl mb-4">{qIdx + 1}. {q.question}</h3>
                    
                    <div className="space-y-3 font-zilla">
                      {q.options.map((opt: string, optIdx: number) => {
                        const isSelected = selectedAnswers[qIdx] === optIdx;
                        const isCorrectOption = optIdx === q.correctIndex;

                        let optClass = 'bg-white/50 border-2 border-ink/20 hover:border-ink/50';
                        if (isSelected) {
                          if (quizSubmitted) {
                            optClass = isCorrect ? 'bg-green border-2 border-ink' : 'bg-red-200 border-2 border-red-500';
                          } else {
                            optClass = 'bg-yellow border-2 border-ink';
                          }
                        } else if (quizSubmitted && isCorrectOption) {
                          optClass = 'border-2 border-green text-green-700 bg-green-50';
                        }

                        return (
                          <label
                            key={optIdx}
                            onClick={() => handleSelectAnswer(qIdx, optIdx)}
                            className={cn(
                              "block w-full py-2 px-4 cursor-pointer transition-all flex items-center space-x-3",
                              optClass
                            )}
                          >
                            <input
                              type="radio"
                              name={`quiz-q-${qIdx}`}
                              checked={isSelected}
                              disabled={quizSubmitted}
                              onChange={() => {}} 
                              className="w-4 h-4 accent-ink"
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  </PostIt>
                );
              })}
            </div>

            <div className="pt-6 text-center">
              {!quizSubmitted ? (
                <button
                  onClick={() => setQuizSubmitted(true)}
                  disabled={Object.keys(selectedAnswers).length < quiz.length}
                  className="bg-ink text-white font-shrikhand text-2xl py-3 px-8 hover:scale-105 transition-transform disabled:opacity-50"
                >
                  Grade Me!
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSelectedAnswers({});
                    setQuizSubmitted(false);
                  }}
                  className="font-caveat text-2xl underline"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
