import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingBag, TrendingUp, DollarSign, Package } from 'lucide-react';
import { ecommerce } from '../services/ecommerce';
import { getPrevPeriod, today, daysAgo } from '../services/metaAds'; // Reusing date helpers
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TiendaPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const p: any = profile;
      if (!p || !p.ecommerce_platform || !p.shopify_domain || !p.shopify_access_token) {
        setLoading(false);
        return;
      }
      
      const since = daysAgo(30);
      const until = today();
      try {
        const res = await ecommerce.getDashboardData(p.ecommerce_platform, p.shopify_domain, p.shopify_access_token, since, until);
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [profile]);

  if (!profile || !(profile as any).ecommerce_platform) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in px-4">
        <div className="w-16 h-16 bg-pink-100 dark:bg-pink-500/10 rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="w-8 h-8 text-pink-600 dark:text-pink-400" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">Tienda no configurada</h2>
        <p className="text-[15px] text-zinc-500 max-w-md text-center leading-relaxed">
          Para ver las métricas de tu e-commerce, necesitas conectar tu tienda Shopify o Tiendanube desde el panel de administración.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto animate-fade-in pb-20">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-[10px] bg-pink-500 flex items-center justify-center text-white shadow-sm">
            <ShoppingBag className="w-[20px] h-[20px]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Rendimiento de Tienda</h1>
            <p className="text-[13px] text-zinc-500 mt-0.5">Últimos 30 días - {(profile as any).ecommerce_platform}</p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard icon={DollarSign} label="Ingresos Totales" value={`$ ${data.revenue.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`} />
            <StatCard icon={Package} label="Pedidos Realizados" value={data.orders} />
            <StatCard icon={TrendingUp} label="Ticket Promedio" value={`$ ${data.aov.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`} />
          </div>

          {/* Chart */}
          <div className="bg-white dark:bg-[#111113] border border-black/[0.06] dark:border-white/[0.05] rounded-[16px] p-6 shadow-sm">
            <h3 className="text-[13px] font-bold text-zinc-900 dark:text-white mb-6">Ingresos Diarios</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.daily}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} dy={10} minTickGap={30} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} dx={-10} tickFormatter={val => `$${val}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: any) => [`$ ${Number(value).toLocaleString('es-AR')}`, 'Ingresos']}
                    labelFormatter={label => `Fecha: ${label}`}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#ec4899" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.05] rounded-[16px] p-10 text-center shadow-sm">
          <p className="text-zinc-500">No se encontraron datos en los últimos 30 días.</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any, label: string, value: string | number }) {
  return (
    <div className="bg-white dark:bg-[#111113] border border-black/[0.06] dark:border-white/[0.05] rounded-[16px] p-5 flex items-center gap-4 shadow-sm">
      <div className="w-12 h-12 bg-pink-50 dark:bg-pink-500/10 rounded-full flex items-center justify-center text-pink-600 dark:text-pink-400">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-[12px] font-medium text-zinc-500 mb-0.5">{label}</p>
        <p className="text-xl font-bold text-zinc-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}
