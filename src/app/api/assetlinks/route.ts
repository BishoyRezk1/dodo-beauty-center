export const dynamic = "force-dynamic";

// Digital Asset Links: proves the Android app owns this site (removes the browser bar).
// Fingerprints come from env vars so no redeploy of code is needed.
function statement(pkg?: string, certs?: string) {
  const fps = (certs || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!pkg || !fps.length) return [];
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: pkg, sha256_cert_fingerprints: fps }
    }
  ];
}

export function GET() {
  const body = [
    ...statement(process.env.ANDROID_PACKAGE || "com.zinanails.app", process.env.ANDROID_SHA256_CERT),
    ...statement(process.env.ANDROID_ADMIN_PACKAGE, process.env.ANDROID_ADMIN_SHA256_CERT)
  ];
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" }
  });
}
