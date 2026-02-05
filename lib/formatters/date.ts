export const formatDate = (date: string | Date) => {
  return new Intl.DateTimeFormat('de-DE').format(new Date(date));
};

export const formatDateTime = (date: string | Date) => {
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
};

export const formatRelativeDate = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp * 1000;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) return 'Gerade eben';
  if (hours < 24) return `Vor ${hours} Stunde${hours > 1 ? 'n' : ''}`;
  if (days < 7) return `Vor ${days} Tag${days > 1 ? 'en' : ''}`;
  return formatDate(new Date(timestamp * 1000));
};
