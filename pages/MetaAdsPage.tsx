
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  metaAds, META_AD_ACCOUNT, INSTAGRAM_ACCOUNTS, INSIGHT_FIELDS, AD_INSIGHT_FIELDS,
  daysAgo, today, getPrevPeriod, presetToRange,
  type DatePreset, type TimeRange,
} from '../services/metaAds';
import { db } from '../services/db';
import {
  RefreshCw, Target, Loader2, ChevronDown, ChevronUp, ExternalLink,
  Search, Activity, ArrowLeft, Building2, Instagram, Calendar,
  AlertCircle, AlertTriangle, CheckCircle, XCircle, ImageIcon, Play, Pause, Sparkles,
  ChevronLeft, ChevronRight, Layers, Film, X, Download,
} from 'lucide-react';
// ── Types ──────────────────────────────────────────────────────────────
type DateMode = 'preset' | 'custom';
type Signal   = 'good' | 'warn' | 'bad';
type ObjType  = 'sales' | 'leads' | 'engagement' | 'traffic' | 'awareness' | 'general';
interface Pair { cur: any; prev: any }
interface Health { signal: Signal; label: string; issues: string[] }

// ── Date presets ───────────────────────────────────────────────────────
const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today',        label: 'Hoy' },
  { value: 'yesterday',    label: 'Ayer' },
  { value: 'last_7d',      label: '7 días' },
  { value: 'last_14d',     label: '14 días' },
  { value: 'last_28d',     label: '28 días' },
  { value: 'this_month',   label: 'Este mes' },
  { value: 'last_month',   label: 'Mes ant.' },
  { value: 'last_6months', label: '6 meses' },
  { value: 'last_year',    label: '1 año' },
];

// ── Date helpers ───────────────────────────────────────────────────────
// Presets not supported natively by Meta API — must be sent as time_range
const META_UNSUPPORTED_PRESETS: DatePreset[] = ['last_14d', 'last_28d', 'last_6months'];

const buildArgs = (
  mode: DateMode, preset: DatePreset, since: string, until: string
): [DatePreset | undefined, TimeRange | undefined] => {
  if (mode === 'custom') return [undefined, { since, until }];
  if (META_UNSUPPORTED_PRESETS.includes(preset)) return [undefined, presetToRange(preset)];
  return [preset, undefined];
};

const getActualRange = (mode: DateMode, preset: DatePreset, since: string, until: string): TimeRange =>
  mode === 'custom' ? { since, until } : presetToRange(preset);

// ── Action parsers ─────────────────────────────────────────────────────
const act = (arr: any[], ...types: string[]): string | null => {
  for (const t of types) {
    const v = arr?.find((a: any) => a.action_type === t)?.value;
    if (v != null) return v;
  }
  return null;
};
const getRoas = (arr: any[]): string | null =>
  act(arr, 'omni_purchase', 'offsite_conversion.fb_pixel_purchase', 'purchase', 'website_purchase');
const getPurchases = (arr: any[]): string | null =>
  act(arr, 'offsite_conversion.fb_pixel_purchase', 'purchase', 'omni_purchase', 'website_purchase');
const getConvValue = (arr: any[]): string | null =>
  act(arr, 'offsite_conversion.fb_pixel_purchase', 'purchase', 'omni_purchase', 'website_purchase');

// ── Formatters ─────────────────────────────────────────────────────────
const fmt = (v: any) => {
  const n = parseFloat(v);
  return (isNaN(n) || n === 0) ? '—' : `$${n.toFixed(2)}`;
};
const fmtShort = (v: any) => {
  const n = parseFloat(v);
  if (isNaN(n) || n === 0) return '—';
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(0)}`;
};
const fmtK = (v: any) => {
  const n = parseInt(v);
  if (isNaN(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
};
const pct  = (v: any) => { const n = parseFloat(v); return isNaN(n) ? '—' : `${n.toFixed(2)}%`; };
const x2   = (v: any) => { const n = parseFloat(v); return isNaN(n) || n === 0 ? '—' : `${n.toFixed(2)}x`; };
const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' }) : null;
const metaUrl = (accountId: string, campaignId?: string) => {
  const id = accountId.replace('act_', '');
  return campaignId
    ? `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${id}&selected_campaign_ids=${campaignId}`
    : `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${id}`;
};

// ── Objective detection ────────────────────────────────────────────────
const getObjType = (obj?: string): ObjType => {
  if (!obj) return 'general';
  const o = obj.toLowerCase();
  if (o.includes('sales') || o.includes('conversions') || o.includes('catalog') || o.includes('purchase')) return 'sales';
  if (o.includes('lead')) return 'leads';
  if (o.includes('engagement') || o.includes('post_engagement')) return 'engagement';
  if (o.includes('traffic') || o.includes('link_click') || o.includes('landing')) return 'traffic';
  if (o.includes('awareness') || o.includes('reach') || o.includes('brand')) return 'awareness';
  return 'general';
};
const OBJ_LABEL: Record<ObjType, string> = {
  sales: 'Ventas', leads: 'Clientes potenciales', engagement: 'Interacción',
  traffic: 'Tráfico', awareness: 'Reconocimiento', general: 'General',
};

// ── Signal / color coding ──────────────────────────────────────────────
const sig = (metric: string, val: number, ot: ObjType): Signal => {
  switch (metric) {
    case 'link_ctr':
      if (ot === 'sales')      return val >= 2 ? 'good' : val >= 1   ? 'warn' : 'bad';
      if (ot === 'leads')      return val >= 1.5 ? 'good' : val >= 0.8 ? 'warn' : 'bad';
      if (ot === 'engagement') return val >= 2 ? 'good' : val >= 0.8  ? 'warn' : 'bad';
      return val >= 1 ? 'good' : val >= 0.5 ? 'warn' : 'bad';
    case 'freq':  return val <= 2 ? 'good' : val <= 3.5 ? 'warn' : 'bad';
    case 'cpm':   return val <= 10 ? 'good' : val <= 28 ? 'warn' : 'bad';
    case 'roas':  return val >= 2.5 ? 'good' : val >= 1 ? 'warn' : 'bad';
    default:      return 'good';
  }
};
const SIG_TEXT: Record<Signal, string> = {
  good: 'text-emerald-600 dark:text-emerald-400',
  warn: 'text-amber-600 dark:text-amber-400',
  bad:  'text-red-500 dark:text-red-400',
};
const SIG_BG: Record<Signal, string> = {
  good: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  warn: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
  bad:  'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
};
const SIG_BAR: Record<Signal, string> = {
  good: 'bg-emerald-400',
  warn: 'bg-amber-400',
  bad:  'bg-red-400',
};

// ── Campaign health analysis ───────────────────────────────────────────
const analyzeHealth = (ins: any, ot: ObjType): Health => {
  const spend = parseFloat(ins?.spend || 0);
  if (!ins || spend === 0) return { signal: 'warn', label: 'Sin datos', issues: ['Sin gasto en el período'] };

  const issues: string[] = [];
  let bads = 0, warns = 0;

  const freq     = parseFloat(ins.frequency || 0);
  const linkCtr  = parseFloat(ins.inline_link_click_ctr || 0);
  const cpm      = parseFloat(ins.cpm || 0);
  const roasN    = parseFloat(getRoas(ins.purchase_roas) || '0');
  const purchases = parseInt(getPurchases(ins.actions) || '0');
  const leads    = parseInt(act(ins.actions, 'lead') || '0');

  if (freq > 0) {
    const s = sig('freq', freq, ot);
    if (s === 'bad')  { issues.push(`Frecuencia muy alta (${freq.toFixed(1)}x — fatiga)`); bads++; }
    else if (s === 'warn') { issues.push(`Frecuencia elevada (${freq.toFixed(1)}x)`); warns++; }
  }
  if (linkCtr > 0) {
    const s = sig('link_ctr', linkCtr, ot);
    if (s === 'bad')  { issues.push(`CTR de enlace bajo (${linkCtr.toFixed(2)}%)`); bads++; }
    else if (s === 'warn') { issues.push(`CTR de enlace mejorable (${linkCtr.toFixed(2)}%)`); warns++; }
  }
  if (cpm > 0 && sig('cpm', cpm, ot) === 'bad') { issues.push(`CPM muy alto ($${cpm.toFixed(2)})`); warns++; }

  if (ot === 'sales') {
    if (roasN > 0 && roasN < 1)   { issues.push(`ROAS < 1 (${roasN.toFixed(2)}x — perdiendo dinero)`); bads += 2; }
    else if (roasN > 0 && roasN < 1.5) { issues.push(`ROAS mejorable (${roasN.toFixed(2)}x)`); warns++; }
    if (purchases === 0 && spend > 80)  { issues.push(`Sin compras con $${spend.toFixed(0)} gastados`); bads++; }
  }
  if (ot === 'leads' && leads === 0 && spend > 50) {
    issues.push(`Sin leads con $${spend.toFixed(0)} gastados`); bads++;
  }

  const signal: Signal = bads >= 2 ? 'bad' : bads >= 1 || warns >= 2 ? 'warn' : 'good';
  return { signal, label: signal === 'good' ? 'Bien' : signal === 'warn' ? 'Atención' : 'Crítica', issues };
};

// ── Trend badge ────────────────────────────────────────────────────────
const Trend = ({ cur, prev, lb = false }: { cur: any; prev: any; lb?: boolean }) => {
  const c = parseFloat(cur), p = parseFloat(prev);
  if (isNaN(c) || isNaN(p) || p === 0) return null;
  const change = ((c - p) / Math.abs(p)) * 100;
  if (Math.abs(change) < 3) return null;
  const up = change > 0;
  const good = lb ? !up : up;
  return (
    <div className={`flex items-center gap-0.5 mt-0.5 ${good ? 'text-emerald-500' : 'text-red-500'}`}>
      <span className="text-[11px] font-bold">{up ? '↑' : '↓'} {Math.abs(change).toFixed(0)}%</span>
      <span className="text-[10px] opacity-60 font-medium">vs período ant.</span>
    </div>
  );
};

// ── Metric cell ────────────────────────────────────────────────────────
const MC = ({ label, value, s, trend }: {
  label: string; value?: string | number | null; s?: Signal | null; trend?: React.ReactNode;
}) => {
  if (value == null || value === '—' || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium text-zinc-400 tracking-tight uppercase whitespace-nowrap">{label}</span>
      <span className={`text-[18px] font-bold tracking-tight leading-tight ${s ? SIG_TEXT[s] : 'text-zinc-900 dark:text-white'}`}>
        {value}
      </span>
      {trend}
    </div>
  );
};

// ── Big stat (account bar) ─────────────────────────────────────────────
const BS = ({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) => (
  <div className="flex flex-col">
    <span className="text-[11px] font-medium text-zinc-400 tracking-tight mb-0.5">{label}</span>
    <span className={`text-[22px] font-bold tracking-tight leading-none ${accent || 'text-zinc-900 dark:text-white'}`}>{value}</span>
    {sub && <span className="text-[11px] text-zinc-400 mt-1">{sub}</span>}
  </div>
);

// ── Ad row (creative level) ────────────────────────────────────────────
const AdRow = ({ ad, dateMode, preset, since, until, ot }: {
  ad: any; dateMode: DateMode; preset: DatePreset; since: string; until: string; ot: ObjType;
}) => {
  const [ins, setIns] = useState<any>(undefined);

  useEffect(() => {
    const [dp, tr] = buildArgs(dateMode, preset, since, until);
    metaAds.getInsights(ad.id, AD_INSIGHT_FIELDS, dp, tr).then(setIns).catch(() => setIns(null));
  }, [ad.id, dateMode, preset, since, until]);

  const isActive = ad.status === 'ACTIVE';
  const thumb = ad.creative?.thumbnail_url || ad.creative?.image_url;
  const adLeads     = ins ? act(ins.actions, 'lead') : null;
  const adPurchases = ins ? getPurchases(ins.actions) : null;
  const adRoas      = ins ? getRoas(ins.purchase_roas) : null;
  const linkCtrVal  = ins ? parseFloat(ins.inline_link_click_ctr || 0) : null;

  return (
    <div className="flex items-center gap-3 px-5 py-2.5 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors">
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-100 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
        {thumb
          ? <img src={thumb} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-zinc-400" /></div>
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <p className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300 truncate">{ad.name}</p>
        </div>
      </div>

      {ins === undefined ? (
        <div className="flex gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-3 w-10 bg-zinc-100 dark:bg-zinc-800 rounded-full animate-pulse" />)}
        </div>
      ) : ins ? (
        <div className="flex gap-4 flex-shrink-0 flex-wrap">
          <MC label="Gasto"   value={fmt(ins.spend)} />
          <MC label="Impr."   value={fmtK(ins.impressions)} />
          <MC label="CTR"     value={linkCtrVal ? pct(linkCtrVal) : null}
            s={linkCtrVal ? sig('link_ctr', linkCtrVal, ot) : null} />
          <MC label="CPC"     value={fmt(ins.cpc)} />
          {ot === 'leads' && adLeads    && <MC label="Leads"   value={adLeads} s="good" />}
          {ot === 'sales' && adPurchases && <MC label="Compras" value={adPurchases} s="good" />}
          {ot === 'sales' && adRoas      && <MC label="ROAS"    value={x2(adRoas)} s={sig('roas', parseFloat(adRoas), ot)} />}
        </div>
      ) : (
        <span className="text-[11px] text-zinc-400 italic">Sin datos</span>
      )}
    </div>
  );
};

// ── Adset row ──────────────────────────────────────────────────────────
const AdsetRow = ({ adset, dateMode, preset, since, until, ot }: {
  adset: any; dateMode: DateMode; preset: DatePreset; since: string; until: string; ot: ObjType;
}) => {
  const [ads, setAds] = useState<any[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadAds = async () => {
    if (ads !== null) { setExpanded(e => !e); return; }
    setLoading(true);
    const res = await metaAds.getAds(adset.id);
    setAds(res.data || []);
    setExpanded(true);
    setLoading(false);
  };

  const isActive = adset.status === 'ACTIVE';
  const budget = adset.daily_budget
    ? `$${(parseInt(adset.daily_budget) / 100).toFixed(0)}/día`
    : adset.lifetime_budget
    ? `$${(parseInt(adset.lifetime_budget) / 100).toFixed(0)} total`
    : null;

  return (
    <div>
      <div className="px-5 py-2.5 flex items-center gap-3 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 truncate">{adset.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {adset.optimization_goal && (
              <span className="text-[11px] text-zinc-400">{adset.optimization_goal.replace(/_/g, ' ').toLowerCase()}</span>
            )}
            {budget && <><span className="text-zinc-200 dark:text-zinc-700">·</span><span className="text-[11px] text-zinc-400">{budget}</span></>}
          </div>
        </div>
        <button
          onClick={loadAds}
          className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 px-2 py-1 rounded-[6px] hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all flex-shrink-0"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {ads !== null ? `${ads.length} anuncios` : 'Ver anuncios'}
        </button>
      </div>

      {expanded && ads && ads.length > 0 && (
        <div className="bg-white/60 dark:bg-zinc-900/40 border-t border-zinc-50 dark:border-zinc-800/40 divide-y divide-zinc-50 dark:divide-zinc-800/30">
          {ads.map(ad => (
            <AdRow key={ad.id} ad={ad} dateMode={dateMode} preset={preset} since={since} until={until} ot={ot} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Campaign row ───────────────────────────────────────────────────────
const CampaignRow = ({ campaign, accountId, pair, dateMode, preset, since, until }: {
  campaign: any; accountId: string; pair: Pair | undefined;
  dateMode: DateMode; preset: DatePreset; since: string; until: string;
}) => {
  const [adsets, setAdsets] = useState<any[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loadingAdsets, setLoadingAdsets] = useState(false);

  const loadAdsets = async () => {
    if (adsets !== null) { setExpanded(e => !e); return; }
    setLoadingAdsets(true);
    const res = await metaAds.getAdsets(campaign.id);
    setAdsets(res.data || []);
    setExpanded(true);
    setLoadingAdsets(false);
  };

  const isActive = campaign.status === 'ACTIVE';
  const ot   = getObjType(campaign.objective);
  const ins  = pair?.cur;
  const prev = pair?.prev;

  const spend    = parseFloat(ins?.spend || 0);
  const freq     = parseFloat(ins?.frequency || 0);
  const linkCtr  = parseFloat(ins?.inline_link_click_ctr || 0);
  const cpm      = parseFloat(ins?.cpm || 0);
  const cpc      = parseFloat(ins?.cpc || 0);

  const roasVal     = ins ? getRoas(ins.purchase_roas) : null;
  const purchases   = ins ? getPurchases(ins.actions) : null;
  const convValue   = ins ? getConvValue(ins.action_values) : null;
  const leads       = ins ? act(ins.actions, 'lead') : null;
  const cpl         = ins ? act(ins.cost_per_action_type, 'lead') : null;
  const cpp         = ins ? act(ins.cost_per_action_type, 'offsite_conversion.fb_pixel_purchase', 'purchase') : null;
  const engagements = ins ? act(ins.actions, 'post_engagement') : null;
  const linkClicks  = ins?.inline_link_clicks;
  const thruplay    = ins?.video_thruplay_watched_actions?.[0]?.value;

  // "Resultados" = main metric for the objective
  const resultados = ot === 'sales' ? purchases : ot === 'leads' ? leads : ot === 'engagement' ? engagements : null;
  const resultLabel = ot === 'sales' ? 'Compras' : ot === 'leads' ? 'Leads' : ot === 'engagement' ? 'Interacciones' : null;
  const prevResultados = ot === 'sales' ? getPurchases(prev?.actions) : ot === 'leads' ? act(prev?.actions, 'lead') : ot === 'engagement' ? act(prev?.actions, 'post_engagement') : null;

  const health = useMemo(() => ins ? analyzeHealth(ins, ot) : null, [ins, ot]);

  const budget = campaign.daily_budget
    ? `$${(parseInt(campaign.daily_budget) / 100).toFixed(0)}/día`
    : campaign.lifetime_budget
    ? `$${(parseInt(campaign.lifetime_budget) / 100).toFixed(0)} total`
    : null;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden
      border border-black/[0.04] dark:border-white/[0.06]
      shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]
      transition-all duration-200"
    >
      {/* Health accent line */}
      <div className={`h-[3px] ${health ? SIG_BAR[health.signal] : isActive ? 'bg-zinc-200 dark:bg-zinc-700' : 'bg-zinc-100 dark:bg-zinc-800'}`} />

      <div className="px-5 py-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                         : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                {isActive ? 'Activa' : 'Pausada'}
              </span>
              <span className="text-[11px] text-zinc-400 font-medium">{OBJ_LABEL[ot]}</span>
              {health && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${SIG_BG[health.signal]}`}>
                  {health.signal === 'good' ? <CheckCircle className="w-3 h-3" />
                   : health.signal === 'warn' ? <AlertTriangle className="w-3 h-3" />
                   : <XCircle className="w-3 h-3" />}
                  {health.label}
                </span>
              )}
            </div>

            {/* Name */}
            <p className="font-semibold text-zinc-900 dark:text-white text-[15px] leading-snug tracking-tight">
              {campaign.name}
            </p>

            {/* Meta info */}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {budget && <span className="text-[12px] text-zinc-400">{budget}</span>}
              {fmtDate(campaign.start_time) && (
                <>
                  {budget && <span className="text-zinc-200 dark:text-zinc-700">·</span>}
                  <span className="text-[12px] text-zinc-400">
                    {fmtDate(campaign.start_time)}{campaign.stop_time ? ` → ${fmtDate(campaign.stop_time)}` : ''}
                  </span>
                </>
              )}
              {campaign.bid_strategy && (
                <>
                  <span className="text-zinc-200 dark:text-zinc-700">·</span>
                  <span className="text-[12px] text-zinc-400">{campaign.bid_strategy.replace(/_/g, ' ').toLowerCase()}</span>
                </>
              )}
            </div>

            {/* Issues */}
            {health && health.issues.length > 0 && health.signal !== 'good' && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {health.issues.map((issue, i) => (
                  <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${SIG_BG[health.signal]}`}>
                    {issue}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <a href={metaUrl(accountId, campaign.id)} target="_blank" rel="noreferrer"
              title="Abrir en Meta Ads Manager"
              className="p-2 rounded-[8px] text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button onClick={loadAdsets} title="Ver conjuntos de anuncios"
              className="p-2 rounded-[8px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
              {loadingAdsets ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
               : expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Metrics */}
        <div className="mt-3 pt-3 border-t border-zinc-50 dark:border-zinc-800/60">
          {pair === undefined ? (
            <div className="flex gap-5">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="h-2 w-8 bg-zinc-100 dark:bg-zinc-800 rounded-full animate-pulse" />
                  <div className="h-4 w-12 bg-zinc-100 dark:bg-zinc-800 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          ) : !ins ? (
            <p className="text-[13px] text-zinc-400 italic">Sin datos para este período</p>
          ) : (
            <div className="flex flex-wrap gap-x-5 gap-y-3">
              {/* RESULTADOS — main metric, always first */}
              {resultados && resultLabel && (
                <MC label={resultLabel} value={resultados}
                  s={parseInt(resultados) > 0 ? 'good' : 'bad'}
                  trend={<Trend cur={resultados} prev={prevResultados} />} />
              )}

              {/* ROAS (sales only) */}
              {ot === 'sales' && roasVal && (
                <MC label="ROAS" value={x2(roasVal)}
                  s={sig('roas', parseFloat(roasVal), ot)}
                  trend={<Trend cur={roasVal} prev={getRoas(prev?.purchase_roas)} />} />
              )}

              {/* Conversion value (sales) */}
              {ot === 'sales' && convValue && (
                <MC label="Valor conv." value={fmt(convValue)} />
              )}

              {/* Cost per result */}
              {ot === 'leads' && cpl && (
                <MC label="Costo/lead" value={fmt(cpl)}
                  trend={<Trend cur={cpl} prev={act(prev?.cost_per_action_type, 'lead')} lb />} />
              )}
              {ot === 'sales' && cpp && (
                <MC label="Costo/compra" value={fmt(cpp)}
                  trend={<Trend cur={cpp} prev={act(prev?.cost_per_action_type, 'offsite_conversion.fb_pixel_purchase', 'purchase')} lb />} />
              )}

              {/* Universal */}
              <MC label="Gasto" value={fmt(spend)}
                trend={<Trend cur={spend} prev={prev?.spend} />} />
              <MC label="Alcance" value={fmtK(ins.reach)}
                trend={<Trend cur={ins.reach} prev={prev?.reach} />} />
              <MC label="Impr." value={fmtK(ins.impressions)} />
              <MC label="Frecuencia" value={freq > 0 ? freq.toFixed(2) : null}
                s={freq > 0 ? sig('freq', freq, ot) : null}
                trend={<Trend cur={freq} prev={prev?.frequency} lb />} />
              <MC label="CPM" value={cpm > 0 ? fmt(cpm) : null}
                s={cpm > 0 ? sig('cpm', cpm, ot) : null}
                trend={<Trend cur={cpm} prev={prev?.cpm} lb />} />
              <MC label="CTR enlace" value={linkCtr > 0 ? pct(linkCtr) : null}
                s={linkCtr > 0 ? sig('link_ctr', linkCtr, ot) : null}
                trend={<Trend cur={linkCtr} prev={prev?.inline_link_click_ctr} />} />
              <MC label="CPC" value={cpc > 0 ? fmt(cpc) : null}
                trend={<Trend cur={cpc} prev={prev?.cpc} lb />} />
              {linkClicks && <MC label="Clics enlace" value={fmtK(linkClicks)} />}
              {thruplay && <MC label="Thruplay" value={fmtK(thruplay)} />}
            </div>
          )}
        </div>
      </div>

      {/* Adsets expandido */}
      {expanded && adsets && adsets.length > 0 && (
        <div className="border-t border-zinc-50 dark:border-zinc-800/50 bg-zinc-50/40 dark:bg-zinc-800/10 divide-y divide-zinc-50 dark:divide-zinc-800/40">
          <div className="px-5 py-2">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{adsets.length} conjuntos de anuncios</p>
          </div>
          {adsets.map(a => (
            <AdsetRow key={a.id} adset={a} dateMode={dateMode} preset={preset} since={since} until={until} ot={ot} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Alerts panel ───────────────────────────────────────────────────────
const AlertsPanel = ({ campaigns, map }: { campaigns: any[]; map: Record<string, Pair> }) => {
  const active = campaigns.filter(c => c.status === 'ACTIVE');
  if (active.length === 0 || Object.keys(map).length === 0) return null;

  const scored = active
    .filter(c => map[c.id])
    .map(c => ({ c, health: analyzeHealth(map[c.id].cur, getObjType(c.objective)) }));

  const critical = scored.filter(x => x.health.signal === 'bad');
  const warnings = scored.filter(x => x.health.signal === 'warn');
  const good     = scored.filter(x => x.health.signal === 'good');
  const noData   = active.filter(c => !map[c.id] || !map[c.id].cur);

  if (critical.length === 0 && warnings.length === 0 && good.length === 0) return null;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-black/[0.04] dark:border-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="px-5 pt-4 pb-2 border-b border-zinc-50 dark:border-zinc-800/60">
        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Análisis automático · {active.length} campañas activas</p>
      </div>
      <div className="px-5 py-4 space-y-4">

        {critical.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <XCircle className="w-3.5 h-3.5 text-red-500" />
              <p className="text-[12px] font-bold text-red-600 dark:text-red-400">Críticas — acción urgente ({critical.length})</p>
            </div>
            <div className="space-y-2 pl-5">
              {critical.map(({ c, health }) => (
                <div key={c.id}>
                  <p className="text-[12px] font-semibold text-zinc-800 dark:text-zinc-200">{c.name}</p>
                  <p className="text-[11px] text-red-500 mt-0.5">{health.issues.join(' · ')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <p className="text-[12px] font-bold text-amber-600 dark:text-amber-400">Necesitan atención ({warnings.length})</p>
            </div>
            <div className="space-y-2 pl-5">
              {warnings.map(({ c, health }) => (
                <div key={c.id}>
                  <p className="text-[12px] font-semibold text-zinc-800 dark:text-zinc-200">{c.name}</p>
                  <p className="text-[11px] text-amber-500 mt-0.5">{health.issues.join(' · ')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {good.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <p className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">Funcionando bien ({good.length})</p>
            </div>
            <p className="text-[11px] text-zinc-400 pl-5">{good.map(x => x.c.name).join(', ')}</p>
          </div>
        )}

        {noData.length > 0 && (
          <p className="text-[11px] text-zinc-400">
            Sin datos en el período: {noData.map(c => c.name).join(', ')}
          </p>
        )}
      </div>
    </div>
  );
};

// ── Account Card ───────────────────────────────────────────────────────
const AccountCard = ({ account, spend15d, activeCamps, onSelect }: {
  account: any; spend15d: number; activeCamps: number; onSelect: () => void;
}) => (
  <button onClick={onSelect}
    className="text-left w-full group bg-white dark:bg-zinc-900 rounded-2xl p-5
      border border-black/[0.05] dark:border-white/[0.06]
      shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]
      hover:shadow-[0_8px_24px_rgba(0,0,0,0.1),0_2px_6px_rgba(0,0,0,0.04)]
      transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
  >
    <div className="flex items-center justify-between mb-4">
      <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200">
        <Building2 className="w-[18px] h-[18px] text-white" />
      </div>
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Activa
      </span>
    </div>
    <p className="font-semibold text-zinc-900 dark:text-white text-[15px] tracking-tight mb-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
      {account.name}
    </p>
    <p className="text-[12px] text-zinc-400 font-medium mb-4">{account.currency}</p>
    <div className="grid grid-cols-2 gap-2">
      <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-[10px] p-3">
        <p className="text-[11px] text-zinc-400 font-medium mb-1">Gasto 15d</p>
        <p className="text-[20px] font-bold tracking-tight text-zinc-900 dark:text-white leading-none">{fmtShort(spend15d)}</p>
      </div>
      <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-[10px] p-3">
        <p className="text-[11px] text-zinc-400 font-medium mb-1">Campañas</p>
        <p className={`text-[20px] font-bold tracking-tight leading-none ${activeCamps > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>
          {activeCamps}<span className="text-[12px] font-medium text-zinc-400 ml-1">activas</span>
        </p>
      </div>
    </div>
  </button>
);

// ── Instagram Card ─────────────────────────────────────────────────────
const InstagramCard = ({ igId, username }: { igId: string; username: string }) => {
  const [profile, setProfile] = useState<any>(null);
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([metaAds.getInstagramProfile(igId), metaAds.getInstagramMedia(igId, 6)])
      .then(([p, m]) => { setProfile(p); setMedia(m.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [igId]);

  if (loading) return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.06)] animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full w-3/4" />
          <div className="h-3 bg-zinc-50 dark:bg-zinc-800 rounded-full w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-zinc-50 dark:bg-zinc-800 rounded-[10px]" />)}
      </div>
    </div>
  );

  if (!profile || profile.error) return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
        <Instagram className="w-4 h-4 text-zinc-400" />
      </div>
      <p className="text-[13px] text-zinc-400">@{username} — sin acceso</p>
    </div>
  );

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-black/[0.04] dark:border-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          {profile.profile_picture_url
            ? <img src={profile.profile_picture_url} alt={username} className="w-12 h-12 rounded-full object-cover ring-2 ring-black/5 dark:ring-white/10" />
            : <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0"><Instagram className="w-5 h-5 text-white" /></div>
          }
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-zinc-900 dark:text-white tracking-tight">@{profile.username || username}</p>
            {profile.biography && <p className="text-[12px] text-zinc-400 truncate mt-0.5">{profile.biography}</p>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Seguidores', value: (profile.followers_count || 0).toLocaleString() },
            { label: 'Posts',      value: profile.media_count || 0 },
            { label: 'Siguiendo',  value: profile.follows_count || 0 },
          ].map(s => (
            <div key={s.label} className="bg-zinc-50 dark:bg-zinc-800/60 rounded-[10px] p-2.5">
              <p className="text-[17px] font-bold tracking-tight text-zinc-900 dark:text-white">{s.value}</p>
              <p className="text-[11px] text-zinc-400 font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
      {media.length > 0 && (
        <div className="grid grid-cols-3 gap-px border-t border-zinc-100 dark:border-zinc-800">
          {media.map((m: any) => (
            <a key={m.id} href={m.permalink} target="_blank" rel="noreferrer"
              className="aspect-square bg-zinc-100 dark:bg-zinc-800 overflow-hidden relative group block">
              {(m.media_url || m.thumbnail_url) && (
                <img src={m.media_url || m.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold">
                {m.like_count > 0 && <span>♥ {m.like_count}</span>}
                {m.comments_count > 0 && <span>💬 {m.comments_count}</span>}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Date Filter Bar (Meta-style) ──────────────────────────
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_ES   = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}
function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

const MiniCal = ({ year, month, since, until, hovering, onDay, onHover }: {
  year: number; month: number; since: string; until: string; hovering: string;
  onDay: (d: string) => void; onHover: (d: string) => void;
}) => {
  const days = getDaysInMonth(year, month);
  const offset = getFirstDayOfWeek(year, month);
  const cells: (number|null)[] = [...Array(offset).fill(null), ...Array.from({length:days},(_,i)=>i+1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="select-none">
      <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-100 text-center mb-3">
        {MONTHS_ES[month]} {year}
      </p>
      <div className="grid grid-cols-7 mb-1">
        {DAYS_ES.map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-zinc-400 pb-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const iso = isoDate(year, month, day);
          const isStart  = iso === since;
          const isEnd    = iso === until;
          const inRange  = since && until && iso > since && iso < until;
          const inHover  = hovering && since && !until && iso > since && iso <= hovering;
          const isToday  = iso === today();
          return (
            <button key={i} onClick={() => onDay(iso)} onMouseEnter={() => onHover(iso)}
              className={[
                'h-8 w-full text-[12px] font-medium transition-all relative',
                isStart || isEnd ? 'bg-blue-600 text-white rounded-md z-10' :
                (inRange || inHover) ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200' :
                'hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md',
              ].join(' ')}>
              {day}
              {isToday && !isStart && !isEnd && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const DateFilterBar = ({ mode, preset, since, until, onMode, onPreset, onSince, onUntil }: {
  mode: DateMode; preset: DatePreset; since: string; until: string;
  onMode: (m: DateMode) => void; onPreset: (p: DatePreset) => void;
  onSince: (s: string) => void; onUntil: (u: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [selSince, setSelSince] = useState(since);
  const [selUntil, setSelUntil] = useState(until);
  const [selPreset, setSelPreset] = useState<DatePreset>(preset);
  const [selMode, setSelMode] = useState<DateMode>(mode);
  const [hovering, setHovering] = useState('');
  const nowD = new Date();
  const [calYear, setCalYear]   = useState(nowD.getFullYear());
  const [calMonth, setCalMonth] = useState(nowD.getMonth());
  const ref = React.useRef<HTMLDivElement>(null);

  const rightMonth = calMonth === 11 ? 0 : calMonth + 1;
  const rightYear  = calMonth === 11 ? calYear + 1 : calYear;

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setSelSince(since); setSelUntil(until);
    setSelPreset(preset); setSelMode(mode); setHovering('');
    if (since) {
      const d = new Date(since);
      setCalYear(d.getFullYear()); setCalMonth(d.getMonth());
    }
    setOpen(true);
  };

  const applyPreset = (p: DatePreset) => {
    setSelMode('preset'); setSelPreset(p);
    const r = presetToRange(p);
    setSelSince(r.since); setSelUntil(r.until); setHovering('');
  };

  const handleDay = (iso: string) => {
    if (!selSince || (selSince && selUntil)) {
      setSelSince(iso); setSelUntil(''); setSelMode('custom');
    } else if (iso < selSince) {
      setSelSince(iso); setSelUntil('');
    } else {
      setSelUntil(iso);
    }
    setHovering('');
  };

  const apply = () => {
    onMode(selMode); onPreset(selPreset);
    onSince(selSince); onUntil(selUntil || selSince);
    setOpen(false);
  };

  const fmtLabel = (iso: string) => {
    if (!iso) return '';
    return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  const currentLabel = mode === 'preset'
    ? DATE_PRESETS.find(p => p.value === preset)?.label || preset
    : `${fmtLabel(since)} - ${fmtLabel(until)}`;

  return (
    <div className="relative" ref={ref}>
      <button onClick={handleOpen}
        className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-[10px] text-[13px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm">
        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
        {currentLabel}
        <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] border border-zinc-200 dark:border-zinc-700 overflow-hidden flex"
          style={{minWidth: 640}}>

          {/* Presets */}
          <div className="w-52 border-r border-zinc-100 dark:border-zinc-800 py-3 flex-shrink-0 overflow-y-auto">
            <p className="px-4 pb-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Usados recientemente</p>
            {DATE_PRESETS.map(p => (
              <button key={p.value} onClick={() => applyPreset(p.value)}
                className={`w-full text-left px-4 py-2.5 text-[13px] flex items-center gap-2.5 transition-colors ${
                  selMode === 'preset' && selPreset === p.value
                    ? 'text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-500/10'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}>
                <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  selMode === 'preset' && selPreset === p.value ? 'border-blue-600 dark:border-blue-400' : 'border-zinc-300 dark:border-zinc-600'
                }`}>
                  {selMode === 'preset' && selPreset === p.value && <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />}
                </span>
                {p.label}
              </button>
            ))}
          </div>

          {/* Calendar + footer */}
          <div className="flex-1 flex flex-col p-5">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => { const d = new Date(calYear, calMonth - 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}
                className="p-1.5 rounded-[8px] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
                <ChevronLeft className="w-4 h-4 text-zinc-500" />
              </button>
              <button onClick={() => { const d = new Date(calYear, calMonth + 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}
                className="p-1.5 rounded-[8px] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6" onMouseLeave={() => setHovering('')}>
              <MiniCal year={calYear} month={calMonth} since={selSince} until={selUntil} hovering={hovering} onDay={handleDay} onHover={setHovering} />
              <MiniCal year={rightYear} month={rightMonth} since={selSince} until={selUntil} hovering={hovering} onDay={handleDay} onHover={setHovering} />
            </div>

            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <input type="date" value={selSince} onChange={e => { setSelSince(e.target.value); setSelMode('custom'); }}
                className="flex-1 px-2.5 py-1.5 text-[12px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-[8px] text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-400" />
              <span className="text-zinc-400 text-[12px]">—</span>
              <input type="date" value={selUntil} min={selSince} onChange={e => { setSelUntil(e.target.value); setSelMode('custom'); }}
                className="flex-1 px-2.5 py-1.5 text-[12px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-[8px] text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>

            <p className="text-[11px] text-zinc-400 mt-2">Las fechas se muestran en la Hora de Buenos Aires</p>

            <div className="flex items-center justify-end gap-2 mt-3">
              <button onClick={() => setOpen(false)}
                className="px-4 py-1.5 rounded-[8px] text-[13px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all border border-zinc-200 dark:border-zinc-700">
                Cancelar
              </button>
              <button onClick={apply} disabled={!selSince}
                className="px-4 py-1.5 rounded-[8px] text-[13px] font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-all">
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// ── Creative Preview Modal ─────────────────────────────────────────────
const CreativePreviewModal = ({ preview, onClose }: {
  preview: { url: string; isVideo: boolean; videoId?: string; adId?: string; creativeId?: string; name?: string; previewShareableLink?: string; effectiveObjectStoryId?: string; };
  onClose: () => void;
}) => {
  const [imgLoaded, setImgLoaded] = React.useState(false);
  const [videoSrc, setVideoSrc] = React.useState<string | null>(null);
  const [embedHtml, setEmbedHtml] = React.useState<string | null>(null);
  const [videoLoading, setVideoLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    if (!preview.isVideo) return;
    if (!preview.adId && !preview.creativeId && !preview.videoId) return;
    setVideoLoading(true); setVideoSrc(null); setEmbedHtml(null);
    const params = new URLSearchParams();
    if (preview.adId) params.set('adId', preview.adId);
    if (preview.creativeId) params.set('creativeId', preview.creativeId);
    if (preview.videoId) params.set('videoId', preview.videoId);
    fetch(`/api/meta-video?${params}`).then(r => r.ok ? r.json() : null).then(d => { if (d?.source) setVideoSrc(d.source); if (d?.embed_html) setEmbedHtml(d.embed_html); }).catch(() => {}).finally(() => setVideoLoading(false));
  }, [preview.adId, preview.creativeId, preview.videoId, preview.isVideo]);

  React.useEffect(() => {
    if (preview.isVideo) return;
    setImgLoaded(false); setProgress(0);
    const start = Date.now();
    const tick = setInterval(() => { setProgress(Math.min(80, ((Date.now() - start) / 2000) * 80)); }, 50);
    return () => clearInterval(tick);
  }, [preview.url, preview.isVideo]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-150" onClick={onClose}>
      {!preview.isVideo && !imgLoaded && (<div className="absolute top-0 left-0 right-0 h-[2px] bg-white/5 z-20"><div className="h-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-200 rounded-full" style={{ width: `${progress}%` }} /></div>)}
      <button onClick={onClose} className="absolute top-4 right-4 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all z-20"><X className="w-5 h-5" /></button>
      {preview.name && (<div className="absolute top-4 left-4 right-16 z-20"><p className="text-white/80 text-[13px] font-bold truncate max-w-[70vw]">{preview.name}</p>{preview.isVideo && (<div className="inline-flex items-center gap-1 mt-1 bg-white/10 px-2 py-0.5 rounded-full"><Film className="w-3 h-3 text-white/60" /><span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Video</span></div>)}</div>)}
      <div className="relative animate-in zoom-in-95 duration-200 flex items-center justify-center" style={{ maxWidth: '90vw', maxHeight: '88vh' }} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        {preview.isVideo ? (
          videoLoading ? (<div className="w-[min(90vw,560px)] h-[min(88vh,420px)] rounded-2xl bg-zinc-900 border border-white/10 flex flex-col items-center justify-center gap-4"><div className="w-12 h-12 rounded-full border-2 border-zinc-700 border-t-violet-500 animate-spin" /><span className="text-[12px] font-bold text-zinc-500">Cargando video...</span></div>)
          : videoSrc ? (<div className="flex flex-col items-center gap-4"><video src={videoSrc} controls autoPlay playsInline className="rounded-2xl shadow-2xl border border-white/10 bg-black" style={{ maxWidth: '90vw', maxHeight: '70vh', minWidth: 'min(90vw, 400px)' }} /><a href={videoSrc} download={`video-${preview.videoId || 'creative'}.mp4`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-[12.5px] font-bold rounded-full transition-all shadow-lg" onClick={e => e.stopPropagation()}><Download className="w-4 h-4" />Descargar Video</a></div>)
          : embedHtml ? (<div className="rounded-2xl overflow-hidden shadow-2xl bg-zinc-900 border border-white/10" style={{ width: 'min(90vw, 420px)', maxHeight: '90vh' }} onClick={(e: React.MouseEvent) => e.stopPropagation()} dangerouslySetInnerHTML={{ __html: embedHtml.replace(/width="\d+"/g, 'width="100%"').replace(/width:\s*\d+px/g, 'width:100%').replace(/<iframe/g, '<iframe style="width:100%;max-height:80vh;border:none;"') }} />)
          : (<div className="flex flex-col items-center gap-4" onClick={(e: React.MouseEvent) => e.stopPropagation()}><div className="relative rounded-2xl overflow-hidden" style={{ maxWidth: 'min(90vw, 500px)' }}><img src={preview.url} alt={preview.name} className="w-full rounded-2xl shadow-2xl border border-white/10" style={{ maxHeight: '70vh', objectFit: 'contain' }} /><div className="absolute inset-0 bg-black/50 flex items-center justify-center"><div className="w-16 h-16 rounded-full bg-white/10 border border-white/30 flex items-center justify-center backdrop-blur-sm"><svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div></div></div><a href={preview.effectiveObjectStoryId ? (preview.effectiveObjectStoryId.includes('_') ? (() => { const [pageId, postId] = preview.effectiveObjectStoryId!.split('_'); return `https://www.facebook.com/permalink.php?story_fbid=${postId}&id=${pageId}`; })() : `https://facebook.com/${preview.effectiveObjectStoryId}`) : `https://www.facebook.com/ads/library/?id=${preview.creativeId || preview.adId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 bg-[#1877F2] hover:bg-[#166FE5] text-white text-[13px] font-bold rounded-full transition-all shadow-lg"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>Ver en Facebook</a></div>)
        ) : (
          <>{!imgLoaded && (<div className="absolute inset-0 rounded-2xl bg-zinc-900 animate-pulse flex items-center justify-center" style={{ minWidth: 280, minHeight: 280 }}><div className="w-10 h-10 rounded-full border-2 border-zinc-700 border-t-violet-500 animate-spin" /></div>)}<img src={preview.url} alt={preview.name || 'Creative'} onLoad={() => { setProgress(100); setTimeout(() => setImgLoaded(true), 150); }} className={`rounded-2xl shadow-2xl border border-white/10 transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`} style={{ maxWidth: '90vw', maxHeight: '88vh', width: 'auto', height: 'auto', minWidth: 'min(90vw, 320px)', objectFit: 'contain' }} /></>
        )}
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────
type Tab = 'CAMPAIGNS' | 'CREATIVOS';

export default function MetaAdsPage() {
  const [tab, setTab]                         = useState<Tab>('CAMPAIGNS');
  const [accounts, setAccounts]               = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [campaigns, setCampaigns]             = useState<any[]>([]);
  const [accountIns, setAccountIns]           = useState<any>(null);
  const [insightsMap, setInsightsMap]         = useState<Record<string, Pair>>({});
  
  const [campaignFilter, setCampaignFilter]   = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ACTIVE');
  const [search, setSearch]                   = useState('');
  const [loading, setLoading]                 = useState(true);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [lastUpdated, setLastUpdated]         = useState<Date | null>(null);
  const [dateMode, setDateMode]               = useState<DateMode>('preset');
  const [datePreset, setDatePreset]           = useState<DatePreset>('last_28d');
  const [since, setSince]                     = useState(daysAgo(28));
  const [until, setUntil]                     = useState(today());

  // Creativos tab state
  const [activeAds, setActiveAds]             = useState<any[]>([]);
  const [adInsightsMap, setAdInsightsMap]     = useState<Record<string, any>>({});
  const [campaignMap, setCampaignMap]         = useState<Record<string, string>>({});
  const [loadingAds, setLoadingAds]           = useState(false);
  const [activePreviewMeta, setActivePreviewMeta] = useState<any | null>(null);

  // Load all ad accounts the token has access to
  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const allRes = await metaAds.getAllAdAccounts().catch(() => null);
      const allAccounts: any[] = allRes?.data?.length ? allRes.data : [{ id: META_AD_ACCOUNT, name: 'Algoritmia Ads', currency: 'USD', account_status: 1 }];
      const tr15: TimeRange = { since: daysAgo(15), until: today() };
      const enriched = await Promise.all(
        allAccounts.map(async (acc: any) => {
          const [ins15, campsRes] = await Promise.all([
            metaAds.getInsights(acc.id, 'spend', undefined, tr15).catch(() => null),
            metaAds.getCampaigns(acc.id).catch(() => null),
          ]);
          return {
            ...acc,
            spend15d: parseFloat(ins15?.spend || '0'),
            activeCamps: (campsRes?.data || []).filter((c: any) => c.status === 'ACTIVE').length,
          };
        })
      );
      setAccounts(enriched);
    } catch (e) {
      console.error('loadAccounts error', e);
      setAccounts([{ id: META_AD_ACCOUNT, name: 'Algoritmia Ads', currency: 'USD', account_status: 1, amount_spent: '0', spend15d: 0, activeCamps: 0 }]);
    }
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  // Load insights for all campaigns (current + previous period for trends)
  const fetchCampaignInsights = useCallback(async (
    camps: any[], dp: DatePreset | undefined, tr: TimeRange | undefined
  ) => {
    if (camps.length === 0) return;
    setLoadingInsights(true);
    setInsightsMap({});

    const range = tr || presetToRange(dp || 'last_28d');
    const prevRange = getPrevPeriod(range.since, range.until);

    await Promise.all(
      camps.map(async (c: any) => {
        const [cur, prev] = await Promise.all([
          metaAds.getInsights(c.id, INSIGHT_FIELDS, dp, tr).catch(() => null),
          metaAds.getInsights(c.id, INSIGHT_FIELDS, undefined, prevRange).catch(() => null),
        ]);
        setInsightsMap(m => ({ ...m, [c.id]: { cur, prev } }));
      })
    );

    setLoadingInsights(false);
  }, []);

  // Select account → load campaigns (insights fetched by refreshForDate effect)
  const selectAccount = async (account: any) => {
    setSelectedAccount(account);
    setTab('CAMPAIGNS');
    setCampaigns([]);
    setInsightsMap({});
    setAccountIns(null);
    setLoadingCampaigns(true);

    const [dp, tr] = buildArgs(dateMode, datePreset, since, until);
    const [campsRes, ins] = await Promise.all([
      metaAds.getCampaigns(account.id),
      metaAds.getInsights(account.id, INSIGHT_FIELDS, dp, tr),
    ]);
    const campList = campsRes.data || [];
    setCampaigns(campList);
    setAccountIns(ins);
    setLoadingCampaigns(false);
    // Note: refreshForDate effect handles fetchCampaignInsights when campaigns updates
  };

  // Refresh when date changes
  const refreshForDate = useCallback(async () => {
    if (tab !== 'CAMPAIGNS' || !selectedAccount || campaigns.length === 0) return;
    const [dp, tr] = buildArgs(dateMode, datePreset, since, until);
    const ins = await metaAds.getInsights(selectedAccount.id, INSIGHT_FIELDS, dp, tr);
    setAccountIns(ins);
    await fetchCampaignInsights(campaigns, dp, tr);
  }, [tab, selectedAccount, campaigns, dateMode, datePreset, since, until, fetchCampaignInsights]);

  useEffect(() => { refreshForDate(); }, [refreshForDate]);

  // Load active ads when CREATIVOS tab is selected
  useEffect(() => {
    if (tab !== 'CREATIVOS' || !selectedAccount) return;
    setLoadingAds(true);
    const accountId = selectedAccount.id;
    const tr = { since: daysAgo(28), until: today() };
    const adFields = 'ad_id,spend,impressions,reach,inline_link_click_ctr,inline_link_clicks,actions,cost_per_action_type,action_values,purchase_roas';
    Promise.all([
      metaAds.getAccountAds(accountId),
      metaAds.getAdInsightsForAccount(accountId, adFields, tr).catch(() => []),
      metaAds.getCampaigns(accountId).catch(() => ({ data: [] })),
    ]).then(([adsRes, insightsRes, campsRes]) => {
      setActiveAds((adsRes.data || []).filter((ad: any) => ad.status === 'ACTIVE'));
      const byAdId: Record<string, any> = {};
      (insightsRes || []).forEach((i: any) => { if (i.ad_id) byAdId[i.ad_id] = i; });
      setAdInsightsMap(byAdId);
      const cMap: Record<string, string> = {};
      ((campsRes as any).data || []).forEach((c: any) => { if (c.id) cMap[c.id] = c.name; });
      setCampaignMap(cMap);
    }).catch(console.error).finally(() => setLoadingAds(false));
  }, [tab, selectedAccount]);

  const filteredCampaigns = useMemo(() => campaigns.filter(c => {
    const matchStatus = campaignFilter === 'ALL' || c.status === campaignFilter;
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  }), [campaigns, campaignFilter, search]);

  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length;
  const pausedCampaigns = campaigns.filter(c => c.status === 'PAUSED').length;

  const leads     = act(accountIns?.actions, 'lead') || '0';
  const purchases = getPurchases(accountIns?.actions) || '0';
  const roasAcc   = getRoas(accountIns?.purchase_roas);

  const ALL_IG = Object.values(INSTAGRAM_ACCOUNTS);
  const dateLabel = dateMode === 'custom' ? `${since} → ${until}` : DATE_PRESETS.find(p => p.value === datePreset)?.label;

  return (
    <div className="flex flex-col gap-5 pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm flex-shrink-0">
              <Target className="w-[18px] h-[18px] text-white" />
            </div>
            Meta Ads
          </h1>
          <p className="text-[13px] text-zinc-400 mt-0.5 ml-0.5 font-medium">
            {accounts.length} cuenta{accounts.length !== 1 ? 's' : ''} publicitaria{accounts.length !== 1 ? 's' : ''}
            {lastUpdated && <span className="opacity-50"> · {lastUpdated.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedAccount && (
            <a href={metaUrl(selectedAccount.id)} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-[10px] text-[13px] font-semibold transition-all shadow-sm active:scale-95">
              <ExternalLink className="w-3.5 h-3.5" /> Abrir en Meta
            </a>
          )}
          <button onClick={loadAccounts}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-[10px] text-[13px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all active:scale-95">
            <RefreshCw className={`w-3.5 h-3.5 ${loading || loadingInsights ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Body: Sidebar + Content */}
      <div className="flex gap-4 items-start">

        {/* Left Sidebar: Accounts */}
        <div className="w-[260px] flex-shrink-0 flex flex-col gap-2">
          
          <div className="flex flex-col gap-1.5">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800 animate-pulse">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-zinc-100 dark:bg-zinc-800 rounded-full w-3/4" />
                      <div className="h-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-full w-1/3" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-[56px] bg-zinc-50 dark:bg-zinc-800 rounded-xl" />
                    <div className="h-[56px] bg-zinc-50 dark:bg-zinc-800 rounded-xl" />
                  </div>
                </div>
              ))
            ) : accounts
              .filter(a => a.spend15d > 0)
              .map(a => (
                <button key={a.id}
                  onClick={() => { selectAccount(a); setTab('CAMPAIGNS'); }}
                  className={`w-full text-left rounded-[12px] p-2.5 border transition-all duration-200 flex items-center gap-2.5 ${
                    selectedAccount?.id === a.id
                      ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 shadow-[0_1px_4px_rgba(59,130,246,0.1)]'
                      : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${
                    selectedAccount?.id === a.id ? 'bg-blue-500' : 'bg-gradient-to-br from-blue-500 to-blue-600'
                  }`}>
                    <Building2 className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12.5px] font-bold truncate leading-tight ${
                      selectedAccount?.id === a.id ? 'text-blue-700 dark:text-blue-300' : 'text-zinc-900 dark:text-white'
                    }`}>{a.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-semibold text-zinc-400">{a.currency}</span>
                      <span className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">${fmtShort(a.spend15d)}</span>
                    </div>
                  </div>
                </button>
              ))
            }
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Tab bar */}
          <div className="flex gap-0.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-[12px] w-fit">
            {([
              { id: 'CAMPAIGNS', label: 'Campañas', icon: Target },
              { id: 'CREATIVOS', label: 'Creativos Activos', icon: Layers },
            ] as const).map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id}
                  onClick={() => setTab(t.id as Tab)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all duration-150 ${
                    tab === t.id
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
                      : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}>
                  <Icon className="w-[15px] h-[15px]" />
                  {t.label}
                  {t.id === 'CAMPAIGNS' && selectedAccount && (
                    <span className="text-zinc-400 font-normal text-[12px] truncate max-w-[100px]">· {selectedAccount.name}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* CAMPAIGNS TAB */}
          {tab === 'CAMPAIGNS' && (
            <div className="space-y-5">
              {!selectedAccount ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-zinc-400" />
                  </div>
                  <p className="text-[15px] font-medium text-zinc-500">Selección una cuenta de la izquierda</p>
                </div>
              ) : (
                <>
                  <DateFilterBar mode={dateMode} preset={datePreset} since={since} until={until}
                    onMode={setDateMode} onPreset={setDatePreset} onSince={setSince} onUntil={setUntil} />

                  {loadingCampaigns ? (
                    <div className="flex flex-col items-center py-24 gap-3">
                      <Loader2 className="animate-spin text-blue-500 w-7 h-7" />
                      <p className="text-[13px] text-zinc-400 font-medium">Cargando campañas...</p>
                    </div>
                  ) : (
                    <>
                      {accountIns ? (
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-black/[0.04] dark:border-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
                          <div className="px-5 pt-4 pb-2">
                            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Resumen de cuenta · {dateLabel}</p>
                          </div>
                          <div className="px-5 pb-5 pt-3 border-t border-zinc-50 dark:border-zinc-800/60 flex flex-wrap items-start gap-x-8 gap-y-6">
                            <BS label="Gasto"       value={fmt(accountIns.spend)} />
                            <BS label="Impresiones" value={fmtK(accountIns.impressions)} sub={`CPM ${fmt(accountIns.cpm)}`} />
                            <BS label="Alcance"     value={fmtK(accountIns.reach)} sub={`Freq ${parseFloat(accountIns.frequency || 0).toFixed(1)}x`} />
                            <BS label="CTR enlace"  value={pct(accountIns.inline_link_click_ctr)} sub={`CPC ${fmt(accountIns.cpc)}`} />
                            {parseInt(leads) > 0 && <BS label="Leads"   value={leads} accent="text-emerald-600 dark:text-emerald-400" />}
                            {parseInt(purchases) > 0 && <BS label="Compras" value={purchases} accent="text-emerald-600 dark:text-emerald-400" />}
                            {roasAcc && <BS label="ROAS" value={x2(roasAcc)} accent={sig('roas', parseFloat(roasAcc), 'sales') === 'good' ? 'text-emerald-600 dark:text-emerald-400' : sig('roas', parseFloat(roasAcc), 'sales') === 'warn' ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400'} />}
                            <BS label="Campañas" value={`${activeCampaigns}`} sub={`${pausedCampaigns} pausadas`} accent={activeCampaigns > 0 ? 'text-emerald-600 dark:text-emerald-400' : undefined} />
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-2xl p-4 text-[13px] font-medium text-amber-700 dark:text-amber-400">
                          Sin datos de métricas para el período seleccionado.
                        </div>
                      )}

                      {!loadingInsights && Object.keys(insightsMap).length > 0 && (
                        <AlertsPanel campaigns={campaigns} map={insightsMap} />
                      )}
                      {loadingInsights && (
                        <div className="flex items-center gap-2 text-[12px] text-zinc-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Analizando {campaigns.length} campañas...
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <div className="relative flex-1 max-w-xs">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                          <input type="text" placeholder="Buscar campaña..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-[10px] text-[13px] text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                        </div>
                        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-[10px] gap-0.5 w-fit">
                          {(['ALL', 'ACTIVE', 'PAUSED'] as const).map(f => (
                            <button key={f} onClick={() => setCampaignFilter(f)}
                              className={`px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-all duration-150 ${
                                campaignFilter === f
                                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
                                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                              }`}>
                              {f === 'ALL' ? `Todas · ${campaigns.length}` : f === 'ACTIVE' ? `Activas · ${activeCampaigns}` : `Pausadas · ${pausedCampaigns}`}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {filteredCampaigns.length === 0 ? (
                          <div className="text-center py-20">
                            <p className="text-[13px] text-zinc-400 font-medium">No hay campañas que coincidan</p>
                          </div>
                        ) : filteredCampaigns.map(c => (
                          <CampaignRow
                            key={c.id} campaign={c} accountId={selectedAccount.id}
                            pair={insightsMap[c.id]}
                            dateMode={dateMode} preset={datePreset} since={since} until={until}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}





          {/* CREATIVOS TAB */}
          {tab === 'CREATIVOS' && (
            <div className="space-y-5">
              {!selectedAccount ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <Layers className="w-6 h-6 text-zinc-400" />
                  </div>
                  <p className="text-[15px] font-medium text-zinc-500">Selecciona una cuenta de la izquierda</p>
                </div>
              ) : loadingAds ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900/50 flex flex-col animate-pulse">
                      <div className="h-52 bg-zinc-200 dark:bg-zinc-700" />
                      <div className="p-4 space-y-3">
                        <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
                        <div className="grid grid-cols-4 gap-2 mt-2">{[...Array(4)].map((_, j) => <div key={j} className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeAds.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-16">No hay anuncios activos en esta cuenta.</p>
              ) : (() => {
                const adsWithSpend = activeAds.filter(ad => parseFloat(adInsightsMap[ad.id]?.spend || 0) > 0);
                const grouped: Record<string, { campaignName: string; ads: any[] }> = {};
                adsWithSpend.forEach(ad => {
                  const cid = ad.campaign_id || 'other';
                  const cname = campaignMap[cid] || 'Sin campaña';
                  if (!grouped[cid]) grouped[cid] = { campaignName: cname, ads: [] };
                  grouped[cid].ads.push(ad);
                });
                return (
                  <div className="space-y-8">
                    {Object.entries(grouped).map(([cid, group]) => (
                      <div key={cid}>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-1 h-5 rounded-full bg-blue-500 flex-shrink-0" />
                          <h4 className="text-[13px] font-black text-zinc-800 dark:text-zinc-100 tracking-tight truncate">{group.campaignName}</h4>
                          <span className="text-[10px] font-bold text-zinc-400 flex-shrink-0">{group.ads.length} creativos</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                          {group.ads.map(ad => {
                            const insights = adInsightsMap[ad.id];
                            const adSpend = parseFloat(insights?.spend || 0);
                            const adActions = insights?.actions || [];
                            const getResults = (type: string) => { const a = adActions.find((x: any) => x.action_type === type || x.action_type === `offsite_conversion.fb_pixel_${type}`); return a ? parseInt(a.value) : 0; };
                            const purchases = getResults('purchase'); const leads = getResults('lead'); const messages = getResults('onsite_conversion.messaging_conversation_started_7d');
                            const adResults = purchases || leads || messages;
                            const adCpa = adResults > 0 ? adSpend / adResults : 0;
                            const adImpr = parseInt(insights?.impressions || 0);
                            const adCtr = parseFloat(insights?.inline_link_click_ctr || 0);
                            const adRoas = parseFloat(insights?.purchase_roas?.[0]?.value || 0);
                            const resultLabel = purchases > 0 ? 'Ventas' : leads > 0 ? 'Leads' : messages > 0 ? 'Msgs' : 'Result.';
                            const isVideo = ad.creative?.object_type === 'VIDEO' || !!ad.creative?.video_id;
                            const thumbUrl = ad.creative?.image_url || ad.creative?.thumbnail_url;
                            return (
                              <div key={ad.id} className="rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900/50 shadow-sm hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 flex flex-col">
                                <div className="relative w-full h-52 bg-zinc-100 dark:bg-zinc-800 cursor-pointer group overflow-hidden flex-shrink-0"
                                  onClick={() => thumbUrl && setActivePreviewMeta({ url: thumbUrl, isVideo, videoId: ad.creative?.video_id, adId: ad.id, creativeId: ad.creative?.id, name: ad.name, previewShareableLink: ad.preview_shareable_link, effectiveObjectStoryId: ad.creative?.effective_object_story_id })}>
                                  {thumbUrl ? (<>
                                    <img src={thumbUrl} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-60" aria-hidden />
                                    <img src={thumbUrl} alt={ad.name} className="relative z-10 w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" />
                                    <div className="absolute inset-0 z-20 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                                      <div className={`flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-200 ${isVideo ? 'bg-white/90 scale-90 group-hover:scale-100' : 'bg-black/50 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'}`}>
                                        {isVideo ? (<svg className="w-6 h-6 text-zinc-900 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>) : (<ImageIcon className="w-6 h-6 text-white" />)}
                                      </div>
                                    </div>
                                  </>) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                      {isVideo ? <Film className="w-10 h-10 opacity-20" /> : <ImageIcon className="w-10 h-10 opacity-20" />}
                                      <span className="text-[11px] text-zinc-400 font-semibold">Sin preview</span>
                                    </div>
                                  )}
                                  {isVideo && (<div className="absolute top-2 right-2 z-30 flex items-center gap-1 bg-black/60 text-white px-2 py-0.5 rounded-full text-[9px] font-bold uppercase backdrop-blur-sm"><Film className="w-3 h-3" /> Video</div>)}
                                </div>
                                <div className="p-4 flex flex-col gap-3 flex-1">
                                  <div>
                                    <p className="text-[13px] font-bold text-zinc-900 dark:text-white leading-tight line-clamp-2">{ad.name}</p>
                                    {ad.creative?.object_type && (<p className="text-[10px] text-zinc-400 mt-0.5 font-semibold uppercase tracking-wider">{ad.creative.object_type}</p>)}
                                  </div>
                                  {insights && (
                                    <div className="grid grid-cols-4 gap-2">
                                      {[
                                        { label: 'Gasto', val: `$${adSpend.toFixed(0)}`, highlight: false },
                                        { label: resultLabel, val: adResults > 0 ? String(adResults) : '—', highlight: adResults > 0 },
                                        { label: 'CPA', val: adCpa > 0 ? `$${adCpa.toFixed(0)}` : '—', highlight: false },
                                        { label: adRoas > 0 ? 'ROAS' : 'CTR', val: adRoas > 0 ? `${adRoas.toFixed(2)}x` : adCtr > 0 ? `${adCtr.toFixed(1)}%` : '—', highlight: adRoas > 1 },
                                        { label: 'Impr.', val: adImpr > 0 ? (adImpr >= 1000 ? `${(adImpr/1000).toFixed(1)}K` : String(adImpr)) : '—', highlight: false },
                                      ].map(({ label, val, highlight }) => (
                                        <div key={label} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-2.5 border border-zinc-100 dark:border-white/[0.04]">
                                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-1">{label}</p>
                                          <p className={`text-[12px] font-bold leading-none ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-800 dark:text-zinc-100'}`}>{val}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <div className="flex gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-auto">
                                    <button onClick={() => thumbUrl && setActivePreviewMeta({ url: thumbUrl, isVideo, videoId: ad.creative?.video_id, adId: ad.id, creativeId: ad.creative?.id, name: ad.name, effectiveObjectStoryId: ad.creative?.effective_object_story_id })} className="flex-1 flex items-center justify-center gap-1 h-7 rounded-lg text-[10px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-white/[0.05] hover:text-zinc-900 dark:hover:text-white">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>Ver
                                    </button>
                                    <a href={ad.creative?.effective_object_story_id ? (ad.creative.effective_object_story_id.includes('_') ? (() => { const [pId, ptId] = ad.creative.effective_object_story_id.split('_'); return `https://www.facebook.com/permalink.php?story_fbid=${ptId}&id=${pId}`; })() : `https://facebook.com/${ad.creative.effective_object_story_id}`) : `https://www.facebook.com/ads/library/?id=${ad.creative?.id || ad.id}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1 h-7 rounded-lg text-[10px] font-bold text-[#1877F2] bg-[#1877F2]/8 dark:bg-[#1877F2]/10 hover:bg-[#1877F2]/15">
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>FB
                                    </a>
                                    <a href={ad.creative?.instagram_permalink_url || 'https://www.instagram.com/'} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1 h-7 rounded-lg text-[10px] font-bold text-pink-500 bg-pink-50 dark:bg-pink-500/10 hover:bg-pink-100" style={{ opacity: ad.creative?.instagram_permalink_url ? 1 : 0.35, pointerEvents: ad.creative?.instagram_permalink_url ? 'auto' : 'none' }}>
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>IG
                                    </a>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {activePreviewMeta && <CreativePreviewModal preview={activePreviewMeta} onClose={() => setActivePreviewMeta(null)} />}

        </div>
      </div>
    </div>
  );
}
