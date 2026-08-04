"use client";

import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { tokenStorage } from "@/lib/tokenStorage";
import { setLocalAccessToken, getLocalAccessToken } from "@/lib/axios";
import { getUserFromToken } from "@/lib/jwt";
import { AUTH_CONSTANTS } from "@/services/auth.constants";
import { NotificationProvider } from "@/context/NotificationContext";
import {
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  RefreshTokenResponse,
} from "@/services/auth.types";
import { authService } from "@/services/auth.service";

interface User {
  id?: string;
  name: string;
  email: string;
  mobile: string;
  location: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (data: ResetPasswordRequest) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeUserData(input: any): User | null {
  if (!input || typeof input !== "object") return null;

  const data = input.data || input.user || input.profile || input;

  const name =
    data.name ||
    data.Name ||
    data.fullName ||
    data.FullName ||
    data.username ||
    data.userName ||
    data.UserName ||
    "";

  const email =
    data.email ||
    data.Email ||
    data.emailAddress ||
    data.EmailAddress ||
    "";

  const mobile =
    data.mobile ||
    data.Mobile ||
    data.mobileNumber ||
    data.MobileNumber ||
    data.phone ||
    data.Phone ||
    data.phoneNumber ||
    data.PhoneNumber ||
    "";

  const location =
    data.location ||
    data.Location ||
    data.address ||
    data.Address ||
    data.city ||
    data.City ||
    "";

  if (!name && !email && !mobile) return null;

  return {
    id: data.id || data.Id || data.chemistId || data.ChemistId || undefined,
    name: name || "Registered Chemist",
    email: email || "",
    mobile: mobile || "",
    location: location || "",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Silent refresh implementation
  const runSilentRefresh = async () => {
    const storedRefreshToken = tokenStorage.getRefreshToken();
    if (!storedRefreshToken) {
      logout();
      return;
    }

    try {
      const response = await axios.post<RefreshTokenResponse>(
        `${AUTH_CONSTANTS.API_BASE_URL}auth/refresh-token`,
        { refreshToken: storedRefreshToken }
      );

      if (response.data.success && response.data.data) {
        const { accessToken, refreshToken, expiration } = response.data.data;
        
        setLocalAccessToken(accessToken);
        tokenStorage.setRefreshToken(refreshToken, expiration);
        
        scheduleNextRefresh(expiration);
      } else {
        throw new Error("Token refresh returned success: false");
      }
    } catch (err) {
      console.error("Silent refresh failed:", err);
      logout();
    }
  };

  const scheduleNextRefresh = (expirationStr: string) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    const expiryTime = new Date(expirationStr).getTime();
    const currentTime = new Date().getTime();
    const diffMs = expiryTime - currentTime;

    const refreshBuffer = 60 * 1000;
    const delay = Math.max(diffMs - refreshBuffer, 0);

    if (delay > 0) {
      refreshTimeoutRef.current = setTimeout(runSilentRefresh, delay);
    } else {
      runSilentRefresh();
    }
  };

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Initial Boot session check
  useEffect(() => {
    const bootstrapSession = async () => {
      const storedRefreshToken = tokenStorage.getRefreshToken();
      const cachedUser = tokenStorage.getUserData();

      if (cachedUser) {
        setUser(cachedUser);
      }

      if (!storedRefreshToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await axios.post<RefreshTokenResponse>(
          `${AUTH_CONSTANTS.API_BASE_URL}auth/refresh-token`,
          { refreshToken: storedRefreshToken }
        );

        if (response.data.success && response.data.data) {
          const { accessToken, refreshToken, expiration } = response.data.data;
          
          // Set token in-memory FIRST before any authenticated requests
          setLocalAccessToken(accessToken);
          tokenStorage.setRefreshToken(refreshToken, expiration);

          // Decode user from token immediately as fallback
          let profile: User | null = getUserFromToken(accessToken);

          // Only call profile endpoint if token is confirmed in-memory
          if (getLocalAccessToken()) {
            try {
              const profileResponse = await authService.getProfile();
              const freshProfile = normalizeUserData(profileResponse);
              if (freshProfile) profile = freshProfile;
            } catch (profileErr: any) {
              // Silently ignore CORS / network errors — we already have profile from JWT
              const isCorsOrNetwork =
                !profileErr?.response ||
                profileErr?.code === "ERR_NETWORK" ||
                profileErr?.message?.includes("Network Error");
              if (!isCorsOrNetwork) {
                console.warn("Profile endpoint error:", profileErr);
              }
            }
          }

          if (profile) {
            tokenStorage.setUserData(profile);
            setUser(profile);
          }

          scheduleNextRefresh(expiration);
        } else if (!cachedUser) {
          tokenStorage.clearTokens();
          setLocalAccessToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error("Session restoration failed:", err);
        if (!cachedUser) {
          tokenStorage.clearTokens();
          setLocalAccessToken(null);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (data: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.login(data);
      if (response.success && response.data) {
        const { accessToken, refreshToken, expiration } = response.data;
        
        setLocalAccessToken(accessToken);
        tokenStorage.setRefreshToken(refreshToken, expiration);
        
        let profile = normalizeUserData(response.data);
        if (!profile) {
          profile = getUserFromToken(accessToken);
        }
        if (!profile) {
          profile = {
            name: "Registered Chemist",
            email: data.email || "",
            mobile: "",
            location: "",
          };
        }

        tokenStorage.setUserData(profile);
        setUser(profile);

        scheduleNextRefresh(expiration);

        router.push("/dashboard/otp");
      } else {
        throw new Error(response.message || "Login failed");
      }
    } catch (err: any) {
      const serverMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message;
      throw new Error(serverMessage || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.register(data);
      if (!response.success) {
        throw new Error(response.message || "Registration failed");
      }
    } catch (err: any) {
      const serverMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message;
      throw new Error(serverMessage || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    tokenStorage.clearTokens();
    setLocalAccessToken(null);
    setUser(null);
    router.push(AUTH_CONSTANTS.ROUTES.LOGIN);
  };

  const forgotPassword = async (email: string) => {
    setIsLoading(true);
    try {
      const response = await authService.forgotPassword({ email });
      if (!response.success) {
        throw new Error(response.message || "Forgot password failed");
      }
    } catch (err: any) {
      const serverMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message;
      throw new Error(serverMessage || "Forgot password failed");
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (data: ResetPasswordRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.resetPassword(data);
      if (!response.success) {
        throw new Error(response.message || "Reset password failed");
      }
    } catch (err: any) {
      const serverMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message;
      throw new Error(serverMessage || "Reset password failed");
    } finally {
      setIsLoading(false);
    }
  };

  const isAuthenticated = !!user && !!getLocalAccessToken();

  const refreshProfile = useCallback(async () => {
    const storedRefreshToken = tokenStorage.getRefreshToken();
    if (!storedRefreshToken) return;

    // Don't call profile endpoint without a valid in-memory access token
    if (!getLocalAccessToken()) return;

    try {
      let profile: User | null = null;
      try {
        const profileResponse = await authService.getProfile();
        profile = normalizeUserData(profileResponse);
      } catch (profileErr: any) {
        const isCorsOrNetwork =
          !profileErr?.response ||
          profileErr?.code === "ERR_NETWORK" ||
          profileErr?.message?.includes("Network Error");
        if (!isCorsOrNetwork) {
          console.warn("Profile endpoint unreachable during refreshProfile:", profileErr);
        }
      }

      if (!profile) {
        profile = getUserFromToken();
      }

      if (profile) {
        tokenStorage.setUserData(profile);
        setUser(profile);
      }
    } catch (err) {
      console.error("Failed to refresh profile:", err);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        refreshProfile,
      }}
    >
      <NotificationProvider chemistEmail={user?.email || ""}>
        {children}
      </NotificationProvider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
export { AuthContext };
