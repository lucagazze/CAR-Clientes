import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabase";
import { useToast } from "./Toast";
import { Loader2, Copy, Check, Upload, Trash2, AlertCircle, Webhook, FileSpreadsheet, Store } from "lucide-react";

// Configuración de Impultienda: el webhook trae las ventas nuevas y el Excel de
// "Ventas realizadas" el historial. Las órdenes se guardan en car_impultienda_orders;
// acá se elige además qué tiendas son de este cliente.

interface ImpulStore { id: string; name: string; orders: number; approved: number; imported: number; last: string | null }
interface ImpulStatus {
  connected: boolean;
  webhookUrl: string | null;
  token: string | null;
  storeIds: string[];
  stores: ImpulStore[];
  totalOrders: number;
  lastEvent: string | null;
  lastEventAt: string | null;
  lastImportAt: string | null;
}

async function callImpul(action: string, body: Record<string, any>) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`/api/oauth?action=${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Error HTTP ${res.status}`);
  return json;
}

const fmtDate = (iso: string | null) => iso
  ? new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
  : "—";

// Columnas del Excel que exporta Impultienda en "Ventas realizadas → Exportar XLSX".
const REQUIRED_COLUMNS = ["Orden", "Fecha", "Email", "Total", "EstadoPago"];

async function readImpultiendaExcel(file: File) {
  const { readSheet } = await import("read-excel-file/browser");
  const sheet = await readSheet(file);
  const [header = [], ...data] = sheet as any[][];
  const columns = header.map(h => String(h ?? "").trim());
  const missing = REQUIRED_COLUMNS.filter(c => !columns.includes(c));
  if (missing.length) throw new Error(`Este archivo no parece el Excel de ventas de Impultienda (faltan las columnas ${missing.join(", ")}).`);
  return data
    .filter(row => row.some(v => v !== null && v !== ""))
    .map(row => Object.fromEntries(columns.map((c, i) => {
      const v = row[i];
      return [c, v instanceof Date ? v.toISOString() : v ?? ""];
    })));
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{label}</label>
      <div className="flex gap-2">
        <input readOnly value={value} className="apple-input font-mono text-[11.5px] flex-1 min-w-0" onFocus={e => e.currentTarget.select()} />
        <button
          type="button"
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shrink-0"
          title="Copiar"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export default function ImpultiendaSetup({ clientId, onChanged, onClose }: { clientId: string; onChanged?: () => void; onClose?: () => void }) {
  const { showToast } = useToast();
  const [status, setStatus] = useState<ImpulStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [importStore, setImportStore] = useState("");
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const apply = (s: ImpulStatus) => {
    setStatus(s);
    setSelected(s.storeIds || []);
    const real = s.stores.filter(st => st.id !== "sin-tienda");
    setImportStore(prev => (real.some(st => st.id === prev) ? prev : real.length === 1 ? real[0].id : ""));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try { apply(await callImpul("impultienda-status", { clientId })); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try { await fn(); }
    catch (e: any) { setError(e.message); showToast(e.message, "error"); }
    finally { setBusy(null); }
  };

  const connect = () => run("connect", async () => {
    apply(await callImpul("impultienda-setup", { clientId }));
    onChanged?.();
    showToast("Webhook generado. Pegá la URL y el token en Impultienda.", "success");
  });

  const importExcel = (file: File) => run("import", async () => {
    if (!importStore) throw new Error("Elegí de qué tienda es el Excel.");
    const rows = await readImpultiendaExcel(file);
    if (!rows.length) throw new Error("El Excel no tiene ventas.");
    let imported = 0;
    let skipped = 0;
    setImportProgress({ done: 0, total: rows.length });
    try {
      for (let i = 0; i < rows.length; i += 500) {
        const r = await callImpul("impultienda-import", { clientId, store: { id: importStore }, rows: rows.slice(i, i + 500) });
        imported += r.imported || 0;
        skipped += r.skipped || 0;
        setImportProgress({ done: Math.min(i + 500, rows.length), total: rows.length });
      }
    } finally {
      setImportProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
    apply(await callImpul("impultienda-status", { clientId }));
    onChanged?.();
    showToast(`${imported.toLocaleString("es-AR")} órdenes importadas${skipped ? ` · ${skipped.toLocaleString("es-AR")} ya estaban por webhook o sin número` : ""} ✓`, "success");
  });

  const saveStores = () => run("stores", async () => {
    apply(await callImpul("impultienda-setup", { clientId, storeIds: selected }));
    onChanged?.();
    showToast("Tiendas guardadas ✓", "success");
  });

  const disconnect = () => {
    if (!window.confirm("¿Desconectar Impultienda? Las órdenes guardadas no se borran, pero el webhook deja de funcionar hasta que lo vuelvas a conectar con un token nuevo.")) return;
    run("disconnect", async () => {
      apply(await callImpul("impultienda-setup", { clientId, disconnect: true }));
      onChanged?.();
      showToast("Impultienda desconectado", "success");
    });
  };

  if (loading) {
    return <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>;
  }

  const realStores = (status?.stores || []).filter(s => s.id !== "sin-tienda");
  const storesChanged = status && JSON.stringify([...selected].sort()) !== JSON.stringify([...(status.storeIds || [])].sort());

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 text-[12px] text-red-700 dark:text-red-300 flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span className="font-semibold">{error}</span>
        </div>
      )}

      {!status?.connected ? (
        <div className="space-y-4">
          <p className="text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Impultienda le avisa a C.A.R cada venta, reembolso y contracargo por webhook (función del <strong>plan Max</strong>), y el historial se importa con el Excel de ventas.
            Las ventas aparecen en Inicio y en Pedidos.
          </p>
          <button type="button" onClick={connect} disabled={!!busy}
            className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[13px] font-extrabold flex items-center justify-center gap-2 disabled:opacity-50">
            {busy === "connect" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Webhook className="w-4 h-4" />}
            Generar webhook
          </button>
        </div>
      ) : (
        <>
          {/* 1. Webhook */}
          <section className="space-y-3">
            <h3 className="text-[13px] font-extrabold text-zinc-800 dark:text-zinc-200 flex items-center gap-2"><Webhook className="w-4 h-4 text-violet-500" /> 1. Webhook (ventas al instante)</h3>
            <p className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              En Impultienda: <strong>Configuraciones → Webhooks → Agregar endpoint</strong>. Pegá la URL, dejá <strong>Todas mis tiendas</strong> y todos los eventos tildados, y pegá el token en <strong>Token de autenticación</strong>.
              Después tocá <strong>Probar</strong> eligiendo un producto de cada tienda: así C.A.R conoce las tiendas.
            </p>
            <CopyField label="URL de notificaciones" value={status.webhookUrl || ""} />
            <CopyField label="Token de autenticación" value={status.token || ""} />
            <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400">
              Último aviso recibido: <strong className="text-zinc-700 dark:text-zinc-300">{status.lastEvent ? `${status.lastEvent} · ${fmtDate(status.lastEventAt)}` : "todavía ninguno"}</strong>
            </p>
          </section>

          {/* 2. Historial por Excel */}
          <section className="space-y-3 pt-5 border-t border-zinc-100 dark:border-white/[0.04]">
            <h3 className="text-[13px] font-extrabold text-zinc-800 dark:text-zinc-200 flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-violet-500" /> 2. Ventas anteriores (Excel)</h3>
            <p className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              El webhook solo trae las ventas nuevas. Para las anteriores: en Impultienda entrá a <strong>Ventas realizadas → Exportar XLSX</strong> con todo el rango de fechas, y subí el archivo eligiendo de qué tienda es. Una vez por tienda.
            </p>
            {realStores.length === 0 ? (
              <p className="text-[12px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 rounded-xl p-3">
                Todavía no llegó ningún aviso con tienda. Tocá <strong>Probar</strong> en el webhook de Impultienda con un producto de la tienda y volvé a abrir esta ventana.
              </p>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <select value={importStore} onChange={e => setImportStore(e.target.value)} disabled={!!busy}
                  className="apple-input flex-1 min-w-0">
                  <option value="">Elegí la tienda del Excel…</option>
                  {realStores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input ref={fileRef} type="file" accept=".xlsx" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) importExcel(f); }} />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={!!busy || !importStore}
                  className="h-10 px-4 rounded-xl bg-zinc-900 hover:bg-black dark:bg-white dark:text-zinc-950 text-white text-[12px] font-extrabold disabled:opacity-40 shrink-0 flex items-center justify-center gap-1.5">
                  {busy === "import" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {busy === "import" && importProgress ? `${importProgress.done.toLocaleString("es-AR")} / ${importProgress.total.toLocaleString("es-AR")}` : "Subir Excel"}
                </button>
              </div>
            )}
            <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400">
              Órdenes guardadas: <strong className="text-zinc-700 dark:text-zinc-300">{status.totalOrders.toLocaleString("es-AR")}</strong>
              {status.lastImportAt && <> · último Excel {fmtDate(status.lastImportAt)}</>}
            </p>
          </section>

          {/* 3. Tiendas */}
          {realStores.length > 0 && (
            <section className="space-y-3 pt-5 border-t border-zinc-100 dark:border-white/[0.04]">
              <h3 className="text-[13px] font-extrabold text-zinc-800 dark:text-zinc-200 flex items-center gap-2"><Store className="w-4 h-4 text-violet-500" /> 3. Tiendas de este cliente</h3>
              <p className="text-[12px] text-zinc-500 dark:text-zinc-400">Sin ninguna tildada se cuentan todas. Si tu cuenta de Impultienda tiene tiendas de otros negocios, tildá solo las de este.</p>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {realStores.map(s => (
                  <label key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-violet-600"
                      checked={selected.includes(s.id)}
                      onChange={e => setSelected(prev => e.target.checked ? [...prev, s.id] : prev.filter(x => x !== s.id))} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12.5px] font-bold text-zinc-800 dark:text-zinc-200 truncate">{s.name}</span>
                      <span className="block text-[11px] text-zinc-500">
                        {s.orders === 0 ? "Sin órdenes todavía" : `${s.approved.toLocaleString("es-AR")} ventas aprobadas · ${s.orders.toLocaleString("es-AR")} órdenes${s.imported ? ` (${s.imported.toLocaleString("es-AR")} del Excel)` : ""} · última ${fmtDate(s.last)}`}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {storesChanged && (
                <button type="button" onClick={saveStores} disabled={!!busy}
                  className="h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[12px] font-extrabold flex items-center gap-1.5 disabled:opacity-50">
                  {busy === "stores" && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Guardar tiendas
                </button>
              )}
            </section>
          )}

          <div className="pt-5 border-t border-zinc-100 dark:border-white/[0.04] flex items-center gap-3">
            <button type="button" onClick={disconnect} disabled={!!busy}
              className="mr-auto text-[12.5px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1.5">
              <Trash2 className="w-4 h-4" /> Desconectar
            </button>
            {onClose && (
              <button type="button" onClick={onClose} disabled={!!busy}
                className="px-5 h-10 rounded-xl text-[12.5px] font-bold border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all">
                Cerrar
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
