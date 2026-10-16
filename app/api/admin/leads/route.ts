import {NextResponse} from "next/server";
import {isAdmin} from "@/lib/auth";
import {callLeadGateway} from "@/lib/lead-gateway";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({error: "Não autorizado."}, {status: 401});
  try {
    const result = await callLeadGateway("adminListLeads");
    return NextResponse.json({leads: result.leads}, {headers: {"Cache-Control": "no-store"}});
  } catch (error) {
    console.error("FR adminListLeads:", error instanceof Error ? error.message : error);
    return NextResponse.json({error: "Falha ao consultar leads."}, {status: 503});
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({error: "Não autorizado."}, {status: 401});
  let data: {id?: unknown};
  try { data = await request.json(); } catch { return NextResponse.json({error: "JSON inválido."}, {status: 400}); }
  if (typeof data.id !== "string" || !/^[0-9a-f-]{36}$/i.test(data.id)) {
    return NextResponse.json({error: "Identificador do lead inválido."}, {status: 400});
  }
  try {
    const result = await callLeadGateway("adminDeleteLead", {id: data.id});
    return NextResponse.json({success: result.success === true}, {headers: {"Cache-Control": "no-store"}});
  } catch (error) {
    console.error("FR adminDeleteLead:", error instanceof Error ? error.message : error);
    return NextResponse.json({error: error instanceof Error ? error.message : "Não foi possível excluir o lead."}, {status: 503});
  }
}
