import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { isAuthConfigured } from "@/lib/auth-config";

export async function Header() {
  const signedIn = isAuthConfigured() && Boolean((await auth()).userId);
  return (
    <header className="header">
      <div className="brand-lockup">
        <Link className="brand" href="/" aria-label="speech home">
          {/* Share the favicon asset so the browser tab and navbar stay consistent. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-icon" src="/icon.svg" width={34} height={34} alt="" />{" "}
          speech
        </Link>
        <a
          className="brand-parent-badge"
          href="https://agexai.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          title="Visit AgEX"
        >
          by <strong>AgEX</strong> <span className="badge-arrow">↗</span>
        </a>
      </div>
      <nav aria-label="Main navigation">
        <Link href="/#how-it-works">How it works</Link>
        <Link href="/#privacy">Privacy</Link>
        <Link href="/help">Help</Link>
      </nav>
      <div className="header-actions">
        {signedIn ? (
          <>
            <Link href="/account">Account</Link>
            <UserButton />
          </>
        ) : (
          <Link href="/sign-in">Sign in</Link>
        )}
        <Link className="button small" href="/download">
          Get speech <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </header>
  );
}
