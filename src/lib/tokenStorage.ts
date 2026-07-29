import { AUTH_CONSTANTS } from "@/services/auth.constants";

export const tokenStorage = {
  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    const name = `${AUTH_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN}=`;
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return null;
  },

  setRefreshToken(token: string, expirationStr?: string): void {
    if (typeof window === "undefined") return;
    // Always use a long-lived cookie (7 days) for the refresh token
    // to prevent it from being deleted when the short-lived access token expires (1 hour).
    const date = new Date();
    date.setTime(date.getTime() + 7 * 24 * 60 * 60 * 1000);
    const expires = `; expires=${date.toUTCString()}`;
    
    // Write cookie with security attributes
    document.cookie = `${AUTH_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN}=${token}${expires}; path=/; SameSite=Lax; Secure`;
  },

  clearTokens(): void {
    if (typeof window === "undefined") return;
    // Clear cookie
    document.cookie = `${AUTH_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax; Secure`;
    // Clear user data
    localStorage.removeItem(AUTH_CONSTANTS.STORAGE_KEYS.USER_DATA);
  },

  setUserData(data: { id?: string; name: string; email: string; mobile: string; location: string }): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(AUTH_CONSTANTS.STORAGE_KEYS.USER_DATA, JSON.stringify(data));
  },

  getUserData(): { id?: string; name: string; email: string; mobile: string; location: string } | null {
    if (typeof window === "undefined") return null;
    const data = localStorage.getItem(AUTH_CONSTANTS.STORAGE_KEYS.USER_DATA);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
};
