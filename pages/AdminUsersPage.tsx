import React, { useEffect, useState, useCallback } from 'react';
import { supabaseAdmin } from '../services/supabase';
import {
  Users, Loader2, Search, RefreshCw, Building2, Mail, X,
  UserCheck, UserX, ChevronDown, ChevronUp, Link2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useViewAs } from '../contexts/ViewAsContext';
import { useNavigate } from 'react-router-dom';

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  provider?: string;
  // business associations
  businesses: BusinessAssoc[];
}

interface BusinessAssoc {
  business_id: string;
  business_name: string;
  role: 'owner' | 'secondary';
  website_url?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(dateStr?: string) {
  if (!dateStr) return 'Nunca';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'Hace un momento';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `Hace ${days} d`;
  return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function providerBadge(provider?: string) {
  if (!provider) return null;
  if (provider.includes('google')) return (
    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 uppercase tracking-wide">Google</span>
  );
  return (
    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 uppercase tracking-wide">Email</span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const { profile } = useAuth();
  const { isViewingAs } = useViewAs();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Guard: only admins
  useEffect(() => {
    if (!profile?.is_admin || isViewingAs) navigate('/', { replace: true });
  }, [profile, isViewingAs, navigate]);

  const load = useCallback(async () => {
    if (!supabaseAdmin) return;
    setLoading(true);
    try {
      // 1. Fetch all auth users (paginated, max 1000 for now)
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      if (authErr) throw authErr;
      const authUsers = authData?.users ?? [];

      // 2. Fetch all car_clients (owners)
      const { data: clients } = await supabaseAdmin
        .from('car_clients')
        .select('id, business_name, user_id, website_url');

      // 3. Fetch all car_business_accounts (secondary users)
      const { data: bizAccounts } = await supabaseAdmin
        .from('car_business_accounts')
        .select('user_id, email, business_id');

      // Build a lookup: business_id -> business_name
      const bizName: Record<string, { name: string; website?: string }> = {};
      for (const c of clients ?? []) {
        bizName[c.id] = { name: c.business_name ?? c.id, website: c.website_url };
      }

      // Build per-user business list
      const userBizMap: Record<string, BusinessAssoc[]> = {};

      // Owners (car_clients.user_id)
      for (const c of clients ?? []) {
        if (!c.user_id) continue;
        if (!userBizMap[c.user_id]) userBizMap[c.user_id] = [];
        userBizMap[c.user_id].push({
          business_id: c.id,
          business_name: c.business_name ?? c.id,
          role: 'owner',
          website_url: c.website_url,
        });
      }

      // Secondary accounts
      for (const acc of bizAccounts ?? []) {
        if (!acc.user_id) continue;
        if (!userBizMap[acc.user_id]) userBizMap[acc.user_id] = [];
        userBizMap[acc.user_id].push({
          business_id: acc.business_id,
          business_name: bizName[acc.business_id]?.name ?? acc.business_id,
          role: 'secondary',
          website_url: bizName[acc.business_id]?.website,
        });
      }

      // Build final user rows
      const rows: UserRow[] = authUsers.map((u) => ({
        id: u.id,
        email: u.email ?? '',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        provider: u.app_metadata?.provider,
        businesses: userBizMap[u.id] ?? [],
      }));

      setUsers(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.businesses.some((b) => b.business_name.toLowerCase().includes(q))
    );
  });

  const withBusiness = filtered.filter((u) => u.businesses.length > 0);
  const withoutBusiness = filtered.filter((u) => u.businesses.length === 0);

  if (!profile?.is_admin || isViewingAs) return null;

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-[22px] font-black text-zinc-900 dark:text-white tracking-tight">Gestión de Usuarios</h1>
          <p className="text-[13px] text-zinc-400 mt-0.5">
            Todos los usuarios registrados y sus negocios asociados
          </p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por email o negocio…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 pr-3 w-64 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[12px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="h-9 w-9 flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all disabled:opacity-50"
            title="Actualizar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total usuarios', value: users.length, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10' },
          { label: 'Con negocio', value: users.filter(u => u.businesses.length > 0).length, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { label: 'Sin negocio', value: users.filter(u => u.businesses.length === 0).length, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-2xl ${stat.bg} border border-black/[0.04] dark:border-white/[0.04] px-5 py-4`}>
            <p className={`text-[26px] font-black ${stat.color} leading-none`}>{stat.value}</p>
            <p className="text-[11px] font-semibold text-zinc-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
        </div>
      ) : (
        <>
          {/* Users WITH business */}
          {withBusiness.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.18em] flex items-center gap-2">
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                Usuarios asociados a un negocio ({withBusiness.length})
              </h2>
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900/50">
                {withBusiness.map((user, i) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    isLast={i === withBusiness.length - 1}
                    expanded={expandedId === user.id}
                    onToggle={() => setExpandedId(expandedId === user.id ? null : user.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Users WITHOUT business */}
          {withoutBusiness.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.18em] flex items-center gap-2">
                <UserX className="w-3.5 h-3.5 text-amber-500" />
                Usuarios sin negocio asignado ({withoutBusiness.length})
              </h2>
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900/50">
                {withoutBusiness.map((user, i) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    isLast={i === withoutBusiness.length - 1}
                    expanded={expandedId === user.id}
                    onToggle={() => setExpandedId(expandedId === user.id ? null : user.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-zinc-400">
              <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-[13px] font-semibold">No se encontraron usuarios</p>
              {search && <p className="text-[11px] mt-1">Probá con otro término de búsqueda</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── UserRow sub-component ────────────────────────────────────────────────────
function UserRow({
  user, isLast, expanded, onToggle,
}: {
  user: UserRow;
  isLast: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <div
        className={`flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer ${!isLast ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
        onClick={onToggle}
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-black flex-shrink-0 shadow-sm shadow-violet-500/20">
          {user.email.slice(0, 2).toUpperCase()}
        </div>

        {/* Email + provider */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">{user.email}</span>
            {providerBadge(user.provider)}
          </div>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            Último acceso: {timeAgo(user.last_sign_in_at)}
          </p>
        </div>

        {/* Business pills */}
        <div className="hidden sm:flex items-center gap-1.5 flex-wrap justify-end max-w-[240px]">
          {user.businesses.length === 0 ? (
            <span className="text-[10px] text-zinc-400 italic">Sin negocio</span>
          ) : (
            user.businesses.slice(0, 2).map((b) => (
              <span
                key={b.business_id}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  b.role === 'owner'
                    ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {b.business_name}
              </span>
            ))
          )}
          {user.businesses.length > 2 && (
            <span className="text-[10px] text-zinc-400">+{user.businesses.length - 2}</span>
          )}
        </div>

        {/* Expand toggle */}
        {user.businesses.length > 0 && (
          <div className="text-zinc-400 flex-shrink-0">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && user.businesses.length > 0 && (
        <div className={`px-5 pb-4 pt-2 bg-zinc-50/60 dark:bg-zinc-800/20 ${!isLast ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Negocios asociados</p>
          <div className="space-y-2">
            {user.businesses.map((b) => (
              <div key={b.business_id} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 shadow-sm">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  b.role === 'owner'
                    ? 'bg-violet-100 dark:bg-violet-500/20'
                    : 'bg-zinc-100 dark:bg-zinc-800'
                }`}>
                  <Building2 className={`w-3.5 h-3.5 ${b.role === 'owner' ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-zinc-800 dark:text-zinc-200 truncate">{b.business_name}</p>
                  <p className="text-[10px] text-zinc-400">
                    {b.role === 'owner' ? '👑 Propietario' : '👤 Cuenta secundaria'}
                  </p>
                </div>
                {b.website_url && (
                  <a
                    href={b.website_url.startsWith('http') ? b.website_url : `https://${b.website_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 flex-shrink-0"
                  >
                    <Link2 className="w-3 h-3" />
                    Web
                  </a>
                )}
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0 ${
                  b.role === 'owner'
                    ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                }`}>
                  {b.role === 'owner' ? 'Owner' : 'Secundario'}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-zinc-150 dark:border-zinc-800 grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Registrado</p>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                {new Date(user.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">ID</p>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate">{user.id}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
