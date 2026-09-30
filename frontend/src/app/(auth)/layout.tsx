import { AuthGate } from "@/components/auth/AuthGate";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <AuthGate mode="guest">{children}</AuthGate>;
}
