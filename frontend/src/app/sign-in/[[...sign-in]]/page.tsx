import { SignIn } from "@clerk/nextjs";
import { isAuthConfigured } from "@/lib/auth-config";
export default function SignInPage() {
  return (
    <main id="main" className="auth-shell">
      {isAuthConfigured() ? (
        <SignIn />
      ) : (
        <div className="panel">
          <h1>Sign-in is coming online.</h1>
          <p>
            Account access has not been configured yet. Please check back
            shortly.
          </p>
        </div>
      )}
    </main>
  );
}
