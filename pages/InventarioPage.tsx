import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useViewAs } from '../contexts/ViewAsContext';
import { Package, ExternalLink, ShoppingBag, ArrowUpRight } from 'lucide-react';

export default function InventarioPage() {
  const { profile: authProfile } = useAuth();
  const { viewAsProfile, isViewingAs } = useViewAs();
  const profile = (isViewingAs ? viewAsProfile : authProfile) as any;

  const platform = profile?.ecommerce_platform;
  const shopifyDomain = (profile?.shopify_domain || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const wordpressUrl = (profile?.wordpress_url || '').replace(/\/$/, '');
  const tiendanubeId = profile?.tiendanube_store_id;

  const getInventoryUrl = (): { url: string; label: string; sublabel: string } | null => {
    if (platform === 'shopify' && shopifyDomain) {
      return {
        url: `https://${shopifyDomain}/admin/products`,
        label: 'Abrir Inventario en Shopify',
        sublabel: shopifyDomain,
      };
    }
    if (platform === 'wordpress' && wordpressUrl) {
      return {
        url: `${wordpressUrl}/wp-admin/edit.php?post_type=product`,
        label: 'Abrir Inventario en WooCommerce',
        sublabel: wordpressUrl,
      };
    }
    if (platform === 'tiendanube' && tiendanubeId) {
      return {
        url: `https://www.tiendanube.com/tienda/${tiendanubeId}/products`,
        label: 'Abrir Inventario en Tiendanube',
        sublabel: `Tienda #${tiendanubeId}`,
      };
    }
    return null;
  };

  const destination = getInventoryUrl();

  const platformColor: Record<string, string> = {
    shopify: 'bg-emerald-500',
    wordpress: 'bg-blue-600',
    tiendanube: 'bg-cyan-500',
  };

  return (
    <div className="w-full pt-4 pb-20 md:pt-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <Package className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-[20px] font-black text-zinc-900 dark:text-white tracking-tight">Inventario</h1>
          <p className="text-[11px] text-zinc-400 font-medium">Gestioná tu stock directamente en tu plataforma</p>
        </div>
      </div>

      {!platform ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-zinc-400" />
          </div>
          <p className="text-[14px] font-semibold text-zinc-600 dark:text-zinc-400">Sin tienda conectada</p>
          <p className="text-[12px] text-zinc-400 max-w-xs">Conectá Shopify, WooCommerce o Tiendanube desde el panel de administración para gestionar el inventario.</p>
        </div>
      ) : !destination ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Package className="w-6 h-6 text-zinc-400" />
          </div>
          <p className="text-[14px] font-semibold text-zinc-600 dark:text-zinc-400">Configuración incompleta</p>
          <p className="text-[12px] text-zinc-400 max-w-xs">Falta el dominio o ID de la tienda. Completá la configuración desde el panel de administración.</p>
        </div>
      ) : (
        <div className="max-w-lg mx-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            {/* Platform banner */}
            <div className={`h-1.5 w-full ${platformColor[platform] || 'bg-zinc-400'}`} />

            <div className="p-8 flex flex-col items-center text-center gap-6">
              <div className={`w-16 h-16 rounded-2xl ${platformColor[platform] || 'bg-zinc-400'} bg-opacity-10 flex items-center justify-center`}>
                <Package className={`w-8 h-8 ${platform === 'shopify' ? 'text-emerald-600' : platform === 'wordpress' ? 'text-blue-600' : 'text-cyan-600'}`} />
              </div>

              <div>
                <p className="text-[18px] font-black text-zinc-900 dark:text-white mb-1">Gestión de Inventario</p>
                <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
                  Tu inventario se gestiona directamente en{' '}
                  <span className="font-bold capitalize">{platform === 'wordpress' ? 'WooCommerce' : platform}</span>
                </p>
              </div>

              <a
                href={destination.url}
                target="_blank"
                rel="noreferrer"
                className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-[14px] font-black text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  platform === 'shopify' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none' :
                  platform === 'wordpress' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none' :
                  'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-200 dark:shadow-none'
                }`}
              >
                {destination.label}
                <ArrowUpRight className="w-4 h-4" />
              </a>

              <p className="text-[11px] text-zinc-400 font-mono">{destination.sublabel}</p>
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 text-center mt-4 leading-relaxed">
            Se abre en una nueva pestaña. Iniciá sesión en tu tienda si todavía no lo hiciste.
          </p>
        </div>
      )}
    </div>
  );
}
