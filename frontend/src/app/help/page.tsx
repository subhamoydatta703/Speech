export default function HelpPage() {
  return (
    <main id="main" className="page-shell">
      <span className="eyebrow">A HAND GETTING STARTED</span>
      <h1>A smoother start.</h1>
      <p>
        Guidance for the planned Windows release. The desktop installer is still
        in development.
      </p>
      {[
        [
          "Sign-in and installation",
          "Sign in on this website before downloading. Setup opens an installation confirmation page in your browser. Check that the codes match, then continue. Your existing website session is reused.",
        ],
        [
          "Getting ready for offline dictation",
          "Stay online until setup has connected your account, downloaded the model, and confirmed readiness. The website cannot inspect your installed model or microphone.",
        ],
        [
          "Microphone access",
          "In Windows Settings, open Privacy & security → Microphone. Allow microphone access for desktop apps, and check that the correct input device is selected.",
        ],
        [
          "Shortcut conflicts",
          "Choose an available shortcut in the desktop settings once supported. Another app may already use your preferred key combination.",
        ],
        [
          "Text insertion",
          "Some applications may restrict automatic insertion. Use the desktop copy option when available, then paste into your document.",
        ],
        [
          "An expired installation code",
          "Restart setup to generate a fresh code. Requests expire after five minutes. Keep your browser signed in so you can confirm without entering credentials again.",
        ],
        [
          "Model download interrupted",
          "Reconnect to the internet and retry in setup. Offline dictation requires a complete, verified local model.",
        ],
        [
          "Uninstalling",
          "Use Windows Settings → Apps → Installed apps to uninstall the released software. Model cleanup instructions will accompany the installer.",
        ],
      ].map(([title, text]) => (
        <section className="help-item" key={title}>
          <h2>{title}</h2>
          <p>{text}</p>
        </section>
      ))}
    </main>
  );
}
