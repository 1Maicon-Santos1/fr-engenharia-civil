import {NextResponse} from "next/server";
import {isAdmin} from "@/lib/auth";
import {callLeadGateway} from "@/lib/lead-gateway";

export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({error: "Não autorizado."}, {status: 401});
  try {
    const result = await callLeadGateway("adminTestWhatsApp");
    return NextResponse.json({ok: Boolean(result.ok)}, {headers: {"Cache-Control": "no-store"}});
  } catch (error) {
    console.error("FR adminTestWhatsApp:", error instanceof Error ? error.message : error);
    return NextResponse.json({error: error instanceof Error ? error.message : "O teste de envio falhou."}, {status: 503});
  }
}
