// src/api/axios.js

import axios from "axios"; // HTTP client used for backend API requests

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  withCredentials: true, // Sends the JWT cookie with protected requests
  headers: {
    "Content-Type": "application/json"
  }
});

export default api;