export const environment = {
  get apiUrl(): string {
    return (window as any).__env?.['API_URL'] || 'http://localhost:8081';
  },
};
