import { redirect } from "next/navigation"

export default function HomePage() {
  // Redirect to the actual admin dashboard instead of /admin
  redirect("/admin/content")
}