"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setIsLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      setError("Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight">
          <span className="text-[hsl(280,100%,70%)]">Sign In</span>
        </h1>

        <div className="flex flex-col items-center gap-2">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md">
            {error && <div className="text-red-500">{error}</div>}
            
            <div className="flex flex-col">
              <label htmlFor="email" className="mb-2">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-md bg-white/10 px-4 py-2 text-white"
              />
            </div>
            
            <div className="flex flex-col">
              <label htmlFor="password" className="mb-2">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rounded-md bg-white/10 px-4 py-2 text-white"
              />
            </div>
            
            <button
              type="submit"
              className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          
          <div className="mt-4">
            Don't have an account?{" "}
            <Link href="/auth/signup" className="text-[hsl(280,100%,70%)]">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
