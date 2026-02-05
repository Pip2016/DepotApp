export const formatCurrency = (value: number, currency = 'EUR') => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(value);
};
