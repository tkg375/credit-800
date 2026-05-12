import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucket = process.env.S3_BUCKET!;

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    s3Client = new S3Client({
      region: process.env.S3_REGION || "us-east-1",
      ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
    });
  }
  return s3Client;
}

/** Get a pre-signed URL for a client to PUT an object directly to S3 (5 min expiry) */
export async function getUploadUrl(
  key: string,
  contentType = "application/pdf"
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getS3Client(), command, { expiresIn: 300 });
}

/** Get a pre-signed URL for downloading/viewing an object (5 min expiry) */
export async function getDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(getS3Client(), command, { expiresIn: 300 });
}

/** Read an object's bytes from S3 server-side */
export async function getObject(key: string): Promise<Uint8Array> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await (getS3Client()).send(command);
  if (!response.Body) throw new Error("No body returned from S3");
  return response.Body.transformToByteArray();
}

/** Upload bytes to S3 server-side */
export async function putObject(
  key: string,
  data: Buffer | Uint8Array,
  contentType = "application/pdf"
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: data,
    ContentType: contentType,
  });
  await (getS3Client()).send(command);
}

/** Delete an object from S3 */
export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
  await (getS3Client()).send(command);
}
