import { AuthProvider } from "./contexts/AuthContext"
import { ProfileProvider } from "./contexts/ProfileContext"
import AppRoutes from "./routes/AppRoutes"
import React, { useState, useEffect } from "react";
import SplashScreen from "@/components/startup/SplashScreen";
import { preloadAiEngine } from "@/utils/camera/aiEngine";
import { NavigationBar } from "@capawesome/capacitor-navigation-bar";

function App() {
    const [isLoading, setIsLoading] = useState(true);
    const [progress, setProgress] = useState(10);
    const [statusText, setStatusText] = useState("در حال راه‌اندازی اولیه...");


    useEffect(() => {
        (async () => {
            try {
                await NavigationBar.setColor({ color: "#020618" });
            } catch (err) {
                console.warn(err)
            }
        })()
        preloadAiEngine((text, percent) => {
            setStatusText(text);
            setProgress(percent);

            if (percent >= 100) {
                setTimeout(() => setIsLoading(false), 400);
            }
        });
    }, []);

    if (isLoading) {
        return <SplashScreen progress={progress} statusText={statusText} />;
    }

    return (
        <AuthProvider>
            <ProfileProvider>
                <AppRoutes />
            </ProfileProvider>
        </AuthProvider>
    )
}

export default App
