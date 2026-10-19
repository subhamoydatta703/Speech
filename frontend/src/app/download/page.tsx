import { AccountGate } from "@/components/account-gate";
import { DownloadButton } from "@/components/download-button";
export default function DownloadPage() {
  return (
    <AccountGate returnTo="/download">
      <main id="main" className="page-shell">
        <span className="eyebrow">YOUR NEXT STEP</span>
        <h1>Make room for your voice.</h1>
        <p>
          Set up Speech on your computer. Your website session connects your
          account during installation.
        </p>
        <div className="panel download-panel">
          <span className="platform-symbol" aria-hidden="true">
            ⊞
          </span>
          <div>
            <h2>Speech for Windows</h2>
            <p>Windows 11 · x64 target</p>
            <p className="muted">
              Release in development. Downloads become available when the
              installer is published.
            </p>
          </div>
          <DownloadButton />
        </div>
        <h2>A few things before you start.</h2>
        <ol className="setup-list">
          <li>Download the installer using your signed-in account.</li>
          <li>
            Run setup. Match the confirmation code in your browser to connect
            this installation.
          </li>
          <li>
            Let setup download the speech model. Internet is required for this
            step.
          </li>
          <li>Once setup confirms readiness, start dictating locally.</li>
        </ol>
        <p>
          macOS and Linux installers are not available. Terminal installation
          commands will be added once a verified release is ready.
        </p>
      </main>
    </AccountGate>
  );
}
