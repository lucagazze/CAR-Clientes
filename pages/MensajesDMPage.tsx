import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  Instagram, Loader2, RefreshCw, AlertCircle, Inbox, Sparkles, Send,
  Search, MessageSquare, Clock, CheckCheck, Check
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useViewAs } from '../contexts/ViewAsContext';
import { metaAds } from '../services/metaAds';
import { db } from '../services/db';
import EmailLoader from '../components/ui/EmailLoader';

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
}

const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ value, className = '', ...props }, ref) => {
    const localRef = React.useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || localRef;
    React.useEffect(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }, [value, textareaRef]);
    return (
      <textarea
        ref={textareaRef}
        value={value}
        className={`${className} overflow-hidden resize-none`}
        rows={1}
        {...props}
      />
    );
  }
);
AutoResizeTextarea.displayName = 'AutoResizeTextarea';

export default function MensajesDMPage() {
  const { isViewingAs, viewAsProfile } = useViewAs();
  const { profile: authProfile, user } = useAuth();
  const profile = isViewingAs ? viewAsProfile : authProfile;
  const clientId = profile?.id;

  const fbPageId = (profile as any)?.fb_page_id;
  const igId = (profile as any)?.ig_business_id;
  const igUsername = (profile as any)?.ig_username;

  const [loading, setLoading] = useState(true);
  const [dmsError, setDmsError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'instagram' | 'facebook'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'responded'>('all');

  // All conversations
  const [conversations, setConversations] = useState<any[]>([]);

  // Selected conversation & its messages
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [convMessages, setConvMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set FB page ID for service token lookup
  useEffect(() => {
    if (fbPageId) localStorage.setItem('active_fb_page_id', fbPageId);
  }, [fbPageId]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convMessages]);

  // Load conversations
  useEffect(() => {
    if (!fbPageId) return;
    let active = true;
    setLoading(true);
    setDmsError(null);

    const load = async () => {
      try {
        const [igDMs, fbDMs] = await Promise.all([
          // Instagram DMs: base node must be the IG Business Account ID
          igId
            ? metaAds.getInstagramConversations(fbPageId, igId).catch(err => {
                console.error('Error IG DMs:', err);
                setDmsError(prev => [prev, `Instagram: ${err.message}`].filter(Boolean).join(' | '));
                return null;
              })
            : Promise.resolve(null),
          // Facebook Messenger DMs: base node is the FB Page ID
          fbPageId
            ? metaAds.getPageConversations(fbPageId, 'messenger').catch(err => {
                console.error('Error FB DMs:', err);
                setDmsError(prev => [prev, `Facebook: ${err.message}`].filter(Boolean).join(' | '));
                return null;
              })
            : Promise.resolve(null),
        ]);

        if (!active) return;

        const items: any[] = [];

        // Instagram DMs
        if (igDMs?.data) {
          igDMs.data.forEach((conv: any) => {
            const lastMsg = conv.messages?.data?.[0];
            const participant = conv.participants?.data?.find((p: any) => p.id !== fbPageId);
            const isFromMe = lastMsg?.from?.id === fbPageId;
            items.push({
              id: conv.id,
              type: 'ig_dm',
              platform: 'instagram',
              username: participant?.name || lastMsg?.from?.username || 'Usuario de Instagram',
              lastMessage: lastMsg?.message || '(Archivo adjunto)',
              timestamp: lastMsg?.created_time || conv.updated_time,
              unread: conv.unread_count > 0,
              isPending: !isFromMe, // pending if last message is from the user
              rawItem: conv,
            });
          });
        }

        // Facebook Messenger DMs
        if (fbDMs?.data) {
          fbDMs.data.forEach((conv: any) => {
            const lastMsg = conv.messages?.data?.[0];
            const participant = conv.participants?.data?.find((p: any) => p.id !== fbPageId);
            const isFromMe = lastMsg?.from?.id === fbPageId;
            items.push({
              id: conv.id,
              type: 'fb_dm',
              platform: 'facebook',
              username: participant?.name || lastMsg?.from?.name || 'Usuario de Messenger',
              lastMessage: lastMsg?.message || '(Archivo adjunto)',
              timestamp: lastMsg?.created_time || conv.updated_time,
              unread: conv.unread_count > 0,
              isPending: !isFromMe,
              rawItem: conv,
            });
          });
        }

        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setConversations(items);
      } catch (err: any) {
        if (active) setDmsError(err.message || 'Error al cargar mensajes.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [fbPageId, refreshKey]);

  // Load conversation history when one is selected
  const loadConversationHistory = useCallback(async (conv: any) => {
    setLoadingMessages(true);
    setConvMessages([]);
    setReplyText('');
    setReplyError(null);
    try {
      const res = await metaAds.getConversationMessages(conv.id);
      const msgs = (res?.data || []).reverse();
      setConvMessages(msgs);
    } catch (err) {
      console.error('Error loading conversation history:', err);
      const fallback = conv.rawItem?.messages?.data ? [...conv.rawItem.messages.data].reverse() : [];
      setConvMessages(fallback);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const handleSelectConv = (conv: any) => {
    setSelectedConv(conv);
    loadConversationHistory(conv);
  };

  // Send reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedConv) return;
    setSendingReply(true);
    setReplyError(null);
    try {
      await metaAds.replyToConversation(selectedConv.id, replyText.trim());

      // Log activity
      if (user?.id && clientId) {
        db.activity.log(user.id, clientId, 'reply_sent', {
          reply_text: replyText.trim(),
          incoming_text: selectedConv.lastMessage || '',
          platform: selectedConv.type,
          item_id: selectedConv.id,
          user_email: user.email || 'Desconocido',
        }).catch(() => {});
      }

      // Add message locally
      const newMsg = {
        id: `local_${Date.now()}`,
        from: { id: fbPageId },
        message: replyText.trim(),
        created_time: new Date().toISOString(),
      };
      setConvMessages(prev => [...prev, newMsg]);
      setReplyText('');

      // Update conversation list
      setConversations(prev => prev.map(c =>
        c.id === selectedConv.id
          ? { ...c, lastMessage: replyText.trim(), isPending: false, timestamp: new Date().toISOString() }
          : c
      ));
      setSelectedConv((prev: any) => prev ? { ...prev, isPending: false } : prev);
    } catch (err: any) {
      setReplyError('No se pudo enviar el mensaje. El token puede no tener permisos de escritura.');
    } finally {
      setSendingReply(false);
    }
  };

  // Generate AI draft using the last 15 messages as conversation context
  const generateAiDraft = async () => {
    if (!selectedConv || !clientId) return;
    setLoadingDraft(true);
    setReplyError(null);
    try {
      // Build conversation history from the last 15 messages (oldest → newest)
      const last15 = convMessages.slice(-15);
      const conversationHistory = last15.map(msg => {
        const isMe = msg.from?.id === fbPageId;
        const sender = isMe ? 'Marca' : selectedConv.username;
        return `${sender}: ${msg.message || '(archivo adjunto)'}` ;
      });

      const res = await fetch('/api/draft-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          itemText: selectedConv.lastMessage || '',
          username: selectedConv.username || '',
          postCaption: '',
          otherComments: [],
          conversationHistory,
          isDM: true,
        }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      if (data.draft) setReplyText(data.draft);
    } catch (err) {
      setReplyError('No se pudo generar el borrador con IA.');
    } finally {
      setLoadingDraft(false);
    }
  };

  // Filtered conversations
  const filteredConvs = useMemo(() => {
    let list = conversations;
    if (platformFilter !== 'all') list = list.filter(c => c.platform === platformFilter);
    if (statusFilter === 'pending') list = list.filter(c => c.isPending);
    if (statusFilter === 'responded') list = list.filter(c => !c.isPending);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.username.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q));
    }
    return list;
  }, [conversations, platformFilter, statusFilter, searchQuery]);

  const pendingCount = useMemo(() => conversations.filter(c => c.isPending).length, [conversations]);
  const igCount = useMemo(() => conversations.filter(c => c.platform === 'instagram').length, [conversations]);
  const fbCount = useMemo(() => conversations.filter(c => c.platform === 'facebook').length, [conversations]);

  const formatTime = (ts: string) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60_000) return 'Ahora';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
    if (diff < 86_400_000) return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  };

  if (!fbPageId && !igId) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          <Inbox className="w-8 h-8 text-zinc-400" />
        </div>
        <h2 className="text-[18px] font-black text-zinc-800 dark:text-zinc-200">Sin cuentas conectadas</h2>
        <p className="text-[13px] text-zinc-500 max-w-sm">
          Necesitás conectar tu cuenta de Instagram o Facebook en la sección de configuración.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-[1400px] mx-auto animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-zinc-200/60 dark:border-zinc-800/60 flex-shrink-0">
        <div>
          <h1 className="text-[24px] font-black tracking-tight text-zinc-900 dark:text-white leading-none flex items-center gap-2">
            <Inbox className="w-6 h-6 text-violet-500" />
            Mensajes Directos
          </h1>
          <p className="text-[12px] text-zinc-400 font-bold mt-1 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-yellow-400 to-pink-500 inline-block" />
              Instagram: {igCount}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              Facebook: {fbCount}
            </span>
            {pendingCount > 0 && (
              <span className="flex items-center gap-1 text-amber-500 font-black">
                <Clock className="w-3 h-3" />
                {pendingCount} pendientes
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-[12px] font-bold shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all disabled:opacity-50 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Recargar
        </button>
      </div>

      {loading ? (
        <div className="pt-6">
          <EmailLoader loading={loading} color="#8b5cf6" labels={['Cargando DMs de Instagram...', 'Cargando Messenger de Facebook...']} />
        </div>
      ) : (
        <div className="flex-1 flex gap-0 overflow-hidden mt-4 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm">

          {/* LEFT: Conversations List */}
          <div className="w-full md:w-[340px] lg:w-[380px] flex-shrink-0 border-r border-zinc-150 dark:border-zinc-800 flex flex-col overflow-hidden">

            {/* Filters */}
            <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 space-y-2 flex-shrink-0">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar conversación..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-violet-500 transition-all text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400"
                />
              </div>
              {/* Filter pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['all', 'instagram', 'facebook'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPlatformFilter(p)}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black transition-all border ${
                      platformFilter === p
                        ? p === 'instagram'
                          ? 'bg-pink-500 text-white border-pink-500'
                          : p === 'facebook'
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-violet-600 text-white border-violet-600'
                        : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:border-zinc-350'
                    }`}
                  >
                    {p === 'all' ? 'Todos' : p === 'instagram' ? '📷 Instagram' : '💬 Facebook'}
                  </button>
                ))}
                <div className="ml-auto">
                  {(['all', 'pending', 'responded'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-all mr-0.5 ${
                        statusFilter === s
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                          : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                      }`}
                    >
                      {s === 'all' ? 'Todos' : s === 'pending' ? 'Pendientes' : 'Respondidos'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Error banner */}
            {dmsError && (
              <div className="mx-3 mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold leading-normal">{dmsError}</p>
              </div>
            )}

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {filteredConvs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
                  <MessageSquare className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                  <p className="text-[12px] font-bold text-zinc-400">
                    {conversations.length === 0 ? 'No se encontraron conversaciones' : 'Sin resultados para este filtro'}
                  </p>
                </div>
              ) : (
                filteredConvs.map(conv => {
                  const isSelected = selectedConv?.id === conv.id;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConv(conv)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-all border-b border-zinc-100/60 dark:border-zinc-800/40 ${
                        isSelected
                          ? 'bg-violet-50 dark:bg-violet-950/20 border-l-2 border-l-violet-500'
                          : 'hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 border-l-2 border-l-transparent'
                      }`}
                    >
                      {/* Platform Avatar */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white font-black text-xs ${
                        conv.platform === 'instagram'
                          ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600'
                          : 'bg-blue-600'
                      }`}>
                        {conv.platform === 'instagram'
                          ? <Instagram className="w-4 h-4" />
                          : 'f'
                        }
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-[12.5px] font-black truncate ${
                            conv.isPending ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'
                          }`}>
                            {conv.username}
                          </span>
                          <span className="text-[9px] text-zinc-400 flex-shrink-0 font-bold">
                            {formatTime(conv.timestamp)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <p className={`text-[11px] truncate ${
                            conv.isPending ? 'text-zinc-700 dark:text-zinc-300 font-semibold' : 'text-zinc-400 font-medium italic'
                          }`}>
                            {conv.lastMessage}
                          </p>
                          <div className="flex-shrink-0">
                            {conv.isPending ? (
                              <span className="w-2 h-2 rounded-full bg-amber-500 block animate-pulse" title="Pendiente de respuesta" />
                            ) : (
                              <span title="Respondido"><CheckCheck className="w-3 h-3 text-emerald-500" /></span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                            conv.platform === 'instagram'
                              ? 'bg-pink-50 text-pink-600 dark:bg-pink-950/20 dark:text-pink-400'
                              : 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400'
                          }`}>
                            {conv.platform === 'instagram' ? 'Instagram Direct' : 'Messenger'}
                          </span>
                          {conv.isPending && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
                              Pendiente
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Conversation Thread */}
          <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50/30 dark:bg-zinc-950/10">
            {!selectedConv ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                </div>
                <div>
                  <h3 className="text-[15px] font-black text-zinc-600 dark:text-zinc-400">Seleccioná una conversación</h3>
                  <p className="text-[12px] text-zinc-400 mt-1">Hacé click en un chat de la izquierda para ver el historial completo y responder.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Conversation Header */}
                <div className="px-5 py-3 border-b border-zinc-150 dark:border-zinc-800 flex items-center gap-3 bg-white dark:bg-zinc-900 flex-shrink-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-xs flex-shrink-0 ${
                    selectedConv.platform === 'instagram'
                      ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600'
                      : 'bg-blue-600'
                  }`}>
                    {selectedConv.platform === 'instagram' ? <Instagram className="w-4 h-4" /> : 'f'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[14px] font-black text-zinc-900 dark:text-white truncate">{selectedConv.username}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                        selectedConv.platform === 'instagram'
                          ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/30 dark:text-pink-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                      }`}>
                        {selectedConv.platform === 'instagram' ? 'Instagram Direct' : 'Facebook Messenger'}
                      </span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                        selectedConv.isPending
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                      }`}>
                        {selectedConv.isPending ? 'Pendiente de respuesta' : 'Respondido'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {loadingMessages ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                      <p className="text-[12px] text-zinc-400 font-bold">Cargando historial...</p>
                    </div>
                  ) : convMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                      <MessageSquare className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                      <p className="text-[12px] text-zinc-400 font-bold">No se encontraron mensajes en este chat.</p>
                    </div>
                  ) : (
                    <>
                      {convMessages.map((msg: any) => {
                        const isMe = msg.from?.id === fbPageId;
                        const timeStr = msg.created_time
                          ? new Date(msg.created_time).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : '';
                        return (
                          <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <span className="text-[9px] text-zinc-400 font-bold mb-1 px-1">
                              {isMe ? 'Yo' : selectedConv.username} · {timeStr}
                            </span>
                            {msg.message ? (
                              <div className={`max-w-[75%] rounded-[18px] px-4 py-2.5 text-[13px] leading-relaxed font-medium shadow-sm ${
                                isMe
                                  ? 'bg-violet-600 text-white'
                                  : 'bg-white dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100'
                              }`}>
                                {msg.message}
                              </div>
                            ) : (
                              <div className={`max-w-[75%] rounded-[18px] px-4 py-2.5 text-[11px] leading-relaxed italic opacity-60 ${
                                isMe
                                  ? 'bg-violet-400 text-white'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                              }`}>
                                📎 Archivo adjunto o mensaje de voz
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Reply box */}
                <div className="p-4 border-t border-zinc-150 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2 flex-shrink-0">
                  {replyError && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-400">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-500" />
                      {replyError}
                    </div>
                  )}
                  <form onSubmit={handleSendReply} className="flex flex-col gap-2">
                    <AutoResizeTextarea
                      placeholder={`Responder a ${selectedConv.username}...`}
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      disabled={sendingReply || loadingDraft}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-[13px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-violet-500 outline-none transition-all min-h-[60px] shadow-inner font-medium"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={generateAiDraft}
                        disabled={sendingReply || loadingDraft}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/20 dark:hover:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-xl text-[12px] font-black border border-violet-100/50 dark:border-violet-900/20 transition-all"
                      >
                        {loadingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        Borrador IA
                      </button>
                      <button
                        type="submit"
                        disabled={sendingReply || loadingDraft || !replyText.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-[12.5px] font-black shadow-md shadow-violet-600/20 transition-all"
                      >
                        {sendingReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Enviar
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
