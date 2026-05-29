import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useViewAs } from '../contexts/ViewAsContext';
import { db } from '../services/db';
import { useToast } from '../components/Toast';
import { 
  Brain, Globe, Save, RefreshCw, Sparkles, FileText, CheckCircle2, 
  HelpCircle, MessageSquare, ArrowRight, ShieldAlert, ArrowUpRight,
  Instagram
} from 'lucide-react';

export default function CerebroPage() {
  const { profile: authProfile } = useAuth();
  const { viewAsProfile, isViewingAs } = useViewAs();
  const profile = isViewingAs ? viewAsProfile : authProfile;
  const { showToast } = useToast();

  const [businessDescription, setBusinessDescription] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [scrapedContent, setScrapedContent] = useState('');
  const [instagramContext, setInstagramContext] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [syncingInstagram, setSyncingInstagram] = useState(false);
  const [generatingFields, setGeneratingFields] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setBusinessDescription(profile.business_description || '');
    setCustomInstructions(profile.custom_instructions || '');
    setWebsiteUrl(profile.website_url || '');
    setScrapedContent(profile.scraped_content || '');
    setInstagramContext((profile as any).instagram_context || '');
    setLoading(false);
  }, [profile]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      await db.clients.updateField(profile.id, {
        business_description: businessDescription,
        custom_instructions: customInstructions,
        website_url: websiteUrl,
      });
      showToast('Configuración del cerebro guardada exitosamente.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Error al guardar la configuración: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncInstagram = async () => {
    if (!profile) return;
    if (!(profile as any).ig_business_id) {
      showToast('No se puede sincronizar: Instagram no está configurado (falta vincular cuenta en Ajustes).', 'error');
      return;
    }

    setSyncingInstagram(true);
    showToast('Iniciando sincronización con Instagram... Esto puede demorar unos segundos.', 'info');
    try {
      const response = await fetch('/api/sync-instagram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: profile.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error desconocido al sincronizar Instagram.');
      }

      setInstagramContext(data.summary || '');
      showToast('¡Información de Instagram sincronizada exitosamente!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setSyncingInstagram(false);
    }
  };

  const handleGenerateFields = async () => {
    if (!profile || !scrapedContent) return;

    setGeneratingFields(true);
    showToast('Generando catálogo y tono optimizados con IA...', 'info');
    try {
      const response = await fetch('/api/generate-cerebro-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: profile.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error desconocido al optimizar campos.');
      }

      setBusinessDescription(data.business_description || '');
      setCustomInstructions(data.custom_instructions || '');
      showToast('¡Catálogo e instrucciones de tono optimizados con éxito!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setGeneratingFields(false);
    }
  };

  const handleScanWebsite = async () => {
    if (!profile || !websiteUrl.trim()) return;

    setScanning(true);
    showToast('Iniciando escaneo de la web... Esto puede demorar unos segundos.', 'info');
    try {
      const response = await fetch('/api/scrape-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: profile.id,
          url: websiteUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error desconocido al escanear la web.');
      }

      setScrapedContent(data.summary || '');
      showToast('¡Web escaneada y consolidada en el cerebro con éxito!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-10 h-10 border-2 border-zinc-300 dark:border-zinc-700 border-t-violet-600 rounded-full animate-spin" />
        <p className="text-[13px] text-zinc-400 dark:text-zinc-500">Cargando base de conocimiento...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-400">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
              <Brain className="w-6 h-6 text-violet-500 animate-pulse" />
              Cerebro de IA
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 tracking-wider uppercase">
              BETA
            </span>
          </div>
          <p className="text-[13px] text-zinc-400 dark:text-zinc-500 mt-1 font-medium max-w-2xl">
            Alimenta la base de conocimiento y define las pautas de tono para que el asistente de IA responda de forma personalizada e inteligente sobre tu negocio.
          </p>
        </div>

        {isViewingAs && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-[11px] font-bold">
            <ShieldAlert className="w-4 h-4" />
            <span>Modo Administrador Activo</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Settings */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSaveSettings} className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-[18px] h-[18px] text-zinc-400" />
                  Contexto Manual del Negocio
                </h2>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                  Define las pautas de comportamiento y catálogo manualmente.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateFields}
                disabled={generatingFields || !scrapedContent}
                className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-violet-50 hover:bg-violet-100 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
                title="Genera y optimiza el catálogo y tono de manera automática usando la IA basada en el contenido web escaneado."
              >
                {generatingFields ? (
                  <div className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {generatingFields ? 'Optimizando...' : 'Optimizar con IA'}
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Business Description / Catalog */}
              <div className="space-y-2">
                <label className="block text-[12px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Catálogo, Ofertas y Preguntas Clave
                </label>
                <textarea
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  placeholder="Ej: Vendemos calzado de cuero artesanal en Argentina. Ofrecemos 3 cuotas sin interés y envíos gratis a partir de $80.000. Los cambios se realizan dentro de los 30 días en nuestros locales..."
                  className="w-full min-h-[160px] p-4 text-[13px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 resize-y leading-relaxed"
                />
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-normal">
                  Detalla aquí información relevante de tus productos, promociones activas, horarios, ubicaciones y respuestas frecuentes específicas que quieras que el bot use de manera prioritaria.
                </p>
              </div>

              {/* Custom Tone Instructions */}
              <div className="space-y-2">
                <label className="block text-[12px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Instrucciones de Tono y Comportamiento (AI System Prompt Additions)
                </label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Ej: Responde siempre con tono alegre, joven e informal. Utiliza el voseo argentino (ej: 'mirá', 'comprá'). Evita sonar robótico. Usa emojis de manera moderada."
                  className="w-full min-h-[120px] p-4 text-[13px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 resize-y leading-relaxed"
                />
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-normal">
                  Define el estilo de redacción, el idioma, restricciones de vocabulario o cómo tratar al cliente.
                </p>
              </div>

              {/* Web link input within save form */}
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                <label className="block text-[12px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Enlace del Sitio Web / Tienda Shopify
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://mitienda.com"
                      className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-[13px] font-bold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 active:scale-[0.98]"
              >
                {saving ? (
                  <div className="w-3.5 h-3.5 border-2 border-zinc-500 border-t-white dark:border-t-zinc-900 rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Web Scraper */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-[15px] font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Globe className="w-[18px] h-[18px] text-zinc-400" />
                Escanear y Aprender Sitio Web
              </h2>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                Extrae información detallada de tu tienda online directamente al cerebro de la IA.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-violet-50/50 dark:bg-violet-500/5 border border-violet-100 dark:border-violet-500/10 space-y-3">
              <div className="flex gap-2">
                <Sparkles className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] font-semibold text-zinc-800 dark:text-zinc-200 leading-normal">
                  ¿Cómo funciona el escáner IA?
                </p>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Ingresando la URL de tu Shopify o web, la IA visitará el sitio, analizará tus productos, políticas de envíos y FAQs, y guardará un resumen inteligente del negocio para responder consultas.
              </p>
            </div>

            <div className="space-y-4">
              <button
                type="button"
                onClick={handleScanWebsite}
                disabled={scanning || !websiteUrl.trim()}
                className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-[13px] font-bold shadow-lg shadow-violet-500/10 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
              >
                {scanning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Leyendo y Aprendiendo...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Escanear y Aprender Sitio Web</span>
                  </>
                )}
              </button>

              {websiteUrl && (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  Ver sitio web actual
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Scraped Content Preview */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-[15px] font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-[18px] h-[18px] text-emerald-500" />
                Conocimiento Extraído de la Web
              </h2>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                Resumen consolidado actualmente en uso por la IA.
              </p>
            </div>

            <div className="p-6">
              {scrapedContent ? (
                <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl p-4 max-h-[300px] overflow-y-auto space-y-4 text-[12px] leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-line scrollbar-hide">
                  {scrapedContent}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/80 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-zinc-300 dark:text-zinc-700" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-zinc-500 dark:text-zinc-400">Sin contenido escaneado</p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 max-w-xs mt-1 leading-normal">
                      Ingresa una URL arriba y haz clic en "Escanear" para que la IA complete esta sección con tu información web.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instagram Scraper Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-[15px] font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Instagram className="w-[18px] h-[18px] text-pink-500 animate-pulse" />
                Sincronizar Feed de Instagram
              </h2>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                Lee y aprende de las publicaciones y descripciones recientes de tu marca.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-pink-50/50 dark:bg-pink-500/5 border border-pink-100/60 dark:border-pink-500/10 space-y-3">
              <div className="flex gap-2">
                <Sparkles className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] font-semibold text-zinc-800 dark:text-zinc-200 leading-normal">
                  ¿Por qué sincronizar Instagram?
                </p>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Al sincronizar el feed, la IA comprenderá el tono con el que te comunicas en redes sociales, los productos que estás promocionando activamente y las últimas ofertas publicadas.
              </p>
            </div>

            <div className="space-y-4">
              <button
                type="button"
                onClick={handleSyncInstagram}
                disabled={syncingInstagram || !(profile as any)?.ig_business_id}
                className="w-full py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white rounded-xl text-[13px] font-bold shadow-lg shadow-pink-500/10 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
              >
                {syncingInstagram ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sincronizando Instagram...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Sincronizar y aprender de Instagram</span>
                  </>
                )}
              </button>

              {!(profile as any)?.ig_business_id && (
                <p className="text-[10px] text-red-500 dark:text-red-400 text-center font-medium leading-normal">
                  ⚠️ Debes vincular tu cuenta de Instagram comercial en la sección de administración para habilitar esta función.
                </p>
              )}
            </div>
          </div>

          {/* Instagram Content Preview */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-[15px] font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-[18px] h-[18px] text-emerald-500" />
                Conocimiento Extraído de Instagram
              </h2>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                Resumen de publicaciones y estilo consolidado en el cerebro.
              </p>
            </div>

            <div className="p-6">
              {instagramContext ? (
                <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl p-4 max-h-[300px] overflow-y-auto space-y-4 text-[12px] leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-line scrollbar-hide">
                  {instagramContext}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/80 flex items-center justify-center">
                    <Instagram className="w-6 h-6 text-zinc-300 dark:text-zinc-700" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-zinc-500 dark:text-zinc-400">Sin sincronización de Instagram</p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 max-w-xs mt-1 leading-normal">
                      Haz clic en "Sincronizar y aprender de Instagram" arriba para entrenar la IA con tus últimas publicaciones.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
