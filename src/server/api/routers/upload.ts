import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { generateS3Key, generateUploadUrl, getFileUrl, verifyS3Access, uploadFileToS3 } from "~/utils/s3";
import { TRPCError } from "@trpc/server";
import { env } from "~/env";

export const uploadRouter = createTRPCRouter({
  // Generate a presigned URL for uploading a file to S3
  generatePresignedUrl: protectedProcedure
    .input(z.object({ 
      fileName: z.string(),
      contentType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {      try {
        console.log("Generating presigned URL for:", input.fileName);
        
        // Generate a unique key for the file in S3
        const key = generateS3Key(input.fileName, ctx.session.user.id);
        
        // Log key details for debugging
        console.log("Generated S3 key:", key);
        console.log("S3 bucket:", env.AWS_S3_BUCKET);
        console.log("AWS region:", env.AWS_REGION);
        
        // Generate a presigned URL for direct upload to S3
        const presignedUrl = await generateUploadUrl(key, input.contentType);
        
        // Generate different URL formats to see which one works
        const fileUrl1 = `https://s3.${env.AWS_REGION}.amazonaws.com/${env.AWS_S3_BUCKET}/${key}`;
        const fileUrl2 = `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
        
        // Use the first format for now
        const fileUrl = fileUrl1;
        
        // Also provide a direct S3 console link for debugging (AWS console link)
        const s3ConsoleUrl = `https://s3.console.aws.amazon.com/s3/object/${env.AWS_S3_BUCKET}?region=${env.AWS_REGION}&prefix=${key}`;
        
        console.log("Generated presigned URL successfully");
        console.log("File will be accessible at (format 1):", fileUrl1);
        console.log("File will be accessible at (format 2):", fileUrl2);
        console.log("S3 Console URL (for debugging):", s3ConsoleUrl);
          // Return both the URL and the key so the client can reference the file later
        return {
          presignedUrl,
          key,
          fileUrl,
          fileUrl1,
          fileUrl2,
          s3ConsoleUrl
        };
      } catch (error) {
        console.error("Error generating presigned URL:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate upload URL",
          cause: error,
        });
      }
    }),
    
  // Get a presigned URL for viewing a file from S3
  getFileUrl: protectedProcedure
    .input(z.object({ 
      key: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        // Generate a presigned URL for viewing the file
        const fileUrl = await getFileUrl(input.key);
        return { fileUrl };
      } catch (error) {
        console.error("Error getting file URL:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate file URL",
          cause: error,
        });
      }
    }),
    
  // Verify S3 bucket access
  verifyS3Access: publicProcedure
    .query(async () => {
      try {
        const result = await verifyS3Access();
        console.log("S3 access check result:", result);
        return result;
      } catch (error) {
        console.error("Error checking S3 access:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to check S3 access",
          cause: error,
        });
      }
    }),
    
  // Server-side upload endpoint (bypass client-side CORS issues)
  uploadFile: protectedProcedure
    .input(z.object({
      fileName: z.string(),
      contentType: z.string(),
      base64Data: z.string(), // Base64-encoded file content
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("Processing server-side file upload for:", input.fileName);
        
        // Generate a unique key for the file
        const key = generateS3Key(input.fileName, ctx.session.user.id);
        
        // Convert base64 to buffer
        const fileBuffer = Buffer.from(
          input.base64Data.replace(/^data:.*?;base64,/, ""),
          "base64"
        );
        
        console.log(`File size: ${fileBuffer.length} bytes`);
        
        // Upload directly from the server
        const fileUrl = await uploadFileToS3(fileBuffer, key, input.contentType);
        
        console.log("Server-side upload successful. File URL:", fileUrl);
        
        return {
          success: true,
          fileUrl,
          key,
        };
      } catch (error) {
        console.error("Server-side upload error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload file",
          cause: error,
        });
      }
    }),
});
