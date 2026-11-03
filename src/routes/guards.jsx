import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * Guard for private routes: an unauthenticated visitor of any protected
 * path (home, profile, camera, ...) is redirected to /auth/phone.
 */
export function RequireAuth() {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/auth/phone" replace />;
    }
    return <Outlet />;
}

/**
 * Reverse guard: authenticated users skip the auth pages and land on /home.
 */
export function RedirectIfAuthenticated() {
    const { isAuthenticated } = useAuth();

    if (isAuthenticated) {
        return <Navigate to="/home" replace />;
    }
    return <Outlet />;
}

/**
 * Smart destination for "/" and unknown ("*") routes:
 * authenticated → /home, otherwise → /auth/phone.
 */
export function EntryRedirect() {
    const { isAuthenticated } = useAuth();

    return <Navigate to={isAuthenticated ? "/home" : "/auth/phone"} replace />;
}
