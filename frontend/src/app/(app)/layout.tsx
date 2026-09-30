import { AuthGate } from "@/components/auth/AuthGate";
import { EmailQueryProvider } from "@/hooks/useEmailQuery";
import { MailCountsProvider } from "@/hooks/useMailCounts";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGate mode="protected">
      <MailCountsProvider>
        <EmailQueryProvider>{children}</EmailQueryProvider>
      </MailCountsProvider>
    </AuthGate>
  );
}
