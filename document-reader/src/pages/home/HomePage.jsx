import React from 'react'
import PrimaryButton from '../../components/common/PrimaryButton'
import UserCard from '../../components/common/UserCard'
import { MdRecordVoiceOver } from 'react-icons/md'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useProfile } from '../../contexts/ProfileContext'

export default function HomePage() {

    const navigate = useNavigate()
    const { phoneNumber } = useAuth()
    // Name comes from ProfileContext (synced via GET /user/me);
    // updates immediately after profile edits
    const { displayName } = useProfile()

    return (
        <div className="flex h-full w-full flex-1 flex-col justify-between gap-3">
            <div className="flex flex-col gap-3">
                <PrimaryButton isSquare type="amber" icon={<MdRecordVoiceOver size={"20rem"} />} title="خواندن تصویر" subtitle="خوانش متن‌های داخل تصویر با صدای بلند" onClick={() => {navigate("/camera/select-mode")}} />
                <PrimaryButton type="cyan" title="تنظیمات" onClick={() => {navigate("/settings")}} />
            </div>
            <UserCard name={displayName} phone={phoneNumber} onClick={() => {navigate("/profile")}} />
        </div>
    )
}
