import {NextResponse} from "next/server";
import {isAdmin} from "@/lib/auth";
import {callLeadGateway} from "@/lib/lead-gateway";
export async function GET(){
 if(!(await isAdmin()))return NextResponse.json({error:"Não autorizado"},{status:401});
 try{const result=await callLeadGateway("adminListLeads");return NextResponse.json({leads:result.leads},{headers:{"Cache-Control":"no-store"}})}
 catch(error){console.error("FR listLeads:",error instanceof Error?error.message:error);return NextResponse.json({error:"Falha ao consultar leads."},{status:503})}
}
