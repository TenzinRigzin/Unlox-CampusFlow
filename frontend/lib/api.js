// frontend/lib/api.js
// Configured Axios instance for CampusFlow API calls

import axios from 'axios';

// Base URL is provided via NEXT_PUBLIC_API_URL environment variable
// Example: "http://localhost:4000"
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  // You can add default headers here if needed
});

/**
 * Returns an Authorization header object pulling the token from localStorage.
 * This helper is safe for server‑side rendering – it only accesses localStorage
 * when running in the browser.
 */
export function getAuthHeaders() {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('campusflow_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
