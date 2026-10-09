export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let targetUrl = url.searchParams.get("url");

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
      return new Response("Aura Proxy Active. Usage: /?url=https://example.com", {
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }

    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    try {
      // Forward request with a browser User-Agent to avoid bot blocks
      const modifiedHeaders = new Headers(request.headers);
      modifiedHeaders.set(
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      const originRequest = new Request(targetUrl, {
        method: request.method,
        headers: modifiedHeaders,
        body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
        redirect: "follow",
      });

      const response = await fetch(originRequest);
      const newHeaders = new Headers(response.headers);

      newHeaders.set("Access-Control-Allow-Origin", "*");
      newHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      newHeaders.set("Access-Control-Allow-Headers", "*");
      
      // Strip embedding restrictions
      newHeaders.delete("x-frame-options");
      newHeaders.delete("content-security-policy");
      newHeaders.delete("content-security-policy-report-only");

      const contentType = response.headers.get("content-type") || "";

      // Inject <base> tag into HTML so images, CSS, and relative links resolve
      if (contentType.includes("text/html")) {
        let html = await response.text();
        const baseTag = `<head><base href="${targetUrl}">`;
        html = html.replace(/<head>/i, baseTag);

        return new Response(html, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (err) {
      return new Response(`Proxy Error: ${err.message}`, {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }
  }
};
