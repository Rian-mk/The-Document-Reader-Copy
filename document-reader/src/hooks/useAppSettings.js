import { useEffect, useState } from 'react';
import { readCameraSettings, subscribeSettings } from '@/utils/settings';

export function useAppSettings() {
    const [settings, setSettings] = useState(readCameraSettings);

    useEffect(() => {
        const apply = () =>
            setSettings((prev) => {
                const next = readCameraSettings();
                const same =
                    prev.voiceFeedback === next.voiceFeedback &&
                    prev.autoFlashlight === next.autoFlashlight;
                return same ? prev : next;
            });
        apply();

        return subscribeSettings(apply);
    }, []);

    return settings;
}

export default useAppSettings;
