export const formatMatchDate = (value: string) =>
  new Intl.DateTimeFormat('es-UY', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
