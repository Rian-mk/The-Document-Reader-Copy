import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import NumericKeypad from "../../components/common/NumericKeypad";
import DigitsGroupInput from "../../components/common/DigitsGroupInput";
import ActionButton from "../../components/common/ActionButton/ActionButton";
import { PHONE_NUMBER_LENGTH, OTP_CODE_LENGTH, PHONE_KEY } from "../../constants/auth";
// All API calls go through apiClient
import { authService, getApiErrorMessage, getRetryAfterSeconds } from "../../services/apiClient";
import { useAuth } from "../../contexts/AuthContext";
import { DISPLAY_NAME_KEY } from "../../constants/home";

const RESEND_SECONDS = 60;

// MM:SS countdown format, e.g. "01:59" (matches the original HTML prototype)
const formatResendTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export default function OtpVerifyPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    // Read the phone number exactly once on mount and freeze it in a ref.
    // After navigating away (while MainLayout's exit animation keeps changing
    // the location), the value stays stable so the guard below doesn't misfire.
    const phoneRef = useRef(
        location.state?.phone ?? sessionStorage.getItem(PHONE_KEY) ?? ""
    );
    const phone = phoneRef.current;

    // Persist it so a reload or direct visit to /auth/otp keeps the number

    
    /*اینجا پیشنهاد کالد برای بهتر کردن این این سمت اینه که از useEffect استفاده کنیم*/

    //useEffect(() => { if (phone) sessionStorage.setItem(...) }, [phone])

    if (phone) sessionStorage.setItem(PHONE_KEY, phone);
    const [value, setValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [resendIn, setResendIn] = useState(RESEND_SECONDS);

    // Guard: run once on mount only (empty deps)
    useEffect(() => {
        if (phone.length < PHONE_NUMBER_LENGTH) {
            navigate("/auth/phone", { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // "Resend" button countdown
    useEffect(() => {
        if (resendIn <= 0) return;
        const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [resendIn]);

    const changeValueHandler = (nextDigit) => {
        setValue((prev) =>
            prev.length < OTP_CODE_LENGTH ? prev + nextDigit : prev
        );
    };

    const removeDigitHandler = () => {
        setValue((prev) => prev.slice(0, -1));
    };

    const handleResend = async () => {
        if (resendIn > 0 || isLoading) return;
        setIsLoading(true);
        try {
            await authService.sendCode(phone);
            toast.success("کد جدید ارسال شد");
            setValue("");
            setResendIn(RESEND_SECONDS);
         } catch (err) {
            // 429 + retryAfterSeconds: the resend interval has not passed yet,
            // so resume the countdown instead of leaving the button active
            const retryAfter = getRetryAfterSeconds(err);
            if (retryAfter !== null) {
                setResendIn(retryAfter);
            }
             toast.error(getApiErrorMessage(err, "ارسال مجدد کد ناموفق بود"));
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async () => {
        if (isLoading || value.length !== OTP_CODE_LENGTH) return;
        setIsLoading(true);
        try {
            // 1) Verify the code with the backend; tokens are stored
            //    in localStorage automatically inside this call
            const data = await authService.verifyCode({ number: phone, code: value });

            // Seed the display-name cache from the login response so the
            // real name shows right after login; ProfileContext re-syncs
            // it via GET /user/me afterwards
            if (data?.user?.fullName) {
                localStorage.setItem(DISPLAY_NAME_KEY, data.user.fullName);
            }

            // 2) Notify the auth context so the guards update;
            //    the verified phone number is persisted alongside the tokens
            login(data?.user?.number ?? phone);

            // 3) Go to /home — replace keeps the back button out of the OTP page
            navigate("/home", { replace: true });
            // No setState past this point — the page is being replaced
        } catch (err) {
            toast.error(getApiErrorMessage(err, "کد تأیید نامعتبر است"));
            setValue("");
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 w-full h-full flex flex-col justify-between">
            <div className="w-full">
                <div className="flex w-full flex-col gap-5">
                    <h2 className="text-2xl font-bold">کد تأیید را وارد کنید</h2>
                    <div className="text-gray-400">
                        کد تأیید برای {phone} پیامک شد
                    </div>
                    <div>
                        <DigitsGroupInput
                            digits={OTP_CODE_LENGTH}
                            value={value}
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
            <div className="flex flex-col gap-3">
                {resendIn > 0 ? (
                    // Waiting state — plain countdown text
                    // (the old prototype's #waitForResendCodeBtn)
                    <div className="flex justify-center py-3 text-sm text-gray-400">
                        {formatResendTime(resendIn)} مانده تا ارسال دوبارۀ کد
                    </div>
                ) : (
                    // Ready state — the actual resend button
                    // (the old prototype's #resendCodeBtn)
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={isLoading}
                        className="flex w-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 py-3 text-sm font-bold text-slate-100 shadow-lg transition hover:bg-slate-800/80 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        دریافت دوبارۀ کد از طریق پیامک
                    </button>
                )}
                <ActionButton
                    isActive={value.length === OTP_CODE_LENGTH}
                    isLoading={isLoading}
                    type="success"
                    onClick={handleVerify}
                >
                    تأیید و ورود
                </ActionButton>
            </div>
        </div>
    );
}
