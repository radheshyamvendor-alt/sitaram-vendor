import { AUTH_CONSTANTS } from "@/services/auth.constants";

export const tokenStorage = {
  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;

    // 1. Try reading from localStorage first (100% immune to cross-domain cookie stripping)
    const fromLocal = localStorage.getItem(AUTH_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN);
    if (fromLocal && fromLocal.trim().length > 0) {
      return fromLocal;
    }

    // 2. Fallback to cookie if localStorage is empty
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
    if (!token) return;

    // Save in localStorage for absolute persistence across external redirects
    localStorage.setItem(AUTH_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN, token);

    // Save in long-lived cookie
    const date = new Date();
    date.setTime(date.getTime() + 7 * 24 * 60 * 60 * 1000);
    const expires = `; expires=${date.toUTCString()}`;
    const isSecure = window.location.protocol === "https:";
    const secureFlag = isSecure ? "; Secure" : "";

    document.cookie = `${AUTH_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN}=${token}${expires}; path=/; SameSite=Lax${secureFlag}`;
  },

  clearTokens(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(AUTH_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(AUTH_CONSTANTS.STORAGE_KEYS.USER_DATA);

    const isSecure = window.location.protocol === "https:";
    const secureFlag = isSecure ? "; Secure" : "";
    document.cookie = `${AUTH_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax${secureFlag}`;
  },

  setUserData(data: { id?: string; name?: string; email?: string; mobile?: string; location?: string }): void {
    if (typeof window === "undefined") return;
    if (!data || typeof data !== "object") return;

    const cleaned = {
      id: data.id || undefined,
      name: data.name || "",
      email: data.email || "",
      mobile: data.mobile || "",
      location: data.location || "",
    };

    if (!cleaned.name && !cleaned.email && !cleaned.mobile) {
      return;
    }

    localStorage.setItem(AUTH_CONSTANTS.STORAGE_KEYS.USER_DATA, JSON.stringify(cleaned));
  },

  getUserData(): { id?: string; name: string; email: string; mobile: string; location: string } | null {
    if (typeof window === "undefined") return null;
    const data = localStorage.getItem(AUTH_CONSTANTS.STORAGE_KEYS.USER_DATA);
    if (!data) return null;
    try {
      const parsed = JSON.parse(data);
      if (!parsed || typeof parsed !== "object") return null;

      const name = parsed.name || parsed.Name || "";
      const email = parsed.email || parsed.Email || "";
      const mobile = parsed.mobile || parsed.Mobile || parsed.phone || parsed.Phone || "";
      const location = parsed.location || parsed.Location || parsed.address || parsed.Address || "";

      if (!name && !email && !mobile) {
        return null;
      }

      return {
        id: parsed.id || parsed.Id || undefined,
        name: name || "Registered Chemist",
        email,
        mobile,
        location,
      };
    } catch {
      return null;
    }
  },
};
