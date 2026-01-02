"use client";

import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DashboardHeaderProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm flex items-center px-6 gap-4">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search endpoints..."
            className="pl-9 bg-secondary/50"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {/* Notification dot */}
          {/* <span className="absolute top-2 right-2 h-2 w-2 bg-destructive rounded-full" /> */}
        </Button>

        {/* User avatar for mobile */}
        <div className="md:hidden">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
            {user.name?.charAt(0).toUpperCase() || "U"}
          </div>
        </div>
      </div>
    </header>
  );
}
