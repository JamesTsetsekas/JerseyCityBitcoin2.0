"use client";

import { useState, useRef } from "react";
import { api } from "~/trpc/react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import Image from "next/image";

// Define reaction emoji mapping
const reactionEmojis = {
  LIKE: "👍",
  LOVE: "❤️",
  LAUGH: "😂",
  WOW: "😮",
  SAD: "😢",
  ANGRY: "😡"
};

export function LatestPost() {
  const [posts] = api.post.getAllPosts.useSuspenseQuery();
  const utils = api.useUtils();
  const { data: session } = useSession();
  
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for replies
  const [replyContent, setReplyContent] = useState<Record<number, string>>({});
  const [replyPhotoUrl, setReplyPhotoUrl] = useState<Record<number, string>>({});
  const [activeReplyForm, setActiveReplyForm] = useState<number | null>(null);
  
  // State for file uploads
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const createPost = api.post.create.useMutation({
    onSuccess: async () => {
      await utils.post.invalidate();
      setName("");
      setBody("");
      setPhotoUrl("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
  });
  
  const createReply = api.post.createReply.useMutation({
    onSuccess: async () => {
      await utils.post.invalidate();
      setReplyContent({});
      setReplyPhotoUrl({});
      setActiveReplyForm(null);
    },
  });
  
  const reactToPost = api.post.reactToPost.useMutation({
    onSuccess: async () => {
      await utils.post.invalidate();
    },
  });
  
  const reactToReply = api.post.reactToReply.useMutation({
    onSuccess: async () => {
      await utils.post.invalidate();
    },
  });
  
  // Get upload mutation outside of the function
  const generateUploadUrl = api.upload.generatePresignedUrl.useMutation();
  
  // Server-side upload mutation
  const serverUpload = api.upload.uploadFile.useMutation();
  
  // Improved file upload handler with better error handling
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isReply = false, postId?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    let uploadSuccess = false;
    let imageUrl = "";
    
    try {
      console.log("Starting server-side upload for", file.name);
      setIsUploading(true);
      setUploadProgress(0);
      
      // Skip client-side upload attempts since we know the server has ACL issues
      // Go straight to server-side upload which we've fixed to work without ACLs
      
      // Simulate progress for better UX
      const intervalId = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 5, 95));
      }, 100);
      
      try {
        // Upload using server-side endpoint
        imageUrl = await handleServerUpload(file, isReply, postId);
        console.log("Server-side upload successful:", imageUrl);
        
        if (isReply && postId) {
          setReplyPhotoUrl({ ...replyPhotoUrl, [postId]: imageUrl });
        } else {
          setPhotoUrl(imageUrl);
        }
        
        clearInterval(intervalId);
        setUploadProgress(100);
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 500);
        
        uploadSuccess = true;
      } catch (serverUploadError) {
        console.error("Server-side upload failed:", serverUploadError);
        clearInterval(intervalId);
        
        // Fall back to placeholder for development if all upload methods fail
        const fallbackUrl = `https://via.placeholder.com/800x400?text=${encodeURIComponent(file.name)}`;
        console.log("Using fallback URL:", fallbackUrl);
        
        if (isReply && postId) {
          setReplyPhotoUrl({ ...replyPhotoUrl, [postId]: fallbackUrl });
        } else {
          setPhotoUrl(fallbackUrl);
        }
        
        setIsUploading(false);
        setUploadProgress(0);
        
        // Alert the user that the upload failed
        alert("Image upload failed. Using placeholder image for development.");
      }
    } catch (error) {
      console.error("All upload attempts failed:", error);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  
  // Function to handle server-side upload
  const handleServerUpload = async (file: File, isReply = false, postId?: number): Promise<string> => {
    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulate progress for better UX
    const intervalId = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 5, 95));
    }, 100);
    
    try {
      console.log("Starting server-side upload for:", file.name, "type:", file.type);
      
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      
      const base64Data = await base64Promise;
      console.log("File converted to base64, length:", base64Data.length);
      
      // Upload through server
      const result = await serverUpload.mutateAsync({
        fileName: file.name,
        contentType: file.type,
        base64Data
      });
      
      console.log("Server upload successful:", result);
      
      // Update state with URL
      if (isReply && postId) {
        setReplyPhotoUrl({ ...replyPhotoUrl, [postId]: result.fileUrl });
      } else {
        setPhotoUrl(result.fileUrl);
      }
      
      // Complete progress
      clearInterval(intervalId);
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
      
      return result.fileUrl;
    } catch (error) {
      console.error("Server upload failed:", error);
      clearInterval(intervalId);
      setIsUploading(false);
      setUploadProgress(0);
      throw error;
    }
  };
  
  // Helper to count reactions by type
  const countReactionsByType = (reactions: any[], type: string) => {
    return reactions.filter(r => r.type === type).length;
  };
  
  // Helper to check if current user has reacted with a specific type
  const hasUserReacted = (reactions: any[], type: string) => {
    if (!session?.user?.id) return false;
    return reactions.some(r => r.type === type && r.createdBy.id === session.user.id);
  };

  return (
    <div className="w-full max-w-2xl">
      <h2 className="mb-6 text-2xl font-bold">Posts</h2>
      
      <div className="mb-8 space-y-6">
        {posts.length > 0 ? (
          posts.map((post) => (
            <div key={post.id} className="rounded-lg bg-white/5 p-6 shadow-md">
              <div className="flex items-center mb-3">
                {post.createdBy.image && (
                  <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                    <Image 
                      src={post.createdBy.image} 
                      alt={post.createdBy.name || "User"} 
                      width={40} 
                      height={40}
                      className="object-cover"
                    />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold">{post.name}</h3>
                  <div className="text-sm text-gray-400">
                    <span>{post.createdBy.name || "Anonymous"}</span>
                    <span className="mx-2">•</span>
                    <span>{format(new Date(post.createdAt), "PPP")}</span>
                  </div>
                </div>
              </div>
              
              <p className="mb-4 text-gray-300">{post.body || "No content"}</p>
              
              {post.photoUrl && (
                <div className="mb-4 rounded-lg overflow-hidden">
                  {/* Use a regular img tag for both presigned and regular URLs */}
                  <img 
                    src={post.photoUrl} 
                    alt="Post image" 
                    className="w-full object-cover max-h-[300px]"
                    onError={(e) => {
                      // Fallback to placeholder if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.onerror = null; // Prevent infinite loop
                      console.error("Image failed to load:", post.photoUrl);
                      target.src = `https://via.placeholder.com/500x300?text=Image+Failed+to+Load`;
                    }}
                  />
                </div>
              )}
              
              {/* Reaction buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(reactionEmojis).map(([type, emoji]) => (
                  <button
                    key={type}
                    onClick={() => session?.user && reactToPost.mutate({ postId: post.id, type: type as any })}
                    className={`px-2 py-1 rounded-full text-sm flex items-center gap-1 ${
                      hasUserReacted(post.reactions, type) 
                        ? 'bg-white/20' 
                        : 'bg-white/10 hover:bg-white/15'
                    }`}
                    disabled={!session?.user}
                  >
                    <span>{emoji}</span>
                    {countReactionsByType(post.reactions, type) > 0 && (
                      <span>{countReactionsByType(post.reactions, type)}</span>
                    )}
                  </button>
                ))}
              </div>
              
              {/* Reply section */}
              <div className="mt-4 pl-4 border-l-2 border-white/10">
                {post.replies.map((reply) => (
                  <div key={reply.id} className="mb-4 pt-4">
                    <div className="flex items-center mb-2">
                      {reply.createdBy.image && (
                        <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                          <Image 
                            src={reply.createdBy.image} 
                            alt={reply.createdBy.name || "User"} 
                            width={32} 
                            height={32}
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <span className="font-medium">{reply.createdBy.name || "Anonymous"}</span>
                        <span className="text-xs text-gray-400 ml-2">
                          {format(new Date(reply.createdAt), "PPP")}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-300 mb-2">{reply.content}</p>
                    
                    {reply.photoUrl && (
                      <div className="mb-2 rounded-lg overflow-hidden">
                        {/* Use a regular img tag for both presigned and regular URLs */}
                        <img 
                          src={reply.photoUrl} 
                          alt="Reply image" 
                          className="w-full object-cover max-h-60"
                          onError={(e) => {
                            // Fallback to placeholder if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.onerror = null; // Prevent infinite loop
                            console.error("Reply image failed to load:", reply.photoUrl);
                            target.src = `https://via.placeholder.com/400x200?text=Image+Failed+to+Load`;
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Reply reactions */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(reactionEmojis).map(([type, emoji]) => (
                        <button
                          key={type}
                          onClick={() => session?.user && reactToReply.mutate({ replyId: reply.id, type: type as any })}
                          className={`px-1.5 py-0.5 rounded-full text-sm flex items-center gap-1 ${
                            hasUserReacted(reply.reactions, type) 
                              ? 'bg-white/20' 
                              : 'bg-white/10 hover:bg-white/15'
                          }`}
                          disabled={!session?.user}
                        >
                          <span className="text-xs">{emoji}</span>
                          {countReactionsByType(reply.reactions, type) > 0 && (
                            <span className="text-xs">{countReactionsByType(reply.reactions, type)}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                
                {/* Reply form */}
                {session?.user && (
                  <div className="mt-3">
                    {activeReplyForm === post.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          createReply.mutate({
                            postId: post.id,
                            content: replyContent[post.id] || '',
                            photoUrl: replyPhotoUrl[post.id]
                          });
                        }}
                        className="flex flex-col gap-2"
                      >
                        <textarea
                          placeholder="Write a reply..."
                          value={replyContent[post.id] || ''}
                          onChange={(e) => setReplyContent({...replyContent, [post.id]: e.target.value})}
                          className="w-full rounded-md bg-white/10 px-3 py-2 text-white text-sm"
                          rows={2}
                          required
                        />
                        
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileChange(e, true, post.id)}
                              className="text-sm text-white/70"
                              disabled={isUploading}
                            />
                            {isUploading && (
                              <div className="mt-1">
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-white/30" 
                                    style={{ width: `${uploadProgress}%` }}
                                  ></div>
                                </div>
                                <p className="text-xs text-white/50 mt-1">Uploading: {uploadProgress}%</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveReplyForm(null)}
                              className="text-sm text-white/70 hover:text-white"
                              disabled={isUploading}
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="rounded-full bg-white/10 px-4 py-1 text-sm font-semibold transition hover:bg-white/20"
                              disabled={createReply.isPending || isUploading}
                            >
                              {createReply.isPending ? "Sending..." : "Reply"}
                            </button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => setActiveReplyForm(post.id)}
                        className="text-sm text-white/70 hover:text-white"
                      >
                        Reply to this post
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-400">No posts yet.</p>
        )}
      </div>

      {/* Create post form */}
      {session?.user && (
        <div className="rounded-lg bg-white/5 p-6">
          <h3 className="mb-4 text-xl font-semibold">Create a New Post</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (photoUrl) {
                // If we have a photo URL, submit with it
                createPost.mutate({ name, body, photoUrl });
              } else {
                // Otherwise just submit the text
                createPost.mutate({ name, body });
              }
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
            
            <div className="flex items-center">
              <div className="w-full">
                <label className="block text-sm text-white/70 mb-2">
                  Add a photo (optional):
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e)}
                    className="mt-1 block w-full"
                    ref={fileInputRef}
                    disabled={isUploading}
                  />
                </label>
                
                {isUploading && (
                  <div className="mt-2">
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white/30" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-white/50 mt-1">Uploading: {uploadProgress}%</p>
                  </div>
                )}
              </div>
            </div>
            
            <button
              type="submit"
              className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
              disabled={createPost.isPending || isUploading}
            >
              {createPost.isPending ? "Posting..." : "Post"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
