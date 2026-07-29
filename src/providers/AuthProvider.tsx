"use client";

import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { tokenStorage } from "@/lib/tokenStorage";
import { setLocalAccessToken, getLocalAccessToken } from "@/lib/axios";
import { AUTH_CONSTANTS } from "@/services/auth.constants";
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
        
        // Re-schedule next silent refresh
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

    // Refresh 60 seconds before actual token expiration
    const refreshBuffer = 60 * 1000;
    const delay = Math.max(diffMs - refreshBuffer, 0);

    if (delay > 0) {
      refreshTimeoutRef.current = setTimeout(runSilentRefresh, delay);
    } else {
      runSilentRefresh();
    }
  };

  // Clear timeout on unmount
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

      if (!storedRefreshToken) {
        setIsLoading(false);
        return;
      }

      try {
        // Exchange refresh token for access token immediately
        const response = await axios.post<RefreshTokenResponse>(
          `${AUTH_CONSTANTS.API_BASE_URL}auth/refresh-token`,
          { refreshToken: storedRefreshToken }
        );

        if (response.data.success && response.data.data) {
          const { accessToken, refreshToken, expiration } = response.data.data;
          
          setLocalAccessToken(accessToken);
          tokenStorage.setRefreshToken(refreshToken, expiration);
          
          try {
            const profileResponse = await authService.getProfile() as any;
            let profile: User | null = null;
            if (profileResponse) {
              if (profileResponse.email || profileResponse.name) {
                profile = {
                  name: profileResponse.name || "",
                  email: profileResponse.email || "",
                  mobile: profileResponse.mobile || "",
                  location: profileResponse.location || "",
                };
              } else if (profileResponse.success && profileResponse.data) {
                profile = profileResponse.data;
              }
            }

            if (profile) {
              tokenStorage.setUserData(profile);
              setUser(profile);
            } else {
              throw new Error("Failed to parse profile response");
            }
          } catch (profileErr) {
            console.warn("Failed to fetch fresh profile, using cached/fallback:", profileErr);
            if (cachedUser) {
              setUser(cachedUser);
            } else {
              // Fallback user if cache was cleared
              setUser({
                name: "Authenticated Chemist",
                email: "chemist@gmail.com",
                mobile: "0000000000",
                location: "Delhi",
              });
            }
          }

          // Schedule automated background silent refresh
          scheduleNextRefresh(expiration);
        } else {
          tokenStorage.clearTokens();
          setLocalAccessToken(null);
        }
      } catch (err) {
        console.error("Session restoration failed:", err);
        tokenStorage.clearTokens();
        setLocalAccessToken(null);
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
        const { accessToken, refreshToken, email, name, mobile, location, expiration } = response.data;
        
        // Save in-memory
        setLocalAccessToken(accessToken);
        
        // Save secure refresh token in cookie and profile cache in storage
        tokenStorage.setRefreshToken(refreshToken, expiration);
        const profile = { name, email, mobile, location };
        tokenStorage.setUserData(profile);
        
        setUser(profile);

        // Schedule automated background silent refresh
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

    try {
      const profileResponse = await authService.getProfile() as any;
      let profile: User | null = null;
      if (profileResponse) {
        if (profileResponse.email || profileResponse.name) {
          profile = {
            name: profileResponse.name || "",
            email: profileResponse.email || "",
            mobile: profileResponse.mobile || "",
            location: profileResponse.location || "",
          };
        } else if (profileResponse.success && profileResponse.data) {
          profile = profileResponse.data;
        }
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
      {children}
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
