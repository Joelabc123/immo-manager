import { AppShell } from "@/components/app-shell";
import { UserProvider } from "@/components/user-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <AppShell>{children}</AppShell>
    </UserProvider>
  );
}
