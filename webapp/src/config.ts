/** Base URL of the api project. The only place that reads import.meta.env. */
export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
