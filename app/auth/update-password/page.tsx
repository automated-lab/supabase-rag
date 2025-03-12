import { UpdatePasswordForm } from "@/components/auth/update-password-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Update Password - KnowledgeBase",
  description: "Update your KnowledgeBase password",
}

export default function UpdatePasswordPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Update Password</h1>
          <p className="text-sm text-muted-foreground">Enter your new password below</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Update Password</CardTitle>
            <CardDescription>Choose a new secure password for your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <UpdatePasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

