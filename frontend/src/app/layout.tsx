import type { Metadata } from "next";
import Link from "next/link";
import { ClerkProvider } from "@clerk/nextjs";
import { Header } from "@/components/header";
import { isAuthConfigured } from "@/lib/auth-config";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./globals.css";

// Account controls must reflect the current request, including runtime configuration.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "speech — Give your thoughts a voice",
    template: "%s | speech",
  },
  description:
    "Desktop dictation designed for local, offline speech-to-text. Sign in, set up, and make room for your ideas.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const content = (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      {children}
      <footer>
        <Link className="brand" href="/">
          speech.
        </Link>
        <p>
          Your words. Your computer.
          <span className="product-attribution">
            An{" "}
            <a
              href="https://agexai.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="attribution-link"
              title="Visit AgEX"
            >
              <strong>AgEX</strong> ↗
            </a>{" "}
            product
          </span>
        </p>
        <div>
          <Link href="/help">Help & setup</Link>
          <Link href="/#privacy">Privacy</Link>
          <Link href="/account">Account</Link>
          <a
            href="https://agexai.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            title="Visit AgEX"
          >
            AgEX ↗
          </a>
        </div>
        <small>© {new Date().getFullYear()} speech</small>
      </footer>
    </>
  );
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        {isAuthConfigured() ? (
          <ClerkProvider>{content}</ClerkProvider>
        ) : (
          content
        )}
      </body>
    </html>
  );
}
