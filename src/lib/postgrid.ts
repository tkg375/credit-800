const POSTGRID_BASE = "https://api.postgrid.com/print-mail/v1";

function getApiKey(): string {
  const key = process.env.POSTGRID_API_KEY;
  if (!key) {
    throw new Error("POSTGRID_API_KEY environment variable is not configured");
  }
  return key;
}

export interface PostGridAddress {
  name: string;
  address_line1: string;
  address_line2?: string;
  address_city: string;
  address_state: string;
  address_zip: string;
}

export interface PostGridTrackingEvent {
  id: string;
  type: string;
  name: string;
  date_created: string;
  location?: string;
}

export interface PostGridLetter {
  id: string;
  description?: string;
  url?: string;
  status: string;
  tracking_number?: string;
  tracking_events: PostGridTrackingEvent[];
  expected_delivery_date?: string;
  send_date?: string;
  date_created: string;
}

/** Convert our internal address shape to PostGrid's API format.
 *  Use companyName for organizations (to), firstName/lastName for individuals (from). */
function toPostGridAddress(addr: PostGridAddress, type: "person" | "company" = "company"): Record<string, unknown> {
  const base = {
    addressLine1: addr.address_line1,
    addressLine2: addr.address_line2 || "",
    city: addr.address_city,
    provinceOrState: addr.address_state,
    postalOrZip: addr.address_zip,
    countryCode: "US",
  };

  if (type === "company") {
    return { ...base, companyName: addr.name };
  }

  const parts = addr.name.trim().split(/\s+/);
  return {
    ...base,
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ") || "",
  };
}

/** Normalize a PostGrid API letter response to our internal shape. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeLetter(data: any): PostGridLetter {
  const trackingEvents: PostGridTrackingEvent[] = (data.trackingEvents ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => ({
      id: e.id ?? "",
      type: e.type ?? "",
      name: e.name ?? "",
      date_created: e.datetime ?? e.date_created ?? "",
      location: e.location,
    })
  );

  return {
    id: data.id,
    description: data.description,
    url: data.url,
    status: data.status ?? "ready",
    tracking_number: undefined,
    tracking_events: trackingEvents,
    expected_delivery_date: data.expectedDeliveryDate ?? data.expected_delivery_date,
    send_date: data.sendDate ?? data.send_date,
    date_created: data.createdAt ?? data.date_created ?? "",
  };
}

/** Send a letter via PostGrid. Returns the created letter object. */
export async function sendLetter(options: {
  to: PostGridAddress;
  from: PostGridAddress;
  html: string;
  description?: string;
}): Promise<PostGridLetter> {
  const res = await fetch(`${POSTGRID_BASE}/letters`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getApiKey(),
    },
    body: JSON.stringify({
      to: toPostGridAddress(options.to, "company"),
      from: toPostGridAddress(options.from, "person"),
      html: options.html,
      description: options.description || "Credit dispute letter",
      color: false,
      doubleSided: false,
      mailingClass: "first_class",
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || JSON.stringify(data);
    throw new Error(`PostGrid API error (${res.status}): ${msg}`);
  }

  return normalizeLetter(data);
}

/** Retrieve a letter by ID to check status and tracking. */
export async function getLetter(letterId: string): Promise<PostGridLetter> {
  const res = await fetch(`${POSTGRID_BASE}/letters/${letterId}`, {
    headers: {
      "x-api-key": getApiKey(),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || JSON.stringify(data);
    throw new Error(`PostGrid API error (${res.status}): ${msg}`);
  }

  return normalizeLetter(data);
}

/** Convert plain text letter content to properly structured HTML for PostGrid. */
export function letterToHtml(text: string): string {
  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Split on blank lines to get logical blocks (address blocks, paragraphs, etc.)
  const blocks = text.split(/\n{2,}/);

  const htmlBlocks = blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      // Within a block, preserve line breaks (for address lines, bullet lists, etc.)
      const lines = trimmed.split("\n").map(escapeHtml).join("<br>");
      return `<p>${lines}</p>`;
    })
    .filter(Boolean);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #000000;
    margin: 0.75in;
    margin-top: 2.75in;
    padding: 0;
  }
  p {
    margin: 0 0 10pt 0;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
</style>
</head>
<body>
${htmlBlocks.join("\n")}
</body>
</html>`;
}
