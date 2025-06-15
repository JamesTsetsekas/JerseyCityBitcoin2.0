import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "~/env";

// Initialize S3 client
const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Generate a presigned URL for uploading a file directly to S3
 * @param {string} key - The object key (path in S3)
 * @param {string} contentType - The MIME type of the file
 * @returns {Promise<string>} The presigned URL for uploading
 */
export async function generateUploadUrl(key: string, contentType: string): Promise<string> {
  console.log("Generating upload URL for key:", key);
  console.log("Content type:", contentType);
    // Create the command with all necessary parameters
  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
    // Removed ACL: 'public-read' as it's not supported by the bucket
  });
  try {
    // Try with a longer expiration time - 7 days (604800 seconds)
    const url = await getSignedUrl(s3Client, command, { 
      expiresIn: 604800,
    });
    
    console.log("Generated presigned URL:", url);
    
    // Log URL parts for debugging
    const urlParts = new URL(url);
    console.log("URL hostname:", urlParts.hostname);
    console.log("URL pathname:", urlParts.pathname);
    console.log("URL search params:", urlParts.search);
    
    return url;
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    throw error;
  }
}

/**
 * Generate a presigned URL for viewing a file from S3
 * @param {string} key - The object key (path in S3)
 * @returns {Promise<string>} The presigned URL for viewing
 */
export async function getFileUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
  });
  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn: 604800 }); // URL expires in 7 days
    return url;
  } catch (error) {
    console.error("Error generating view URL:", error);
    throw error;
  }
}

/**
 * Generate a unique key for S3 based on file name and user ID
 * @param {string} fileName - Original file name
 * @param {string} userId - User ID
 * @returns {string} Unique S3 key
 */
export function generateS3Key(fileName: string, userId: string): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9-.]/g, "_");
  return `uploads/${userId}/${timestamp}-${sanitizedFileName}`;
}

/**
 * Verify access to the S3 bucket
 * @returns {Promise<{ success: boolean; message: string }>} Result of the verification
 */
export async function verifyS3Access(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Try to check if the bucket exists and is accessible
    const command = new HeadObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: "test-access.txt",
    });
    
    try {
      await s3Client.send(command);
      return { 
        success: true,
        message: "S3 bucket is accessible"
      };
    } catch (error: any) {
      // A 404 is actually okay - it means the bucket exists but the file doesn't
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        return { 
          success: true,
          message: "S3 bucket exists but test file not found (which is expected)"
        };
      }
      
      // If we get a different error, there might be a permissions or bucket issue
      return {
        success: false,
        message: `S3 bucket access error: ${error.message || "Unknown error"} (Code: ${error.$metadata?.httpStatusCode || "unknown"})`
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to verify S3 access: ${error.message || "Unknown error"}`
    };
  }
}

/**
 * Server-side upload function that bypasses client-side CORS issues
 */
export async function uploadFileToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  console.log("Server-side upload to S3 for key:", key);
    try {    // Upload directly from the server
    const command = new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // Removed ACL: 'public-read' as it's not supported by the bucket
    });
      const result = await s3Client.send(command);
    console.log("Server-side S3 upload successful:", result);
    
    // Generate a presigned URL for the uploaded file instead of a direct URL
    // This is necessary because the bucket requires authentication to access objects
    const getCommand = new GetObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
    });
    
    // Create a presigned URL that expires in 7 days (604800 seconds)
    // For production, you might want to use a CDN instead
    const presignedUrl = await getSignedUrl(s3Client, getCommand, { 
      expiresIn: 604800 
    });
    
    console.log("Presigned URL for uploaded file:", presignedUrl);
    
    // Return the presigned URL for immediate access
    return presignedUrl;
  } catch (error) {
    console.error("Server-side S3 upload failed:", error);
    throw error;
  }
}
