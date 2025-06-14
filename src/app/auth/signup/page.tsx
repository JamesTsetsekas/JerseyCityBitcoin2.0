"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  // You'll need to create this mutation in your tRPC router
  const createUser = api.auth.signup.useMutation({
    onSuccess: () => {
      router.push("/auth/signin");
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    createUser.mutate({ email, password, name });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#252525] to-[#161616] text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight">
          <span className="">Sign Up</span>
        </h1>

        <div className="flex flex-col items-center gap-2">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md">
            {error && <div className="text-red-500">{error}</div>}
            
            <div className="flex flex-col">
              <label htmlFor="name" className="mb-2">Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded-md bg-white/10 px-4 py-2 text-white"
              />
            </div>
            
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
              disabled={createUser.isLoading}
            >
              {createUser.isLoading ? "Signing up..." : "Sign up"}
            </button>
          </form>
          
          <div className="mt-4">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-[hsl(33,93%,52%)]">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
