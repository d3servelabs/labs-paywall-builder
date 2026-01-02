import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  // Check if email is verified - commented for development
  // if (!session.user.emailVerified) {
  //   redirect("/verify-email");
  // }

  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    slug: (session.user as Record<string, unknown>).slug as string | undefined,
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <DashboardSidebar user={user} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader user={user} />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
