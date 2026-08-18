// Global configuration for API endpoints
const envUrl = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL = (envUrl && envUrl.trim() !== '') ? envUrl.trim() : 'http://localhost:8000';
