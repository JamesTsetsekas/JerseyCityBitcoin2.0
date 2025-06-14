"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { format } from "date-fns";

export function LatestPost() {
  const [posts] = api.post.getAllPosts.useSuspenseQuery();
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const createPost = api.post.create.useMutation({
    onSuccess: async () => {
      await utils.post.invalidate();
      setName("");
      setBody("");
    },
  });

  return (
    <div className="w-full max-w-2xl">
      <h2 className="mb-6 text-2xl font-bold">Posts</h2>
      
      <div className="mb-8 space-y-6">
        {posts.length > 0 ? (
          posts.map((post) => (
            <div key={post.id} className="rounded-lg bg-white/5 p-6 shadow-md">
              <h3 className="mb-2 text-xl font-semibold">{post.name}</h3>
              <p className="mb-4 text-gray-300">{post.body || "No content"}</p>
              <div className="flex justify-between text-sm text-gray-400">
                <span>By: {post.createdBy.name || "Anonymous"}</span>
                <span>{format(new Date(post.createdAt), "PPP")}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-400">No posts yet.</p>
        )}
      </div>

      <div className="rounded-lg bg-white/5 p-6">
        <h3 className="mb-4 text-xl font-semibold">Create a New Post</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createPost.mutate({ name, body });
          }}
          className="flex flex-col gap-4"
        >
          <input
            type="text"
            placeholder="Title"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md bg-white/10 px-4 py-2 text-white"
            required
          />
          
          <textarea
            placeholder="What's on your mind?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded-md bg-white/10 px-4 py-2 text-white"
            rows={4}
            required
          />
          
          <button
            type="submit"
            className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
            disabled={createPost.isPending}
          >
            {createPost.isPending ? "Posting..." : "Post"}
          </button>
        </form>
      </div>
    </div>
  );
}
