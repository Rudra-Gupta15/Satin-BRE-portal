import { useEffect, useState } from 'react';
import { Mail, Lock, Shield, Zap, Users, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { api } from '../api/client';
import Logo from './Logo';

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateCaptcha = async () => {
    try {
      const data = await api.get('/auth/captcha');
      setCaptchaCode(data.captchaCode);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both Email ID / Username and Password.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const data = await api.post('/auth/login', { email, password, captchaInput, captchaCode });
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
      generateCaptcha();
      setCaptchaInput('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 sm:p-8 font-sans">
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        
        {/* Left Side: Hero Graphic & Value Props */}
        <div className="space-y-6 text-left pr-0 md:pr-6">
          
          {/* Rickshaw / Platform Image */}
          <div className="flex justify-center md:justify-start">
            <div className="relative max-w-sm w-full">
              <img
                src="/pink_ev_auto_rickshaw.jpg"
                alt="SFL Training — BRE AI Financial Risk & Underwriting Platform"
                className="w-full h-auto object-contain rounded-2xl shadow-lg mix-blend-multiply"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </div>

          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
              Welcome Back!
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Sign in to access the SFL Training BRE data platform
            </p>
          </div>

          {/* Feature List */}
          <div className="space-y-4 pt-2">
            <div className="flex items-start space-x-3.5">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-800 shrink-0 mt-0.5">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Secure Access</h4>
                <p className="text-xs text-slate-500">Your data is protected with enterprise-grade security</p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-purple-700 shrink-0 mt-0.5">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Seamless Experience</h4>
                <p className="text-xs text-slate-500">Fast, unified access across every data product</p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-800 shrink-0 mt-0.5">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Role Based Access</h4>
                <p className="text-xs text-slate-500">Access features and applications based on your role</p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Login Card */}
        <div className="flex justify-center md:justify-end">
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200 max-w-md w-full space-y-5 relative">
            
            {/* Top Logo Badge */}
            <div className="flex justify-center mb-2">
              <Logo imgClassName="h-12 w-auto" />
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-2xl font-extrabold text-slate-800">Login</h2>
              <p className="text-xs text-slate-400">Please enter the login credentials</p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              
              {/* Email / Username Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Email ID / Username</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Email ID"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#ea580c] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#ea580c] focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Captcha Section */}
              <div className="flex items-center space-x-2 pt-1">
                <div className="bg-slate-100 border border-slate-200 px-3.5 py-2.5 rounded-xl font-mono italic text-sm font-bold text-slate-800 tracking-widest select-none shrink-0 line-through decoration-purple-400">
                  {captchaCode}
                </div>

                <input
                  type="text"
                  placeholder="Enter Captcha"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#ea580c] transition-all"
                />

                <button
                  type="button"
                  onClick={generateCaptcha}
                  title="Refresh Captcha"
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl font-bold text-sm btn-orange text-white shadow-lg shadow-orange-900/15 transition-all cursor-pointer mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Signing in...' : 'Login'}
              </button>

            </form>

            {/* Forgot Password Link */}
            <div className="pt-4 border-t border-slate-100 text-center">
              <a href="#forgot" onClick={(e) => { e.preventDefault(); alert("Forgot Password link clicked."); }} className="text-purple-800 hover:underline text-xs font-semibold">
                Forgot Password?
              </a>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
