import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useToast } from '../components/Toast';
import { Loader2, Moon, Sun, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { DEMO_SESSION_KEY, isDemoCredentials } from '../services/demoData';

const USERNAME_EMAIL_DOMAINS = ['algoritmia.team', 'car.algoritmia.com'];

const toAuthEmails = (input: string) => {
  const clean = input.trim().toLowerCase();
  return clean.includes('@') ? [clean] : USERNAME_EMAIL_DOMAINS.map((domain) => `${clean}@${domain}`);
};

const toPrimaryAuthEmail = (input: string) => {
  return toAuthEmails(input)[0];
};

type Mode = 'login' | 'reset';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { darkMode, toggleDarkMode } = useTheme();
  const { session } = useAuth();

  useEffect(() => {
    if (session) navigate('/dashboard');
  }, [session, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { showToast('Completá todos los campos', 'error'); return; }
    setLoading(true);
    try {
      const authEmails = toAuthEmails(email);
      if (authEmails.some((authEmail) => isDemoCredentials(authEmail, password))) {
        localStorage.setItem(DEMO_SESSION_KEY, '1');
        window.dispatchEvent(new Event('car-demo-login'));
        navigate('/dashboard', { replace: true });
        return;
      }
      let lastError: any = null;
      for (const authEmail of authEmails) {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password,
        });
        if (!error) return;
        lastError = error;
        if (email.includes('@')) break;
        const message = String(error.message || '').toLowerCase();
        if (!message.includes('invalid')) break;
      }
      if (lastError) throw lastError;
    } catch (error: any) {
      showToast(error.message || 'Error al iniciar sesión', 'error');
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { showToast('Ingresá tu email', 'error'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(toPrimaryAuthEmail(email), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (error: any) {
      showToast(error.message || 'Error al enviar el email', 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full h-11 px-3.5 rounded-xl border text-[13px] font-semibold outline-none transition-all duration-200 ${
    darkMode
      ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-emerald-500/80 focus:bg-zinc-750 focus:ring-4 focus:ring-emerald-500/10'
      : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500/80 focus:ring-4 focus:ring-emerald-500/10'
  }`;

  const labelClass = `text-[9.5px] font-bold uppercase tracking-wider ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`;

  return (
    <div
      className={`relative flex flex-col font-sans overflow-y-auto ${darkMode ? 'bg-[#060606]' : 'bg-[#f8f9fa]'}`}
      style={{ minHeight: '100dvh' }}
    >
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b transition-all duration-300 ${darkMode ? 'bg-[#060606]/85 border-white/[0.04]' : 'bg-[#f8f9fa]/85 border-zinc-200/40'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-[68px] flex items-center justify-between">
          <div className="flex items-center gap-2.5 md:gap-3.5">
            <img
              src={darkMode ? '/assets/logoSinFondo.png' : '/assets/logoAlgoritmia1.webp'}
              alt="Algoritmia"
              className="w-8 h-8 md:w-9 md:h-9 object-contain"
            />
            <div>
              <span className={`text-[13px] md:text-[14px] font-bold tracking-tight uppercase leading-none block font-display ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
                Algoritmia
              </span>
              <span className="text-[8px] md:text-[9px] font-bold text-violet-500 tracking-[0.24em] uppercase block mt-0.5 md:mt-1">Gestión</span>
            </div>
          </div>

          <button
            onClick={toggleDarkMode}
            className={`w-9 h-9 md:w-10 md:h-10 rounded-lg border flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 ${
              darkMode ? 'bg-zinc-900/80 border-zinc-500/35 text-zinc-400 hover:bg-zinc-800/90 hover:border-zinc-400/45 hover:text-zinc-100' : 'bg-white border-zinc-200/60 text-zinc-500 hover:bg-zinc-50 shadow-sm'
            }`}
            aria-label="Cambiar tema"
          >
            {darkMode ? <Sun className="w-[18px] h-[18px] text-amber-400" /> : <Moon className="w-[18px] h-[18px] text-zinc-500" />}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-[360px] animate-in fade-in slide-in-from-bottom-5 duration-700">

          {/* Logo + title */}
          <div className="flex flex-col items-center mb-6 text-center">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 ${
              darkMode ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-white border border-zinc-200/50 shadow-sm'
            }`}>
              <img
                src={darkMode ? '/assets/logoSinFondo.png' : '/assets/logoAlgoritmia1.webp'}
                alt="Algoritmia"
                className="w-9 h-9 object-contain"
              />
            </div>
            <h1 className={`text-[22px] font-black tracking-tight ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
              {mode === 'login' ? 'Iniciar sesión' : 'Recuperar contraseña'}
            </h1>
            <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400 mt-1.5 font-semibold">
              Ecosistema de Algoritmia
            </p>
          </div>

          {/* Card */}
          <div className={`rounded-3xl p-6 backdrop-blur-md transition-all duration-500 ${
            darkMode
              ? 'bg-[#0f0f0f]/80 border border-white/[0.07] shadow-[0_20px_50px_rgba(0,0,0,0.6)]'
              : 'bg-white/90 border border-zinc-200/60 shadow-[0_20px_40px_rgba(0,0,0,0.03)]'
          }`}>

            {mode === 'reset' ? (
              resetSent ? (
                <div className="text-center space-y-3 py-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Email enviado</p>
                  <p className="text-[12px] text-zinc-500">Revisá tu casilla y hacé clic en el link para restablecer tu contraseña.</p>
                  <button
                    onClick={() => { setMode('login'); setResetSent(false); setEmail(''); }}
                    className="text-[12px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                  >
                    ← Volver al inicio de sesión
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  <p className={`text-[12px] mb-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Ingresá tu email y te enviamos un link para restablecer tu contraseña.
                  </p>
                  <div className="space-y-1.5">
                    <label className={labelClass}>Email</label>
                    <input
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full h-9 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 ${
                      darkMode ? 'bg-white text-zinc-950 hover:bg-zinc-100' : 'bg-zinc-900 text-white hover:bg-zinc-800'
                    }`}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar link de recuperación'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setEmail(''); }}
                    className={`w-full text-center text-[11px] font-semibold ${darkMode ? 'text-zinc-600 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-600'} transition-colors`}
                  >
                    ← Volver al inicio de sesión
                  </button>
                </form>
              )
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className={labelClass}>Email o Usuario</label>
                  <input
                    type="text"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${inputClass} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3.5 top-1/2 -translate-y-1/2 p-1 transition-all ${darkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'}`}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 h-9 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 ${
                      darkMode ? 'bg-white text-zinc-950 hover:bg-zinc-100' : 'bg-zinc-900 text-white hover:bg-zinc-800'
                    }`}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Ingresar</span>}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => { setMode('reset'); setPassword(''); }}
                  className={`w-full text-center text-[11px] font-semibold pt-1 ${darkMode ? 'text-zinc-600 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-600'} transition-colors`}
                >
                  Olvidé mi contraseña
                </button>
              </form>
            )}
          </div>

          {/* Help */}
          <div className="flex justify-center mt-6">
            <a
              href="https://wa.me/5493476245523?text=Hola,%20necesito%20ayuda%20para%20ingresar%20al%20sistema%20de%20clientes%20de%20C.A.R."
              target="_blank"
              rel="noopener noreferrer"
              className={`text-[11.5px] font-semibold tracking-wide transition-all hover:underline ${
                darkMode ? 'text-zinc-600 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-500'
              }`}
            >
              ¿Necesitás ayuda con tu acceso?
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
