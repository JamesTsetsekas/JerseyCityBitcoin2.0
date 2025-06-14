import Link from "next/link";

import { LatestPost } from "~/app/_components/post";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
  const hello = await api.post.hello({ text: "from tRPC" });
  const session = await auth();

  if (session?.user) {
    void api.post.getLatest.prefetch();
  }

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#252525] to-[#161616] text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            Jersey City <span className="text-[hsl(33,93%,52%)]">Bitcoin</span>
          </h1>
          <p className="text-2xl text-white/80">
            Jersey City Bitcoin is a decentralized community for those interested 
            in meeting up to discuss, and learn more about bitcoin in the Jersey City, NJ area.
             You can be well versed or new, all are welcome.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
            <Link
              className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20"
              href="https://create.t3.gg/en/usage/first-steps"
              target="_blank"
            >
              <h3 className="text-2xl font-bold">Meetup →</h3>
              <div className="text-lg">
                We host a monthy meetup in Jersey City to discuss Bitcoin
                and connect with fellow Bitcoiners! All are welcome.
              </div>
            </Link>
            <Link
              className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20"
              href="https://create.t3.gg/en/introduction"
              target="_blank"
            >
              <h3 className="text-2xl font-bold">Learn →</h3>
              <div className="text-lg">
                Explore our resources to deepen your understanding of Bitcoin
                and Lightning. Whether you're a beginner or an expert, there's
                always something new to learn!
              </div>
            </Link>
          </div>
          <div className="flex flex-col items-center gap-2 mb-8">
            <p className="text-2xl text-white">
              {hello ? hello.greeting : "Loading tRPC query..."}
            </p>

            <div className="flex flex-col items-center justify-center gap-4">
              <p className="text-center text-2xl text-white">
                {session && <span>Logged in as {session.user?.name}</span>}
              </p>
              <Link
                href={session ? "/api/auth/signout" : "/auth/signin"}
                className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
              >
                {session ? "Sign out" : "Sign in"}
              </Link>
              {!session && (
                <Link
                  href="/auth/signup"
                  className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
                >
                  Sign up
                </Link>
              )}
            </div>
          </div>

          <LatestPost />
        </div>
      </main>
    </HydrateClient>
  );
}
