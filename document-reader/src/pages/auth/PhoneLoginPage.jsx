import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import NumericKeypad from "../../components/common/NumericKeypad";
import DigitsGroupInput from "../../components/common/DigitsGroupInput";
import ActionButton from "../../components/common/ActionButton/ActionButton";
import { useAuth } from "../../contexts/AuthContext";
import { PHONE_NUMBER_LENGTH, MIN_PHONE_LENGTH } from "../../constants/auth";
// All API calls go through apiClient (not the legacy parallel files)
import { authService, getApiErrorMessage } from "../../services/apiClient";

export default function PhoneLoginPage() {
    const navigate = useNavigate();
    const { phoneNumber, setPhoneNumber } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const changeValueHandler = (nextDigit) => {
        setPhoneNumber((prev) =>
            prev.length < PHONE_NUMBER_LENGTH ? prev + nextDigit : prev
        );
    };

    const removeDigitHandler = () => {
        if (phoneNumber.length > MIN_PHONE_LENGTH) {
            setPhoneNumber((prev) => prev.slice(0, -1));
        }
    };

    const handleSendCode = async () => {
        if (isLoading || phoneNumber.length !== PHONE_NUMBER_LENGTH) return;
        setIsLoading(true);
        try {
            // Backend call: POST /auth/send-code
            await authService.sendCode(phoneNumber);
            // Pass the phone number via router state; OtpVerifyPage reads it
            navigate("/auth/otp", { state: { phone: phoneNumber } });
            // No setState after navigate — the page is transitioning
        } catch (err) {
            toast.error(getApiErrorMessage(err));
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 w-full h-full flex flex-col justify-between">
            <div className="w-full">
                <div className="flex w-full flex-col gap-5">
                    <h2 className="text-2xl font-bold">
                        شماره موبایل خود را وارد کنید
                    </h2>
                    <div>
                        <DigitsGroupInput
                            digits={PHONE_NUMBER_LENGTH}
                            value={phoneNumber}
                            className="px-1"
                        />
                        <NumericKeypad
                            onPushKey={changeValueHandler}
                            onRemoveDigit={removeDigitHandler}
                            isActive={!isLoading}
                        />
                    </div>
                </div>
            </div>
            <ActionButton
                isActive={phoneNumber.length === PHONE_NUMBER_LENGTH}
                isLoading={isLoading}
                type="success"
                onClick={handleSendCode}
            >
                تایید و ادامه
            </ActionButton>
        </div>
    );
}
