const cediFormatter = new Intl.NumberFormat("en-GH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number) {
  const amount = Number.isFinite(value) ? value : 0;
  return `₵${cediFormatter.format(amount)}`;
}
