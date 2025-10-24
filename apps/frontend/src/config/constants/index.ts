// Backend origin from env (no trailing slash). Do NOT append /api here.
const RAW_API = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
// Strip any trailing /api or /api/v1 so axios callers that add API.PREFIX don't double it.
const API_ORIGIN = RAW_API.replace(/\/api(\/v1)?$/i, '');

// 1) Keep the existing constant for axios and other clients that add their own prefixes
//    e.g., apiClient uses API_BASE_URL + API.PREFIX ("/api")
export const API_BASE_URL = API_ORIGIN;

// 2) Add a versioned absolute base for modules that need /api/v1 explicitly
export const API_V1_BASE = `${API_ORIGIN}/api/v1`;

// 3) Optional relative proxy base to use Next.js rewrites
export const PROXY_API_V1 = '/api/v1';
