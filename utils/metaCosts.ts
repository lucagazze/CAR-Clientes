// Costos para clientes que solo tienen Meta Ads conectado (sin tienda).
// No hay pedidos ni catálogo, así que los costos se estiman sobre las compras y
// el retorno que informa Meta. Se guardan en la clave `metaCosts` de la config de Costos.
export type MetaOnlyCosts = {
  productCostPerSale: number; // costo del producto por venta (moneda de costos)
  otherPerSale: number;       // otros costos fijos por venta: envío, fee fijo (moneda de costos)
  productCostPct: number;     // costo del producto como % de lo facturado
  platformPct: number;        // comisión de la plataforma de venta
  paymentPct: number;         // comisión del medio de cobro
  taxPct: number;             // impuestos sobre la venta
};

export const DEFAULT_META_ONLY_COSTS: MetaOnlyCosts = {
  productCostPerSale: 0,
  otherPerSale: 0,
  productCostPct: 0,
  platformPct: 0,
  paymentPct: 0,
  taxPct: 0,
};

const toAmount = (value: any) => Math.max(0, Number(value) || 0);

export const normalizeMetaOnlyCosts = (raw: any): MetaOnlyCosts => {
  const parsed = raw && typeof raw === "object" ? raw : {};
  return {
    productCostPerSale: toAmount(parsed.productCostPerSale),
    otherPerSale: toAmount(parsed.otherPerSale),
    productCostPct: toAmount(parsed.productCostPct),
    platformPct: toAmount(parsed.platformPct),
    paymentPct: toAmount(parsed.paymentPct),
    taxPct: toAmount(parsed.taxPct),
  };
};

// Monto fijo que se descuenta por cada venta, en moneda de costos.
export const metaOnlyPerSale = (costs: MetaOnlyCosts) => costs.productCostPerSale + costs.otherPerSale;

// Porcentaje total que se descuenta de lo facturado.
export const metaOnlyPct = (costs: MetaOnlyCosts) =>
  costs.productCostPct + costs.platformPct + costs.paymentPct + costs.taxPct;

export const hasMetaOnlyCosts = (costs: MetaOnlyCosts) => metaOnlyPerSale(costs) > 0 || metaOnlyPct(costs) > 0;
