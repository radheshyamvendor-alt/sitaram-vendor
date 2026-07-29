import { getLocalAccessToken } from "./axios";

export function parseJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error("Failed to parse JWT token payload:", err);
    return null;
  }
}

export function getChemistIdFromToken(tokenString?: string | null): {
  chemistId: string | null;
  isExpired: boolean;
  error?: string;
} {
  const token = tokenString || getLocalAccessToken();
  if (!token) {
    return { chemistId: null, isExpired: true, error: "No active access token found." };
  }

  const payload = parseJwtPayload(token);
  if (!payload) {
    return { chemistId: null, isExpired: true, error: "Invalid token format." };
  }

  // Verify expiration
  const currentTime = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < currentTime) {
    return { chemistId: null, isExpired: true, error: "Session expired. Please login again." };
  }

  // Extract ID claim: chemistId, id, userId, sub, nameid, or nameidentifier
  const rawId =
    payload.chemistId ||
    payload.id ||
    payload.userId ||
    payload.sub ||
    payload.nameid ||
    payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];

  if (!rawId) {
    return { chemistId: null, isExpired: false, error: "Chemist ID claim not found in JWT token." };
  }

  return {
    chemistId: String(rawId),
    isExpired: false,
  };
}
