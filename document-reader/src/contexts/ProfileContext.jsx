import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { userService } from "../services/apiClient";
import { useAuth } from "./AuthContext";
import { DISPLAY_NAME_KEY, DEFAULT_DISPLAY_NAME } from "../constants/home";
import { USER_PHONE_KEY } from "../constants/auth";

const ProfileContext = createContext(null);

/**
 * Holds the current user's profile data (currently the full name only;
 * the phone number lives in AuthContext).
 *
 * Stale-While-Revalidate strategy:
 * 1) Initial state comes from the localStorage cache → instant render
 *    and offline support (important for the Capacitor/Android build)
 * 2) While authenticated, GET /user/me runs in the background and
 *    refreshes both state and cache
 * 3) Changes are saved through updateProfile (PUT /user/me)
 */
export function ProfileProvider({ children }) {
    const { isAuthenticated, setPhoneNumber } = useAuth();

    // Raw name from cache/server — empty means not set yet. The display
    // default is NOT stored here, so EditProfilePage can show an empty
    // field for users without a name.
    const [fullName, setFullName] = useState(
        () => localStorage.getItem(DISPLAY_NAME_KEY) || ""
    );
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        // Logged out — reset profile state
        // (AuthContext.logout clears the localStorage cache)
        if (!isAuthenticated) {
            setFullName("");
            return;
        }

        let cancelled = false;

        // 1) Show the local cache immediately — it may have just been
        //    seeded from the verify-code response during login
        const cached = localStorage.getItem(DISPLAY_NAME_KEY);
        if (cached) setFullName(cached);

        // 2) Refresh from the server (source of truth)
        setIsSyncing(true);
        userService
            .getMe()
            .then((user) => {
                if (cancelled || !user) return;

                const name =
                    typeof user.fullName === "string" ? user.fullName.trim() : "";

                if (name) {
                    localStorage.setItem(DISPLAY_NAME_KEY, name);
                } else {
                    // No name stored on the server — clear the local cache too
                    localStorage.removeItem(DISPLAY_NAME_KEY);
                }
                setFullName(name);

                // /user/me is also the source of truth for the phone number.
                // Setting the same value is a no-op for React.
                const number =
                    typeof user.number === "string" ? user.number.trim() : "";
                if (number) {
                    localStorage.setItem(USER_PHONE_KEY, number);
                    setPhoneNumber(number);
                }
            })
            .catch(() => {
                // Server unreachable — keep the cached value (offline mode)
            })
            .finally(() => {
                if (!cancelled) setIsSyncing(false);
            });

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, setPhoneNumber]);

    // Save profile changes via PUT /user/me.
    // Errors are intentionally left to the caller (see getApiErrorMessage).
    const updateProfile = useCallback(async ({ fullName: nextName } = {}) => {
        const data = await userService.updateMe({ fullName: nextName });

        // The response is a UserViewModel — prefer the server-provided name
        const name = (
            typeof data?.fullName === "string" ? data.fullName : String(nextName ?? "")
        ).trim();

        if (name) {
            localStorage.setItem(DISPLAY_NAME_KEY, name);
        } else {
            localStorage.removeItem(DISPLAY_NAME_KEY);
        }
        setFullName(name);

        return data;
    }, []);

    // Display name with fallback, consumed by HomePage/ProfilePage
    const displayName = fullName || DEFAULT_DISPLAY_NAME;

    return (
        <ProfileContext.Provider
            value={{ fullName, displayName, isSyncing, updateProfile }}
        >
            {children}
        </ProfileContext.Provider>
    );
}

export const useProfile = () => useContext(ProfileContext);
