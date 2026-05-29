import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useViewAs } from '../contexts/ViewAsContext';
import { MessageSquare, Zap, Clock, CheckCircle, Bot, ArrowRight } from 'lucide-react';

const FEATURES = [
  { icon: Bot, title: 'IA en WhatsApp', desc: 'Respuestas automáticas inteligentes 24/7 para tus clientes.', color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-100 dark:border-violet-500/20' },
  { icon: Clock, title: 'Tiempo de respuesta', desc: 'Métricas de tiempo promedio de atención y resolución.', color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-500/20' },
  { icon: CheckCircle, title: 'Consultas resueltas', desc: 'Estadísticas de consultas resueltas por IA vs. escalado humano.', color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-500/20' },
  { icon: Zap, title: 'Automatizaciones', desc: 'Flujos de respuesta personalizados por tipo de consulta.', color: 'from-orange-500 to-amber-600', bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-500/20' },
];

export default function AtencionPage() {
  const { profile: authProfile } = useAuth();
  const { viewAsProfile, isViewingAs } = useViewAs();
  const profile = isViewingAs ? viewAsProfile : authProfile;

  return (
    <div className="max-w-[900px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-3 duration-400">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Módulo A
          </div>
          <h1 className="text-[24px] font-bold tracking-tight text-zinc-900 dark:text-white">
            Atención al Cliente
          </h1>
          <p className="text-[13px] text-zinc-400 dark:text-zinc-500 mt-1 font-medium">
            Chat automatizado con IA y soporte en tiempo real.
          </p>
        </div>
      </div>

      {/* Coming soon banner */}
      <div className="relative bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-3xl p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-20 -translate-x-12 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-black text-violet-200 uppercase tracking-widest mb-1">Próximamente</div>
              <h2 className="text-[18px] font-bold text-white leading-tight">Dashboard de Atención</h2>
            </div>
          </div>
          <p className="text-[13px] text-violet-100 leading-relaxed max-w-[480px]">
            Pronto podrás ver todas las métricas de tu sistema de atención al cliente con IA: consultas resueltas, tiempo de respuesta, flujos activos y estadísticas de escalado.
          </p>
          <div className="flex items-center gap-2 mt-5 text-white/70 text-[12px] font-bold">
            <Zap className="w-3.5 h-3.5" />
            En desarrollo · Disponible próximamente
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div>
        <h2 className="text-[13px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4">
          Lo que vas a poder ver
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc, color, bg, text, border }) => (
            <div
              key={title}
              className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 flex gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${text}`} />
              </div>
              <div>
                <h3 className="text-[13px] font-bold text-zinc-900 dark:text-white mb-0.5">{title}</h3>
                <p className="text-[12px] text-zinc-400 dark:text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
