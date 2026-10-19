import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="page-shell">
      <h1>A little off track.</h1>
      <p>This page doesn’t exist.</p>
      <Link className="button" href="/">
        Back to Speech ↗
      </Link>
    </main>
  );
}
