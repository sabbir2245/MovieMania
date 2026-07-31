// Base URL for API calls.
//   - Production (Vercel): defaults to '' so requests are same-origin (/api/...).
//   - Local dev: front/.env sets REACT_APP_API_URL=http://localhost:3000.
// We intentionally read ONLY REACT_APP_API_URL here — REACT_APP_SERVER_URL and
// other legacy vars are ignored so they can never leak localhost into a build.
const base = process.env.REACT_APP_API_URL || '';

export const API_URL = base.replace(/\/+$/, '');
export const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || API_URL;

