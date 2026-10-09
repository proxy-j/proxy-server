export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let targetUrl = url.searchParams.get("url");

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    if (!targetUrl) {
      return new Response("Aura Cloudflare Proxy Engine Active. Usage: /?url=https://example.com", {
        status: 400,
        headers: { 
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*" 
        },
      });
    }

    // Ensure scheme is present
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    try {
      // Forward the request to the target website
      const originRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
        redirect: "follow",
      });

      const response = await fetch(originRequest);

      // Clone and modify response headers for CORS and iframe embedding
      const newHeaders = new Headers(response.headers);
      
      // Grant full CORS access
      newHeaders.set("Access-Control-Allow-Origin", "*");
      newHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      newHeaders.set("Access-Control-Allow-Headers", "*");

      // Remove restrictive headers blocking iframe embedding
      newHeaders.delete("x-frame-options");
      newHeaders.delete("content-security-policy");
      newHeaders.delete("content-security-policy-report-only");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (err) {
      return new Response(`Proxy Connection Error: ${err.message}`, {
        status: 500,
        headers: { 
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*" 
        },
      });
    }
  },
};
