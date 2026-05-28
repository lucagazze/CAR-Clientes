import React, { useState, useRef, useEffect } from 'react';
import { Mic, ChevronUp, CornerDownLeft, X, Loader2, Sparkles, RotateCcw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AIChatFloat = () => {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, isThinking]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (isOpen && !isRecording && !isTranscribing) setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, isRecording, isTranscribing]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const buildSystemPrompt = () => {
    const clientName = profile?.business_name || profile?.email || 'el cliente';
    return `Sos el asistente de marketing digital de Algoritmia para ${clientName}.
Tu nombre es "Algo". Respondés en español argentino, amigable y profesional.
Ayudás con dudas sobre campañas de email marketing, Meta Ads, estrategias de captación, retención y resultados de la tienda.
Si te preguntan algo muy específico que requiere revisar datos en tiempo real, deciles que pueden verlo en la plataforma.
Sé conciso: máximo 3 párrafos por respuesta. Usá emojis con moderación.`;
  };

  const handleSend = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || isThinking) return;

    const userMsg: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsThinking(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          systemPrompt: buildSystemPrompt(),
        }),
      });

      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Hubo un problema técnico. Por favor intentá de nuevo.',
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  // ── Voice recording ──────────────────────────────────────────────────────
  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
      else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 64000 });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setIsRecording(false);
        setIsTranscribing(true);
        try {
          const base64 = await blobToBase64(audioBlob);
          // Send to Whisper via OpenAI
          const formData = new FormData();
          formData.append('file', new Blob([audioBlob], { type: mimeType }), `audio.${mimeType.split('/')[1]}`);
          formData.append('model', 'whisper-1');
          formData.append('language', 'es');

          // Use our serverless proxy for transcription too
          const transcribeRes = await fetch('/api/transcribe', {
            method: 'POST',
            body: JSON.stringify({ audio: base64, mimeType }),
            headers: { 'Content-Type': 'application/json' },
          });

          if (transcribeRes.ok) {
            const { text } = await transcribeRes.json();
            if (text) {
              setInput(text.trim());
              setIsOpen(true);
              setTimeout(() => inputRef.current?.focus(), 100);
            }
          }
        } catch (e) {
          console.error('Transcription error:', e);
        } finally {
          setIsTranscribing(false);
        }
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setIsOpen(true);
    } catch {
      alert('No se pudo acceder al micrófono.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleMicClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRecording) stopRecording();
    else if (input.trim()) handleSend();
    else startRecording();
  };

  const clearChat = () => {
    setMessages([]);
    setInput('');
  };

  const quickPrompts = [
    '¿Cómo van las campañas este mes?',
    '¿Qué emails están programados?',
    '¿Cómo mejorar mi tasa de apertura?',
  ];

  return (
    <div
      ref={containerRef}
      className="fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-500 w-[95%] md:w-[700px] bottom-6 print:hidden"
    >
      {/* ── Chat panel ── */}
      <div className={`absolute bottom-full mb-3 w-full bg-white/95 backdrop-blur-2xl border border-zinc-200/50 shadow-2xl rounded-3xl overflow-hidden transition-all duration-300 origin-bottom flex flex-col ${
        isOpen ? 'opacity-100 scale-100 h-[70vh] md:h-[480px]' : 'opacity-0 scale-95 h-0 pointer-events-none'
      }`}>

        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-100 bg-zinc-50/80 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-zinc-800 leading-none">Algo IA</p>
              <p className="text-[9px] text-zinc-400 mt-0.5">Asistente de Algoritmia</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors"
                title="Limpiar chat"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/30">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 pb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-200 dark:border-violet-800 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-violet-500 opacity-60" />
              </div>
              <p className="text-[12px] text-zinc-400 text-center max-w-[220px]">
                Hola 👋 Soy <strong>Algo</strong>, tu asistente de marketing. ¿En qué te ayudo hoy?
              </p>
              {/* Quick prompts */}
              <div className="flex flex-col gap-1.5 w-full max-w-[320px]">
                {quickPrompts.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="text-left text-[11px] font-medium text-zinc-600 bg-white border border-zinc-200 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 px-3 py-2 rounded-xl transition-all shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5 shadow-sm">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              )}
              <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-black text-white rounded-br-sm'
                  : 'bg-white border border-zinc-100 text-zinc-800 rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <div className="bg-white border border-zinc-100 px-3.5 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-2 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {isRecording && (
            <div className="flex justify-end">
              <div className="bg-red-50 border border-red-100 px-3 py-2 rounded-2xl rounded-br-sm flex items-center gap-2 animate-pulse text-[12px] text-red-600 font-bold">
                <div className="w-2 h-2 rounded-full bg-red-500" /> Escuchando...
              </div>
            </div>
          )}

          {isTranscribing && (
            <div className="flex justify-end">
              <div className="bg-blue-50 border border-blue-100 px-3 py-2 rounded-2xl rounded-br-sm flex items-center gap-2 text-[12px] text-blue-600 font-bold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Transcribiendo...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Pill input bar — identical design to AIActionCenter ── */}
      <div
        onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
        className={`relative group bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl shadow-indigo-500/20 rounded-full transition-all duration-300 cursor-text flex items-center px-2 py-2 md:px-3 ${
          isOpen ? 'ring-2 ring-violet-500/20 scale-100' : 'hover:scale-105 hover:bg-white'
        }`}
      >
        {/* Mic / Send / Loading button */}
        <div
          onClick={handleMicClick}
          className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-500 cursor-pointer flex-shrink-0 ${
            isThinking || isTranscribing
              ? 'bg-indigo-500 animate-pulse'
              : isRecording
              ? 'bg-red-500 scale-110 shadow-red-500/50'
              : input.trim()
              ? 'bg-violet-600 hover:bg-violet-700'
              : 'bg-black hover:bg-zinc-800'
          }`}
        >
          {isThinking || isTranscribing
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : isRecording
            ? <div className="w-3 h-3 rounded-sm bg-white" />
            : input.trim()
            ? <CornerDownLeft className="w-5 h-5" />
            : <Mic className="w-5 h-5" />
          }
        </div>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !isThinking && !isTranscribing && handleSend()}
          placeholder={
            isRecording ? 'Escuchando...'
            : isTranscribing ? 'Transcribiendo...'
            : '¿En qué te ayudo hoy?'
          }
          disabled={isRecording || isTranscribing || isThinking}
          className="flex-1 bg-transparent border-none outline-none text-sm md:text-base text-zinc-800 placeholder:text-zinc-500 font-medium px-2 md:px-4 h-full min-w-0"
          autoComplete="off"
        />

        <div className="flex items-center gap-2 pr-2 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); setIsOpen(o => !o); }}
            className="hidden md:flex text-zinc-300 hover:text-zinc-500 transition-colors"
          >
            <ChevronUp className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
