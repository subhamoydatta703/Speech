import { AccountGate } from "@/components/account-gate";
import { backendRequest } from "@/lib/server/backend";
import { errorMessage } from "@/lib/contracts";
import Link from "next/link";

async function Profile() {
  const response = await backendRequest("/v1/me");
  const body = await response.json().catch(() => null);
  return (
    <main id="main" className="page-shell">
      <span className="eyebrow">YOUR SPACE</span>
      <h1>Your account.</h1>
      <p>
        Just the essentials. Your voice and transcripts stay on your computer.
      </p>
      <div className="panel">
        {response.ok && body?.user ? (
          <dl>
            <dt>Email address</dt>
            <dd>{body.user.email}</dd>
            <dt>Account ID</dt>
            <dd>{body.user.id}</dd>
          </dl>
        ) : (
          <p role="alert">
            {errorMessage(
              body,
              "Could not load your account. Please try again.",
            )}
          </p>
        )}
      </div>
      <Link className="button" href="/download">
        Go to downloads ↗
      </Link>
    </main>
  );
}
export default function AccountPage() {
  return (
    <AccountGate returnTo="/account">
      <Profile />
    </AccountGate>
  );
}
