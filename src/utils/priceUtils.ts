export const formatPrice = (value: number | undefined | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '-';
  // Forex often needs 4-5 decimals; keep a sensible default and trim trailing zeros.
  const formatted = value.toFixed(5);
  return Number(formatted).toString();
};
