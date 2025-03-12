import { redirect } from "next/navigation";
import { adminGuard } from "@/lib/actions/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Settings, Users } from "lucide-react";

export default async function AdminPage() {
  // Check if the user is an admin
  try {
    await adminGuard();
  } catch (error) {
    return redirect("/");
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage system settings and users
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                RAG System Settings
              </CardTitle>
              <CardDescription>
                Adjust how the system processes documents, generates embeddings,
                and creates responses.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
              <div className="flex justify-start mt-4">
                <Button asChild>
                  <Link href="/admin/settings">Manage Settings</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                View all users and grant or revoke administrator access to the
                system.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
              <div className="flex justify-start mt-4">
                <Button asChild>
                  <Link href="/admin/users">Manage Users</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
