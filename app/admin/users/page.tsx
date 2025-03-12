import { adminGuard, getUsers } from "@/lib/actions/admin"
import { UserManagement } from "@/components/admin/user-management"
import { Separator } from "@/components/ui/separator"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

export default async function AdminUsersPage() {
  // Check if the user is an admin
  try {
    await adminGuard()
  } catch (error) {
    return redirect("/")
  }

  // Get all users
  const users = await getUsers()

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" asChild className="mr-2">
            <Link href="/admin">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Admin
            </Link>
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-2">Manage user accounts and admin privileges</p>
        </div>

        <Separator />

        <UserManagement initialUsers={users} />
      </div>
    </div>
  )
}

