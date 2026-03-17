import axios from "axios";

// Jeder Request über api bekommt automatisch /api vorne dran.
// Cookies können gesendet werden unterhalb von /api
const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});


let accessToken: string | null = null;

// token wird gespeichert 
export function setAccessToken(token: string | null) {
  accessToken = token;
}

// toke wird in variable gespeichert 
export function getAccessToken() {
  return accessToken;
}


// Jeder Request bekommt den Access Token als Authorization Header mitgesendet.
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Wenn der Request ein 401 Fehler gibt, wird der Refresh Token verwendet um einen neuen Access Token zu bekommen.
// Wenn der Refresh Token nicht mehr gültig ist, wird der User auf die Login Seite umgeleitet.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Wichtig: Wenn /auth/refresh selbst 401 zurückgibt, dürfen wir NICHT erneut refreshen
    // und auch keinen Hard-Reload machen (sonst entsteht eine Endlos-Schleife).
    if (originalRequest?.url?.includes("/auth/refresh")) {
      accessToken = null;
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post("/api/auth/refresh", null, {
          withCredentials: true,
        });

        accessToken = data.accessToken;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        accessToken = null;
        // Kein window.location.href hier, sonst reload-loop.
        // Der App-State bleibt unauthenticated und die Router-Guards leiten korrekt um.
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
