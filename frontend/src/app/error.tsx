"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="page-shell">
      <h1>Something interrupted us.</h1>
      <p>Please try again in a moment.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
