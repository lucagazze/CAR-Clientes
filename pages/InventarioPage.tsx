import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useViewAs } from '../contexts/ViewAsContext';
import { Package, ExternalLink, ShoppingBag, ArrowUpRight, AlertTriangle, Search, RefreshCw } from 'lucide-react';
import { ecommerce } from '../services/ecommerce';

const LOW_STOCK_THRESHOLD = 5;

interface Variant {
  id: number;
  title: string;
  inventory_quantity: number;
  price: string;
}

interface Product {
  id: number;
  title: string;
  image?: { src: string };
  variants: Variant[];
}

export default function InventarioPage() {
  const { profile: authProfile } = useAuth();
  const { viewAsProfile, isViewingAs } = useViewAs();
  const profile = (isViewingAs ? viewAsProfile : authProfile) as any;

  const platform = profile?.ecommerce_platform;
  const shopifyDomain = (profile?.shopify_domain || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const shopifyToken = profile?.shopify_access_token;
  const wordpressUrl = (profile?.wordpress_url || '').replace(/\/$/, '');
  const tiendanubeId = profile?.tiendanube_store_id;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');

  const getInventoryUrl = () => {
    if (platform === 'shopify' && shopifyDomain) return { url: `https://${shopifyDomain}/admin/products`, label: `Abrir en Shopify`, sublabel: shopifyDomain };
    if (platform === 'wordpress' && wordpressUrl) return { url: `${wordpressUrl}/wp-admin/edit.php?post_type=product`, label: `Abrir en WooCommerce`, sublabel: wordpressUrl };
    if (platform === 'tiendanube' && tiendanubeId) return { url: `https://www.tiendanube.com/tienda/${tiendanubeId}/products`, label: `Abrir en Tiendanube`, sublabel: `Tienda #${tiendanubeId}` };
    return null;
  };

  const destination = getInventoryUrl();

  useEffect(() => {
    if (platform !== 'shopify' || !shopifyDomain || !shopifyToken) return;
    setLoading(true);
    setError(null);
    ecommerce.getProducts(shopifyDomain, shopifyToken)
      .then(setProducts)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [platform, shopifyDomain, shopifyToken]);

  const allVariants = useMemo(() => {
    return products.flatMap(p =>
      p.variants.map(v => ({
        productId: p.id,
        productTitle: p.title,
        image: p.image?.src,
        variantTitle: v.title,
        variantId: v.id,
        qty: v.inventory_quantity ?? 0,
        price: v.price,
        isMultiVariant: p.variants.length > 1,
      }))
    );
  }, [products]);

  const filtered = useMemo(() => {
    let list = allVariants;
    if (filter === 'low') list = list.filter(v => v.qty > 0 && v.qty <= LOW_STOCK_THRESHOLD);
    if (filter === 'out') list = list.filter(v => v.qty <= 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v => v.productTitle.toLowerCase().includes(q) || v.variantTitle.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.qty - b.qty);
  }, [allVariants, filter, search]);

  const outCount  = allVariants.filter(v => v.qty <= 0).length;
  const lowCount  = allVariants.filter(v => v.qty > 0 && v.qty <= LOW_STOCK_THRESHOLD).length;
  const okCount   = allVariants.filter(v => v.qty > LOW_STOCK_THRESHOLD).length;

  const platformColor: Record<string, string> = { shopify: 'bg-emerald-500', wordpress: 'bg-blue-600', tiendanube: 'bg-cyan-500' };
  const btnColor: Record<string, string> = { shopify: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none', wordpress: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none', tiendanube: 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-200 dark:shadow-none' };

  return (
    <div className="w-full pt-4 pb-20 md:pt-6 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <Package className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-[20px] font-black text-zinc-900 dark:text-white tracking-tight">Inventario</h1>
          <p className="text-[11px] text-zinc-400 font-medium">Stock de productos en tiempo real</p>
        </div>
      </div>

      {!platform ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <ShoppingBag className="w-10 h-10 text-zinc-300" />
          <p className="text-[14px] font-semibold text-zinc-500">Sin tienda conectada</p>
          <p className="text-[12px] text-zinc-400 max-w-xs">Conectá Shopify, WooCommerce o Tiendanube desde el panel de administración.</p>
        </div>
      ) : !destination ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <Package className="w-10 h-10 text-zinc-300" />
          <p className="text-[14px] font-semibold text-zinc-500">Configuración incompleta</p>
          <p className="text-[12px] text-zinc-400 max-w-xs">Falta el dominio o ID de la tienda.</p>
        </div>
      ) : (
        <>
          {/* Open in platform button */}
          <a
            href={destination.url}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-black text-white shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] ${btnColor[platform] || 'bg-zinc-700'}`}
          >
            {destination.label}
            <ArrowUpRight className="w-4 h-4" />
          </a>

          {/* Only show product list for Shopify (has API access) */}
          {platform === 'shopify' && (
            <>
              {/* Summary chips */}
              {!loading && allVariants.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${filter === 'all' ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'}`}>
                    Todos {allVariants.length}
                  </button>
                  {outCount > 0 && (
                    <button onClick={() => setFilter('out')} className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${filter === 'out' ? 'bg-red-600 text-white' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                      Sin stock {outCount}
                    </button>
                  )}
                  {lowCount > 0 && (
                    <button onClick={() => setFilter('low')} className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${filter === 'low' ? 'bg-amber-500 text-white' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'}`}>
                      Stock bajo {lowCount}
                    </button>
                  )}
                  {okCount > 0 && <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">OK {okCount}</span>}
                </div>
              )}

              {/* Search */}
              {!loading && allVariants.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar producto..."
                    className="w-full pl-9 pr-4 py-2.5 text-[13px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Product list */}
              {loading ? (
                <div className="space-y-2">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                  ))}
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl text-[12px] text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-[13px] text-zinc-400 py-12">Sin resultados</p>
              ) : (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                  <div className={`h-1 w-full ${platformColor[platform] || 'bg-zinc-400'}`} />
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filtered.map(v => {
                      const isOut  = v.qty <= 0;
                      const isLow  = v.qty > 0 && v.qty <= LOW_STOCK_THRESHOLD;
                      return (
                        <div key={v.variantId} className={`flex items-center gap-3 px-4 py-3 ${isOut ? 'bg-red-50/60 dark:bg-red-950/10' : isLow ? 'bg-amber-50/60 dark:bg-amber-950/10' : ''}`}>
                          {/* Image */}
                          {v.image ? (
                            <img src={v.image} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 bg-zinc-100" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4 text-zinc-400" />
                            </div>
                          )}

                          {/* Name */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-zinc-900 dark:text-white truncate">{v.productTitle}</p>
                            {v.isMultiVariant && v.variantTitle !== 'Default Title' && (
                              <p className="text-[11px] text-zinc-400 truncate">{v.variantTitle}</p>
                            )}
                          </div>

                          {/* Stock badge */}
                          <div className="shrink-0 text-right">
                            {isOut ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                <AlertTriangle className="w-3 h-3" /> Sin stock
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="w-3 h-3" /> {v.qty} ud.
                              </span>
                            ) : (
                              <span className="text-[13px] font-black text-emerald-600">{v.qty}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Non-Shopify: just the button + note */}
          {platform !== 'shopify' && (
            <p className="text-[11px] text-zinc-400 text-center">
              Se abre en una nueva pestaña. Iniciá sesión en tu tienda si todavía no lo hiciste.
            </p>
          )}
        </>
      )}
    </div>
  );
}
