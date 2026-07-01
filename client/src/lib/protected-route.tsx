import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

const BG = "#0D1929";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: BG }}
      >
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "rgba(197,163,90,0.4)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}
