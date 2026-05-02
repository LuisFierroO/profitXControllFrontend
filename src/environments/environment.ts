export const environment = {
  get apiUrl(): string {
    return (window as any).__env?.['API_URL'] || 'https://profitxcontrollbackend-production.up.railway.app';
  },
};
