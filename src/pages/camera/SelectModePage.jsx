import React, { useLayoutEffect, useState } from 'react'
import { MdOutlinePhotoCamera, MdOutlineTouchApp } from 'react-icons/md'
import PrimaryButton from '../../components/common/PrimaryButton'
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useNavigate } from 'react-router-dom'
import { CAMERA_TYPES } from '../../constants/camera'
import { Field } from '@/components/ui/field'
import { DEFAULT_MODE_KEY } from '@/constants/settings'
import { unlockVoiceGuideAudio } from '@/utils/camera/voiceGuide'

export default function SelectModePage() {
    const navigate = useNavigate();

    const [rememberMe, setRememberMe] = useState(false)
    const [isInitialized, setIsInitialized] = useState(false);

    useLayoutEffect(() => {
        const defaultMode = localStorage.getItem(DEFAULT_MODE_KEY) || 'ask';

        if (defaultMode !== "ask") {
            changeToCameraRoute(CAMERA_TYPES[defaultMode]);
        } else {
            setIsInitialized(true);
        }

    }, []);

    const changeToCameraRoute = (type) => {
        unlockVoiceGuideAudio()

        if (rememberMe) {
            localStorage.setItem(DEFAULT_MODE_KEY, type)
        }
        navigate("/camera", {
            state: {
                type: type
            }
        })
    }

    return (
        <div className="w-full h-full flex flex-col flex-1">
            <div className="mb-5 flex w-full flex-col gap-3">
                <h2 className="text-2xl font-bold">
                    حالت تصویربرداری را انتخاب کنید
                </h2>
            </div>
            <div className="flex w-full flex-1 flex-col gap-4">
                <PrimaryButton
                    type="emerald"
                    icon={<MdOutlinePhotoCamera size={"16rem"} />}
                    title="خودکار"
                    subtitle="کاربر را راهنمایی می‌کند و خودش عکس می‌گیرد"
                    className={"flex-1"}
                    onClick={() => { changeToCameraRoute(CAMERA_TYPES.automatic) }} />
                <PrimaryButton
                    type="indigo"
                    icon={<MdOutlineTouchApp size={"16rem"} />}
                    title="دستی"
                    subtitle="خودتان کادر را تنظیم کنید و عکس بگیرید"
                    className={"flex-1"}
                    onClick={() => { changeToCameraRoute(CAMERA_TYPES.manual) }} />
                <Field orientation="horizontal">
                    <Checkbox checked={rememberMe} onCheckedChange={setRememberMe} />
                    <Label className="text-base">انتخاب من را به خاطر بسپار</Label>
                </Field>
            </div>
        </div>
    )
}