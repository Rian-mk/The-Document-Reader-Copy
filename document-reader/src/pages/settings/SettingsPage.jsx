import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdOutlineHelp, MdOutlineBugReport } from 'react-icons/md';
import { toast } from 'sonner';
import MenuListItem from '../../components/common/MenuListItem';
import SettingsGroup from '@/components/settings/SettingsGroup';
import SettingsItem from '@/components/settings/SettingsItem';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
    READING_SPEED_KEY,
    SPEAKER_KEY,
    DEFAULT_MODE_KEY,
    AUTO_FLASHLIGHT_KEY,
    VOICE_FEEDBACK_KEY,
    TTS_SPEAKERS,
    DEFAULT_SPEAKER_VALUE,
} from '../../constants/settings'
import { writeSetting } from '@/utils/settings'
// Voice settings are part of every OCR -> TTS request; apiClient keeps them
// in localStorage under one key (tts_settings) and reads them back there
import { ttsSettingsService } from '../../services/apiClient'

export default function SettingsPage() {
    const navigate = useNavigate();

    const DEFAULT_MODE = localStorage.getItem(DEFAULT_MODE_KEY) || 'ask';
    const SPEAKER = localStorage.getItem(SPEAKER_KEY) || DEFAULT_SPEAKER_VALUE;
    const READING_SPEED = Number.parseFloat(localStorage.getItem(READING_SPEED_KEY)) || '1.0';
    const AUTO_FLASHLIGHT = (() => {
        const val = localStorage.getItem(AUTO_FLASHLIGHT_KEY);
        return val === null ? true : val === 'true';
    })();
    const VOICE_FEEDBACK = (() => {
        const val = localStorage.getItem(VOICE_FEEDBACK_KEY);
        return val === null ? true : val === 'true';
    })();

    // Persist settings in localStorage
    const [readingSpeed, setReadingSpeed] = useState(() => READING_SPEED);
    const [speaker, setSpeaker] = useState(() => SPEAKER);
    const [defaultMode, setDefaultMode] = useState(() => DEFAULT_MODE);
    const [autoFlashlight, setAutoFlashlight] = useState(() => AUTO_FLASHLIGHT);
    const [voiceFeedback, setVoiceFeedback] = useState(() => VOICE_FEEDBACK);

    // apiClient reads gender + speakerId from localStorage.tts_settings on every
    // request, and that pair is only written when the user touches this Select. A
    // device that picked a speaker before this list was corrected therefore keeps
    // sending the old pairing (e.g. gender "male" for speaker-2), so re-derive it
    // from TTS_SPEAKERS on mount and on every change.
    useEffect(() => {
        const stored = ttsSettingsService.getSettings();
        const selected = TTS_SPEAKERS.find((item) => item.value === speaker) ?? TTS_SPEAKERS[0];

        if (stored.gender === selected.gender && stored.speakerId === selected.speakerId) {
            return;
        }

        ttsSettingsService.updateSettings({
            gender: selected.gender,
            speakerId: selected.speakerId,
        });
    }, [speaker]);

    const readingSpeeds = [
        { label: "0.5x", value: '0.5' },
        { label: "0.75x", value: '0.75' },
        { label: "1x", value: '1.0' },
        { label: "1.25x", value: '1.25' },
        { label: "1.5x", value: '1.5' },
        { label: "1.75x", value: '1.75' },
        { label: "2x", value: '2.0' },
    ]

    const CameraModes = [
        { label: "هر بار پرسیده شود", value: "ask" },
        { label: "خودکار", value: "automatic" },
        { label: "دستی", value: "manual" },
    ]

    const updateSetting = (key, value, setter) => {
        setter(value);
        writeSetting(key, value);
        toast.success("تنظیمات به‌روزرسانی شد", {
            duration: 1500,
        });
    };

    // Reading speed stays device-local: the player applies it as playbackRate,
    // so sending it as the TTS "speed" as well would double it.
    const updateSpeaker = (value) => {
        const selectedSpeaker = TTS_SPEAKERS.find((item) => item.value === value);

        updateSetting(SPEAKER_KEY, value, setSpeaker);

        if (selectedSpeaker) {
            ttsSettingsService.updateSettings({
                gender: selectedSpeaker.gender,
                speakerId: selectedSpeaker.speakerId,
            });
        }
    };

    return (
        <div className="w-full">
            <form className="dir-rtl mx-auto flex w-full flex-col gap-5" onSubmit={(e) => e.preventDefault()}>

                {/* section: Reading Settings */}
                <SettingsGroup title="تنظیمات خوانش" >
                    <SettingsItem title="سرعت پیش‌فرض خوانش" subtitle="متن‌ها به طور پیش‌فرض با این سرعت خوانده می‌شوند">
                        <Select value={readingSpeed} onValueChange={(value) => updateSetting(READING_SPEED_KEY, value, setReadingSpeed)}>
                            <SelectTrigger className="w-full" dir="rtl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent dir="rtl" data-lang="arabic">
                                {readingSpeeds.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </SettingsItem>
                    <SettingsItem title="گویندۀ متن‌ها" subtitle="متن‌ها با این صدای گوینده خوانده می‌شوند">
                        <Select value={speaker} onValueChange={updateSpeaker}>
                            <SelectTrigger className="w-full" dir="rtl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent dir="rtl" data-lang="arabic">
                                {TTS_SPEAKERS.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </SettingsItem>
                </SettingsGroup>

                {/* section: Imaging Settings */}
                <SettingsGroup title="تنظیمات تصویربرداری">
                    <SettingsItem title="حالت تصویربرداری" subtitle="در صورت انتخاب حالت به صورت مستقیم وارد محیط تصویربرداری می‌شود">
                        <Select value={defaultMode} onValueChange={(value) => updateSetting(DEFAULT_MODE_KEY, value, setDefaultMode)}>
                            <SelectTrigger className="w-full" dir="rtl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent dir="rtl" data-lang="arabic">
                                {CameraModes.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </SettingsItem>
                    <SettingsItem title="چراغ‌قوۀ خودکار" subtitle="به محض تشخیص محیط با نور کم، چراغ‌قوه (فلش) خودکار روشن می‌شود" isCol={false}>
                        <Switch checked={autoFlashlight} onCheckedChange={(value) => updateSetting(AUTO_FLASHLIGHT_KEY, value, setAutoFlashlight)} />
                    </SettingsItem>
                </SettingsGroup>

                {/* section: Accessibility */}
                <SettingsGroup title="دسترس‌پذیری">
                    <SettingsItem title="بازخوردهای صوتی" subtitle="در هر بخش، راهنمای صوتی برای کاربر پخش می‌شود" isCol={false}>
                        <Switch checked={voiceFeedback} onCheckedChange={(value) => updateSetting(VOICE_FEEDBACK_KEY, value, setVoiceFeedback)} />
                    </SettingsItem>
                </SettingsGroup>

                {/* Buttons list */}
                <div className="mt-2 flex w-full flex-col gap-3">
                    <MenuListItem
                        icon={<MdOutlineHelp size={"1.5rem"} />}
                        label="راهنما"
                        variant="info"
                        onClick={() => toast.info("راهنمای صوتی به‌زودی فعال خواهد شد.")}
                    />

                    <MenuListItem
                        icon={<MdOutlineBugReport size={"1.5rem"} />}
                        label="گزارش خطا یا پیشنهاد"
                        variant="danger"
                        onClick={() => navigate("/settings/report-bug")}
                    />

                    <p className="text-center text-sm text-gray-400 mt-2">
                        دستیار تبدیل عکس به گفتار خوانا (ویرایش 1.0.0)
                    </p>
                </div>
            </form>
        </div>
    );
}