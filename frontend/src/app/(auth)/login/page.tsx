import { LoginCard } from "@/components/auth/LoginCard";

export const metadata = { title: "Login" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { error } = await props.searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <LoginCard errorCode={typeof error === "string" ? error : undefined} />
    </main>
  );
}
