"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { errorMessage } from "@/lib/contracts";
export function InstallationConfirmation({
  id,
  code,
  expiresAt,
}: {
  id: string;
  code: string;
  expiresAt: number;
}) {
  const { user } = useUser();
  const [matched, setMatched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [approved, setApproved] = useState(false);
  const [message, setMessage] = useState("");
  async function approve() {
    if (!matched || busy) return;
    if (Date.now() >= expiresAt) {
      setMessage("This request expired. Restart setup to get a new code.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/installations/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationCode: code }),
      });
      const body = await response.json();
      if (!response.ok) {
        setMessage(
          errorMessage(
            body,
            "Could not confirm installation. Please try again.",
          ),
        );
        return;
      }
      setApproved(true);
    } catch {
      setMessage("Could not connect. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  if (approved)
    return (
      <div className="panel" role="status">
        <h2>Installation approved.</h2>
        <p>
          Return to setup on your computer. It will finish connecting your
          account and downloading the model.
        </p>
        <p>
          Wait for setup to confirm that speech is ready before dictating
          offline.
        </p>
      </div>
    );
  return (
    <div className="panel">
      <p>
        Connecting as{" "}
        <strong>
          {user?.primaryEmailAddress?.emailAddress ?? "your signed-in account"}
        </strong>
        .
      </p>
      <p>Match this code with the one shown in your installer.</p>
      <div className="confirmation-code">{code}</div>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={matched}
          onChange={(event) => setMatched(event.target.checked)}
        />{" "}
        I started this installation and the codes match.
      </label>
      <button className="button" onClick={approve} disabled={!matched || busy}>
        {busy ? "Confirming…" : "Continue installation ↗"}
      </button>
      <p role="status">{message}</p>
      <p className="muted">
        If you didn’t start setup, close this page without approving.
      </p>
    </div>
  );
}
