const base =
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_SERVER_URL ||
  '';

export const API_URL = base.replace(/\/+$/, '');
export const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || API_URL;
