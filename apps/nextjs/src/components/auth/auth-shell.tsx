import Link from "next/link";
import { Building2 } from "lucide-react";
import { AuthIllustration } from "./auth-illustration";

interface AuthShellProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthShell({ children, footer }: AuthShellProps) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-2">
      <div className="flex min-h-screen flex-col justify-between p-8 lg:p-12">
        <header>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 font-heading text-lg font-semibold text-foreground"
          >
            <Building2 className="h-6 w-6 text-primary" />
            <span>Immo Manager</span>
          </Link>
        </header>

        <main className="flex w-full max-w-md flex-col">{children}</main>

        <footer className="text-sm text-muted-foreground">{footer}</footer>
      </div>

      <div className="hidden lg:block">
        <AuthIllustration />
      </div>
    </div>
  );
}
