// import axios from "axios";

// const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
// const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL

// if (!BASE_URL) {
//   throw new Error("NEXT_PUBLIC_BASE_URL is not defined");
// }

// if (!PORTAL_URL) {
//   throw new Error("NEXT_PUBLIC_PORTAL_URL is not defined");
// }

// const api = axios.create({
//   baseURL: BASE_URL,
//   withCredentials: true,
//   headers: {
//     "Content-Type": "application/json",
//   },
// });

// api.interceptors.request.use(
//   (config) => {
//     if (typeof window !== "undefined") {
//       const token =
//         localStorage.getItem("sso_access_token") ||
//         localStorage.getItem("token");
//       if (token) {
//         config.headers.Authorization = `Bearer ${token}`;
//       }
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (typeof window !== "undefined" && error.response) {
//       const status = error.response.status;

//       if (status === 401) {
//         localStorage.removeItem("sso_access_token");
//         localStorage.removeItem("token");

//         window.location.href = PORTAL_URL;
//       }
//     }
//     return Promise.reject(error);
//   }
// );

// export default api;

import axios from "axios";
import { getApiBaseUrl } from "./runtime-config";

const api = axios.create({
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  config.baseURL = await getApiBaseUrl();
  return config;
});

api.interceptors.response.use(undefined, (error) => {
  if (typeof window !== "undefined" && error.response?.status === 401) {
    const returnTo = window.location.pathname + window.location.search;
    const login = new URL("/rule/login", window.location.origin);
    login.searchParams.set("returnTo", returnTo);
    window.location.assign(login.href);
  }
  return Promise.reject(error);
});

// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       if (typeof window !== "undefined") {
//         if (!window.location.pathname.startsWith("/login")) {
//           window.location.href = "/login";
//         }
//       }
//     }
//     return Promise.reject(error);
//   }
// );

export default api;
