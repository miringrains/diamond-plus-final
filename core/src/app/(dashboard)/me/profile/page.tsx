import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import ProfileClient from "./profile-client"

export default async function ProfilePage() {
  const session = await auth()
  
  if (!session || !session.user) {
    redirect("/login")
  }

  return <ProfileClient initialUser={session.user} />
}