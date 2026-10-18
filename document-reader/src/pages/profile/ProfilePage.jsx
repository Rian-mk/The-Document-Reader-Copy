import React from 'react'
import { useNavigate } from 'react-router-dom'
import { MdOutlineEditNote, MdOutlineHistory, MdOutlineLogout } from 'react-icons/md'
import UserCard from '../../components/common/UserCard'
import MenuListItem from '../../components/common/MenuListItem'
import { useAuth } from '../../contexts/AuthContext'
import { useProfile } from '../../contexts/ProfileContext'

export default function ProfilePage() {
    const navigate = useNavigate()
    const { phoneNumber, logout } = useAuth()
    // Name comes from ProfileContext (synced with the server);
    // it refreshes here immediately after being edited
    const { displayName } = useProfile()

    // Real logout: clears tokens and cached profile data, notifies the
    // server, and resets auth state. No navigate() needed — as soon as
    // isAuthenticated flips, the RequireAuth guard around this page
    // redirects to /auth/phone.
    const handleLogout = () => {
        logout()
    }

    return (
        <div className="flex w-full flex-1 flex-col gap-4">
            <UserCard name={displayName} phone={phoneNumber} />
            <div className="flex w-full flex-col gap-2">
                <MenuListItem
                    icon={<MdOutlineEditNote size={"1.5rem"} />}
                    label="ویرایش پروفایل"
                    onClick={() => navigate("/profile/edit")} />
                <MenuListItem
                    icon={<MdOutlineHistory size={"1.5rem"} />}
                    label="تاریخچه اسناد اخیر"
                    onClick={() => navigate("/history")} />
                <MenuListItem
                    icon={<MdOutlineLogout size={"1.5rem"} />}
                    label="خروج از حساب کاربری"
                    variant="danger"
                    onClick={handleLogout} />
            </div>
        </div>
    )
}
