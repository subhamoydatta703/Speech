import { AccountGate } from "@/components/account-gate";
import { backendRequest } from "@/lib/server/backend";
import { errorMessage, isInstallationId } from "@/lib/contracts";
import { InstallationConfirmation } from "@/components/installation-confirmation";
import Link from "next/link";

async function Installation({ id }: { id: string }) {
  const response = await backendRequest(`/v1/installations/${id}`);
  const body = await response.json().catch(() => null);
  return (
    <main id="main" className="page-shell narrow">
      <span className="eyebrow">CONNECT YOUR INSTALLATION</span>
      <h1>One last check.</h1>
      {response.ok && typeof body?.confirmationCode === "string" ? (
        <InstallationConfirmation
          id={id}
          code={body.confirmationCode}
          expiresAt={body.expiresAt}
        />
      ) : (
        <div className="panel">
          <p role="alert">
            {errorMessage(body, "This installation could not be loaded.")}
          </p>
          <p>
            Restart setup on your computer to get a new confirmation request.
          </p>
          <Link className="button" href="/help">Get setup help</Link>
        </div>
      )}
    </main>
  );
}
export default async function CompletePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  if (!isInstallationId(id))
    return (
      <main id="main" className="page-shell">
        <h1>Open this page from setup.</h1>
        <p>
          The installation link is missing or invalid. Restart setup on your
          computer.
        </p>
        <Link className="button" href="/help">Get setup help</Link>
      </main>
    );
  return (
    <AccountGate returnTo={`/desktop/complete?id=${id}`}>
      <Installation id={id} />
    </AccountGate>
  );
}
