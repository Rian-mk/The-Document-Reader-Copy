import { useEffect } from "react";
import { useNavigate, useLocation, useMatches } from "react-router-dom";
import { App } from "@capacitor/app";

/**
 * Android hardware back button — mirrors the header back arrow:
 * 1) On root pages (Home / Login) exit the app
 * 2) Navigate to the route's logical parent (handle.backTo) when defined
 * 3) Otherwise fall back to history back, or /home when there is no
 *    in-app history (e.g. the page was opened directly)
 */
export function useNativeBackButton() {
    const navigate = useNavigate();
    const location = useLocation();
    const matches = useMatches();

    useEffect(() => {
        const backListener = App.addListener("backButton", () => {
            // 1. Root pages — exit the app
            if (location.pathname === "/home" || location.pathname === "/auth/phone") {
                App.exitApp();
                return;
            }

            // 2. Prefer the route's logical parent (same as the header arrow)
            const currentMatch = matches.findLast((match) => match.handle?.backTo);
            const backTo = currentMatch?.handle?.backTo;
            if (backTo) {
                navigate(backTo, { replace: true });
                return;
            }

            // 3. Fallback: history back, or /home when there is no app history
            if (window.history.state && window.history.state.idx > 0) {
                navigate(-1);
            } else {
                navigate("/home", { replace: true });
            }
        });

        return () => {
            backListener.then((handler) => handler.remove());
        };
    }, [location.pathname, matches, navigate]);
}
