import { SignUp } from "@clerk/nextjs";
import { isAuthConfigured } from "@/lib/auth-config";
export default function SignUpPage() {
  return (
    <main id="main" className="auth-shell">
      {isAuthConfigured() ? (
        <SignUp />
      ) : (
        <div className="panel">
          <h1>Sign-up is coming online.</h1>
          <p>
            Account access has not been configured yet. Please check back
            shortly.
          </p>
        </div>
      )}
    </main>
  );
}
