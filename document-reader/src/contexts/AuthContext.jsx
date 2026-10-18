import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
    tokenService,
    authService,
    setAuthFailureHandler,
} from "../services/apiClient";
import {
    PHONE_KEY,
    USER_PHONE_KEY,
    INITIAL_PHONE_PREFIX,
} from "../constants/auth";
import { DISPLAY_NAME_KEY } from "../constants/home";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    // Phone number init order:
    // 1) sessionStorage — the active login flow in this tab (OTP page)
    // 2) localStorage   — the verified phone, persisted alongside the tokens
    // 3) "09"           — default prefix for the login screen
    const [phoneNumber, setPhoneNumber] = useState(
        () =>
            sessionStorage.getItem(PHONE_KEY) ||
            localStorage.getItem(USER_PHONE_KEY) ||
            INITIAL_PHONE_PREFIX
    );

    // Auth state derives from the token in localStorage (not React memory),
    // so a page refresh cannot lose it
    const [isAuthenticated, setIsAuthenticated] = useState(() =>
        Boolean(tokenService.getAccessToken())
    );

    // Called after a successful OTP verification (OtpVerifyPage).
    // Persists the verified phone number so future sessions keep it.
    const login = useCallback((verifiedPhone) => {
        const phone =
            typeof verifiedPhone === "string" ? verifiedPhone.trim() : "";

        if (phone) {
            localStorage.setItem(USER_PHONE_KEY, phone);
            setPhoneNumber(phone);
        }

        setIsAuthenticated(true);
    }, []);

    // Local part of ending the session — used by both the logout button and
    // the "refresh token rejected" notification coming from apiClient.
    // Tokens are cleared immediately by authService.logout().
    const resetSession = useCallback(() => {
        sessionStorage.removeItem(PHONE_KEY);
        localStorage.removeItem(USER_PHONE_KEY);
        localStorage.removeItem(DISPLAY_NAME_KEY);
        setPhoneNumber(INITIAL_PHONE_PREFIX);
        setIsAuthenticated(false);
    }, []);

    // Logout — callable from anywhere (e.g. the profile page's logout button)
    const logout = useCallback(() => {
        // 1) Reset local state first so the RequireAuth guard redirects
        //    to /auth/phone immediately
        resetSession();

        // 2) Clear tokens and notify the server in the background (best effort)
        authService.logout();
    }, [resetSession]);

    // apiClient clears the tokens when POST /auth/refresh fails (expired or
    // revoked session). Without this handler React would still consider the
    // user authenticated and every guarded page would keep firing 401s.
    useEffect(() => {
        setAuthFailureHandler(resetSession);

        return () => setAuthFailureHandler(null);
    }, [resetSession]);

    return (
        <AuthContext.Provider
            value={{ phoneNumber, setPhoneNumber, isAuthenticated, login, logout }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);