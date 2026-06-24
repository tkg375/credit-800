import { AwsClient } from "aws4fetch";

const ACCOUNT_ID = "f5e2c8538c1cd871fc7dd9e29ced4303";
const BUCKET_NAME = "credit-800-files";

const corsConfig = `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>https://credit-800.com</AllowedOrigin>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <MaxAgeSeconds>3000</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>`;

const client = new AwsClient({
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  region: "auto",
  service: "s3",
});

const url = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET_NAME}?cors`;

const res = await client.fetch(url, {
  method: "PUT",
  headers: { "Content-Type": "application/xml" },
  body: corsConfig,
});

if (res.ok) {
  console.log("CORS configuration set successfully.");
} else {
  const text = await res.text();
  console.error(`Failed (${res.status}):`, text);
}
