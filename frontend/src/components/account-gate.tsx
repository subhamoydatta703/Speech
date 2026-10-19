import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isAuthConfigured } from "@/lib/auth-config";
import Link from "next/link";

export async function AccountGate({
  children,
  returnTo,
}: {
  children: React.ReactNode;
  returnTo: string;
}) {
  if (!isAuthConfigured())
    return (
      <main id="main" className="page-shell">
        <span className="eyebrow">ACCOUNT SETUP</span>
        <h1>Sign-in is coming online.</h1>
        <p>
          Sign-in and downloads are temporarily unavailable. You can still explore
          how Speech works and read the setup guide.
        </p>
        <Link className="button" href="/help">Read the setup guide</Link>
      </main>
    );
  if (!(await auth()).userId)
    redirect(`/sign-in?redirect_url=${encodeURIComponent(returnTo)}`);
  return children;
}
