"use client";
import { useState } from "react";
import { errorMessage } from "@/lib/contracts";
export function DownloadButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function download() {
    setBusy(true);
    setMessage("Checking the Windows release…");
    try {
      const response = await fetch("/api/download", {
        method: "HEAD",
        cache: "no-store",
      });
      if (!response.ok) {
        // HEAD checks availability without downloading the installer twice.
        setMessage(
          response.status === 401
            ? "Your session expired. Please sign in again."
            : "The installer is not available right now. Please try again later.",
        );
        return;
      }
      window.location.assign("/api/download");
      setMessage("Download requested. Check your browser’s downloads.");
    } catch (error) {
      setMessage(errorMessage(error, "Could not connect. Please try again."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button className="button" onClick={download} disabled={busy}>
        {busy ? "Checking…" : "Download installer ↓"}
      </button>
      <p className="download-status" role="status">
        {message}
      </p>
    </div>
  );
}
