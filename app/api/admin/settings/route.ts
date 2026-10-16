import {NextResponse} from "next/server";
import {isAdmin} from "@/lib/auth";
import {callLeadGateway} from "@/lib/lead-gateway";

const headers = {"Cache-Control": "no-store"};

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({error: "Não autorizado."}, {status: 401});
  try {
    const result = await callLeadGateway("adminGetSettings");
    return NextResponse.json({settings: result.settings}, {headers});
  } catch (error) {
    console.error("FR adminGetSettings:", error instanceof Error ? error.message : error);
    return NextResponse.json({error: "Não foi possível carregar as configurações."}, {status: 503});
  }
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({error: "Não autorizado."}, {status: 401});
  let data: Record<string, unknown>;
  try { data = await request.json(); } catch { return NextResponse.json({error: "JSON inválido."}, {status: 400}); }
  if (
    typeof data.groupId !== "string" ||
    typeof data.panelBaseUrl !== "string" ||
    typeof data.initialTemplate !== "string" ||
    typeof data.enrichedTemplate !== "string" ||
    (data.instanceToken !== undefined && typeof data.instanceToken !== "string")
  ) return NextResponse.json({error: "Informe dados válidos."}, {status: 400});
  if (
    data.initialTemplate.length > 8000 ||
    data.enrichedTemplate.length > 8000 ||
    data.groupId.length > 240 ||
    data.panelBaseUrl.length > 500 ||
    (typeof data.instanceToken === "string" && data.instanceToken.length > 1000)
  ) return NextResponse.json({error: "Há um campo acima do limite permitido."}, {status: 400});
  try {
    const result = await callLeadGateway("adminSaveSettings", {
      groupId: data.groupId,
      panelBaseUrl: data.panelBaseUrl,
      initialTemplate: data.initialTemplate,
      enrichedTemplate: data.enrichedTemplate,
      instanceToken: data.instanceToken || ""
    });
    return NextResponse.json({settings: result.settings}, {headers});
  } catch (error) {
    console.error("FR adminSaveSettings:", error instanceof Error ? error.message : error);
    return NextResponse.json({error: error instanceof Error ? error.message : "Não foi possível salvar as configurações."}, {status: 503});
  }
}
