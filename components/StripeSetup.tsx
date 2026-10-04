import React, { useCallback, useEffect, useState } from "react";
import { useToast } from "./Toast";
import { stripeApi } from "../services/ecommerce";
import { Loader2, RefreshCw, Trash2, AlertCircle, Plus, KeyRound } from "lucide-react";

// Stripe como tienda: qué cuentas de Stripe suma este cliente y su sincronización.
// El admin elige cuentas de la organización (clave del servidor); un cliente externo pega
// una clave restringida de solo lectura.

interface StripeAccount { id: string; name: string; ownKey: boolean; transactions: number; syncedUntil: string | null; syncedAt: string | null }
interface StripeStatus { accounts: StripeAccount[]; available: { id: string; name: string }[]; canUseOrgKey: boolean }

const fmtDate = (iso: string | null) => iso
  ? new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
  : "—";

export default function StripeSetup({ clientId, onChanged, onClose }: { clientId: string; onChanged?: () => void; onClose?: () => void }) {
  const { showToast } = useToast();
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [progress, setProgress] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setStatus(await stripeApi.status(clientId)); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try { await fn(); }
    catch (e: any) { setError(e.message); showToast(e.message, "error"); }
    finally { setBusy(null); setProgress(null); }
  };

  const sync = async () => {
    setProgress(0);
    const total = await stripeApi.sync(clientId, n => setProgress(n));
    setStatus(await stripeApi.status(clientId));
    onChanged?.();
    return total;
  };

  const connect = (body: Record<string, any>) => run("connect", async () => {
    setStatus(await stripeApi.setup(clientId, body));
    setPick("");
    setApiKey("");
    onChanged?.();
    // La primera vez trae todo el historial de la cuenta.
    const total = await sync();
    showToast(`Cuenta conectada · ${total.toLocaleString("es-AR")} movimientos importados ✓`, "success");
  });

  const syncNow = () => run("sync", async () => {
    const total = await sync();
    showToast(total ? `${total.toLocaleString("es-AR")} movimientos nuevos ✓` : "Todo al día ✓", "success");
  });

  const remove = (acc: StripeAccount) => {
    if (!window.confirm(`¿Quitar ${acc.name} de este cliente? Los movimientos guardados no se borran.`)) return;
    run(`remove-${acc.id}`, async () => {
      setStatus(await stripeApi.setup(clientId, { remove: acc.id }));
      onChanged?.();
    });
  };

  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>;

  const accounts = status?.accounts || [];

  return (
    <div className="space-y-6">
      <p className="text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
        Con Stripe, Inicio muestra lo que entra de verdad: cobrado bruto, comisión exacta de Stripe y de la plataforma, reembolsos, contracargos y el neto, al lado de la inversión en Meta.
      </p>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 text-[12px] text-red-700 dark:text-red-300 flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span className="font-semibold">{error}</span>
        </div>
      )}

      {accounts.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Cuentas conectadas</h3>
          {accounts.map(acc => (
            <div key={acc.id} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200 truncate">{acc.name}</p>
                <p className="text-[11px] text-zinc-500 truncate">
                  {acc.id} · {acc.transactions.toLocaleString("es-AR")} movimientos · al día hasta {fmtDate(acc.syncedUntil)}
                </p>
              </div>
              <button type="button" onClick={() => remove(acc)} disabled={!!busy} title="Quitar"
                className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-40">
                {busy === `remove-${acc.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          ))}
          <button type="button" onClick={syncNow} disabled={!!busy}
            className="w-full h-10 rounded-xl border border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-500/10 text-[12.5px] font-extrabold flex items-center justify-center gap-2 disabled:opacity-50">
            {busy === "sync" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {busy === "sync" ? `Sincronizando… ${(progress || 0).toLocaleString("es-AR")}` : "Sincronizar ahora"}
          </button>
          <p className="text-[11px] text-zinc-400">Inicio trae solo los movimientos nuevos cada vez que se abre.</p>
        </section>
      )}

      <section className="space-y-3 pt-1">
        <h3 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Agregar una cuenta</h3>
        {status?.canUseOrgKey && (status.available || []).length > 0 && (
          <div className="flex gap-2">
            <select value={pick} onChange={e => setPick(e.target.value)} disabled={!!busy} className="apple-input flex-1 min-w-0">
              <option value="">Cuenta de la organización…</option>
              {status.available.map(a => <option key={a.id} value={a.id}>{a.name} ({a.id})</option>)}
            </select>
            <button type="button" onClick={() => connect({ accountId: pick })} disabled={!!busy || !pick}
              className="h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[12px] font-extrabold disabled:opacity-40 shrink-0 flex items-center gap-1.5">
              {busy === "connect" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Conectar
            </button>
          </div>
        )}
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <input type="password" className="apple-input flex-1 min-w-0" placeholder="Clave restringida de Stripe (rk_live_...)"
              value={apiKey} onChange={e => setApiKey(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (apiKey.trim()) connect({ apiKey }); } }} />
            <button type="button" onClick={() => connect({ apiKey })} disabled={!!busy || !apiKey.trim()}
              className="h-10 px-4 rounded-xl bg-zinc-900 hover:bg-black dark:bg-white dark:text-zinc-950 text-white text-[12px] font-extrabold disabled:opacity-40 shrink-0 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" /> Conectar
            </button>
          </div>
          <p className="text-[11px] text-zinc-400">En Stripe: Desarrolladores → Claves de API → Crear clave restringida, con permiso de <strong>lectura</strong> en Saldo, Cargos y Cuenta.</p>
        </div>
        {busy === "connect" && progress !== null && (
          <p className="text-[12px] font-semibold text-violet-600 dark:text-violet-400 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Importando el historial… {progress.toLocaleString("es-AR")} movimientos
          </p>
        )}
      </section>

      {onClose && (
        <div className="pt-5 border-t border-zinc-100 dark:border-white/[0.04] flex justify-end">
          <button type="button" onClick={onClose} disabled={!!busy}
            className="px-5 h-10 rounded-xl text-[12.5px] font-bold border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all">
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
