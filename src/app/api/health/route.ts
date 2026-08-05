import { operationalResponseHeaders } from "@/lib/operational-health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return Response.json(
    { status: "ok" },
    { headers: operationalResponseHeaders(), status: 200 },
  );
}
