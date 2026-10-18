import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";

import PhoneLoginPage from "../pages/auth/PhoneLoginPage";
import OtpVerifyPage from "../pages/auth/OtpVerifyPage";
import HomePage from "../pages/home/HomePage";
import SelectModePage from "../pages/camera/SelectModePage";
import CameraPage from "../pages/camera/CameraPage";
import PlayerPage from "../pages/player/PlayerPage";
import HistoryPage from "../pages/history/HistoryPage";
import ProfilePage from "../pages/profile/ProfilePage";
import EditProfilePage from "../pages/profile/EditProfilePage";
import SettingsPage from "../pages/settings/SettingsPage";
import ReportBugPage from "../pages/settings/ReportBugPage";

import { RequireAuth, RedirectIfAuthenticated, EntryRedirect } from "./guards";

const router = createBrowserRouter([
    {
        path: "/",
        element: <MainLayout />,
        children: [
            // Each route's handle can define:
            //   title    — header title
            //   showBack — header back arrow visibility
            //   backTo   — logical parent page; the back arrow (and the
            //              Android hardware back button) always navigates
            //              there instead of stepping back in raw history
            // Smart entry: authenticated → /home, otherwise → /auth/phone
            { index: true, element: <EntryRedirect /> },

            // Auth flow — visible only to unauthenticated users
            {
                element: <RedirectIfAuthenticated />,
                children: [
                    {
                        path: "auth",
                        children: [
                            {
                                path: "phone", element: <PhoneLoginPage />, handle: {
                                    title: "ورود به حساب کاربری",
                                    showBack: false
                                },
                            },
                            {
                                path: "otp", element: <OtpVerifyPage />, handle: {
                                    title: "ورود به حساب کاربری",
                                    showBack: true,
                                    backTo: "/auth/phone"
                                }
                            },
                        ],
                    },
                ]
            },

            // Everything below sits behind the auth guard
            {
                element: <RequireAuth />,
                children: [
                    // Primary dashboard / mode selection
                    {
                        path: "home", element: <HomePage />, handle: {
                            title: "خوانا",
                            showBack: false
                        }
                    },

                    // Document capture lifecycle
                    {
                        path: "camera",
                        children: [
                            {
                                path: "select-mode", element: <SelectModePage />, handle: {
                                    title: "انتخاب حالت تصویربرداری",
                                    showBack: true,
                                    backTo: "/home"
                                }
                            },
                            // Single viewfinder instance handling dynamic modes via search params (?mode=auto|manual)
                            {
                                index: true, element: <CameraPage />, handle: {
                                    title: "تصویربرداری", // TODO: Add mode title
                                    showBack: true,
                                    backTo: "/home"
                                }
                            },
                        ],
                    },

                    // Media playback & synchronized TTS reader
                    {
                        path: "player", element: <PlayerPage />, handle: {
                            title: "پخش‌کنندۀ گفتار",
                            showBack: true,
                            backTo: "/home"
                        }
                    },

                    // Previously processed documents (entered from the profile page)
                    {
                        path: "history", element: <HistoryPage />, handle: {
                            title: "تاریخچه اسناد اخیر",
                            showBack: true,
                            backTo: "/profile"
                        }
                    },

                    // User profile management
                    {
                        path: "profile",
                        children: [
                            {
                                index: true, element: <ProfilePage />, handle: {
                                    title: "پروفایل کاربری",
                                    showBack: true,
                                    backTo: "/home"
                                }
                            },
                            {
                                path: "edit", element: <EditProfilePage />, handle: {
                                    title: "ویرایش پروفایل کاربری",
                                    showBack: true,
                                    backTo: "/profile"
                                }
                            },
                        ],
                    },

                    // Application preferences & feedback
                    {
                        path: "settings",
                        children: [
                            {
                                index: true, element: <SettingsPage />, handle: {
                                    title: "تنظیمات",
                                    showBack: true,
                                    backTo: "/home"
                                }
                            },
                            {
                                path: "report-bug", element: <ReportBugPage />, handle: {
                                    title: "گزارش خطا یا پیشنهاد",
                                    showBack: true,
                                    backTo: "/settings"
                                }
                            },
                        ],
                    },
                ]
            },
        ],
    },
    {
        // Catch-all — redirects based on auth state
        path: "*",
        element: <EntryRedirect />,
    },
]);

export default function AppRoutes() {
    return <RouterProvider router={router} />;
}
