'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { PostIt, Doodle } from '../components/ui/Scatterbrain';
import { cn } from '../components/ui/Scatterbrain';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('1');
  const [subjectsText, setSubjectsText] = useState('');
  const [phone, setPhone] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('campusflow_token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email: loginEmail,
        password: loginPassword,
      });

      const { token, user } = response.data;
      localStorage.setItem('campusflow_token', token);
      localStorage.setItem('campusflow_user', JSON.stringify(user));
      
      setSuccess('Logged in! Redirecting...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const subjects = subjectsText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (subjects.length === 0) {
      setError('Please enter at least one subject.');
      setLoading(false);
      return;
    }

    try {
      await api.post('/auth/register', {
        name,
        branch,
        year: Number(year),
        subjects,
        phone,
        email: registerEmail,
        password: registerPassword,
      });

      setSuccess('Registration successful!');
      setTimeout(() => {
        setLoginEmail(registerEmail);
        setIsLogin(true);
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const InputLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-sm font-semibold mb-1 uppercase tracking-widest font-caveat text-ink-light">
      {children}
    </label>
  );

  const baseInputClass = "w-full bg-white/40 border-2 border-ink p-2 focus:outline-none focus:bg-white transition-colors text-ink placeholder-ink-light/50";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Doodle type="circle" className="top-10 left-10 w-32 h-32" />
      <Doodle type="x" className="bottom-10 right-10 w-16 h-16" />

      <PostIt color="yellow" pin tape rotation={-1} className="w-full max-w-lg z-10">
        <div className="text-center mb-6">
          <h1 className="font-shrikhand text-5xl mb-2">CampusFlow</h1>
          <p className="font-caveat text-2xl rotate-3 inline-block">AI Study Hub</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex gap-4 mb-6 border-b-2 border-ink pb-4">
          <button
            onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
            className={cn(
              "flex-1 font-shrikhand text-2xl transition-transform",
              isLogin ? "scale-110 underline decoration-4 underline-offset-4" : "opacity-50 hover:opacity-100"
            )}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
            className={cn(
              "flex-1 font-shrikhand text-2xl transition-transform",
              !isLogin ? "scale-110 underline decoration-4 underline-offset-4" : "opacity-50 hover:opacity-100"
            )}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-4 font-caveat text-xl bg-pink p-3 border-2 border-ink -rotate-1">
            Oops! {error}
          </div>
        )}
        {success && (
          <div className="mb-4 font-caveat text-xl bg-green p-3 border-2 border-ink rotate-1">
            Yay! {success}
          </div>
        )}

        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <InputLabel>Email Address</InputLabel>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className={baseInputClass}
                placeholder="you@domain.com"
              />
            </div>
            <div>
              <InputLabel>Password</InputLabel>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className={baseInputClass}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-ink text-white font-shrikhand text-2xl py-3 hover:scale-105 transition-transform"
            >
              {loading ? 'Verifying...' : 'Let me in!'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <InputLabel>Full Name</InputLabel>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={baseInputClass}
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <InputLabel>Branch</InputLabel>
                <input
                  type="text"
                  required
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className={baseInputClass}
                  placeholder="CS"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <InputLabel>Year</InputLabel>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className={baseInputClass}
                >
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
              <div>
                <InputLabel>Phone</InputLabel>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={baseInputClass}
                  placeholder="+1234567890"
                />
              </div>
            </div>

            <div>
              <InputLabel>Subjects (Comma Separated)</InputLabel>
              <input
                type="text"
                required
                value={subjectsText}
                onChange={(e) => setSubjectsText(e.target.value)}
                className={baseInputClass}
                placeholder="CS101, Calculus..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <InputLabel>Email</InputLabel>
                <input
                  type="email"
                  required
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className={baseInputClass}
                  placeholder="jane@student.edu"
                />
              </div>
              <div>
                <InputLabel>Password</InputLabel>
                <input
                  type="password"
                  required
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className={baseInputClass}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-ink text-white font-shrikhand text-2xl py-3 hover:scale-105 transition-transform"
            >
              {loading ? 'Creating...' : 'Sign Me Up!'}
            </button>
          </form>
        )}
      </PostIt>
      
      {/* Decorative side notes */}
      <div className="absolute top-20 right-[15%] hidden md:block">
        <PostIt color="blue" pin pinColor="blue" rotation={12} className="p-4 max-w-[200px]">
          <p className="font-caveat text-xl">Sign in to organize your academic chaos! :)</p>
        </PostIt>
      </div>
      
      <div className="absolute bottom-20 left-[15%] hidden md:block">
        <PostIt color="pink" pin pinColor="red" rotation={-8} className="p-4 max-w-[180px]">
          <p className="font-caveat text-xl">Don't forget your deadlines!</p>
        </PostIt>
      </div>
    </div>
  );
}