import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { SafeUser, UserProfile } from "@shared/schema";

export type AuthUser = SafeUser & { profile: UserProfile | null };

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "Request failed");
  }
  return res.json();
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: () => fetchJson<AuthUser | null>("/api/auth/me"),
    staleTime: Infinity,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      fetchJson<AuthUser>("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (authUser) => {
      queryClient.setQueryData(["/api/auth/me"], authUser);
      queryClient.invalidateQueries({ queryKey: ["/api/scenarios"] });
      navigate("/dashboard");
    },
  });

  const signupMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      fetchJson<AuthUser>("/api/auth/signup", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (authUser) => {
      queryClient.setQueryData(["/api/auth/me"], authUser);
      navigate("/onboarding");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => fetchJson<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
      navigate("/");
    },
  });

  const isPro =
    user?.subscriptionStatus === "active" ||
    user?.subscriptionStatus === "trialing";

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    isPro,
    login: loginMutation,
    signup: signupMutation,
    logout: logoutMutation,
  };
}
