import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ActionButton from '../../components/common/ActionButton/ActionButton';
import SettingsItem from '@/components/settings/SettingsItem';
import { Input } from '@/components/ui/input';
import { getApiErrorMessage } from '../../services/apiClient';
import { useProfile } from '../../contexts/ProfileContext'

export default function EditProfilePage() {
    const navigate = useNavigate();
    const { fullName, updateProfile } = useProfile();

    const [name, setName] = useState(() => fullName);
    const [isLoading, setIsLoading] = useState(false);

    const isFormValid = name.trim().length > 0;

    const handleSave = async () => {
        if (isLoading || !isFormValid) {
            if (!isFormValid) {
                toast.error("لطفاً تمامی فیلدهای الزامی را پر کنید");
            }
            return;
        }

        setIsLoading(true);
        try {
            await updateProfile({ fullName: name.trim() });

            toast.success("اطلاعات حساب کاربری با موفقیت به‌روزرسانی شد", {
                duration: 2000,
            });
            navigate("/profile", { replace: true });
        } catch (err) {
            toast.error(getApiErrorMessage(err, "به‌روزرسانی پروفایل ناموفق بود"));
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full flex flex-col h-full flex-1 justify-between pb-4">
            <div className="flex flex-col gap-4">
                <SettingsItem title="نام و نام خانوادگی">
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        dir="rtl"
                        placeholder="نام و نام خانوادگی خود را وارد کنید"
                        maxLength={150}
                        disabled={isLoading}
                    />
                </SettingsItem>
            </div>

            <div className="mt-6 w-full">
                <ActionButton
                    isActive={isFormValid}
                    isLoading={isLoading}
                    type="info"
                    hasArrow={false}
                    onClick={handleSave}
                >
                    تأیید و ذخیره
                </ActionButton>
            </div>
        </div>
    );
}
