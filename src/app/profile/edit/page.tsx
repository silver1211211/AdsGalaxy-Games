import { AppShell } from "@/components/layout/app-shell";
import { ProfilePageShell } from "@/components/profile/profile-page-shell";
import { EditProfileForm } from "@/components/profile/edit-profile-form";
export default function Page(){return <AppShell><ProfilePageShell title="Edit Profile" description="Your Telegram identity is verified and read-only. These optional details apply only inside this Mini App."><EditProfileForm/></ProfilePageShell></AppShell>}
