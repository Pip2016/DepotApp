export const formatPercent = (value: number) => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2).replace('.', ',')}%`;
};

export const formatNumber = (value: number, decimals = 2) => {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatLargeNumber = (value: number) => {
  if (value >= 1e12) return `${(value / 1e12).toFixed(2).replace('.', ',')} Bio.`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2).replace('.', ',')} Mrd.`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2).replace('.', ',')} Mio.`;
  return formatNumber(value, 0);
};
