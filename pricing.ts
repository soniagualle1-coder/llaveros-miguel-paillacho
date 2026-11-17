export const UNIT_PRICE = 2.5;
export const CHAIN_PRICE = 1.0;

export const SIZE_INFO: Record<"S" | "M" | "L", { label: string; cm: number; scale: number }> = {
  S: { label: "Pequeño", cm: 5, scale: 0.84 },
  M: { label: "Mediano", cm: 7, scale: 1.0 },
  L: { label: "Grande", cm: 9, scale: 1.16 },
};

export function calcTotal(totalKeychains: number, chain: boolean): number {
  const qty = Math.max(1, Math.floor(totalKeychains || 1));
  return qty * UNIT_PRICE + (chain ? CHAIN_PRICE : 0);
}

export function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}
