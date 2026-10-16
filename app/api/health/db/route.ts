import {NextResponse} from "next/server";
import {callLeadGateway} from "@/lib/lead-gateway";
export const dynamic="force-dynamic";
export async function GET(){
 try {
  const result=await callLeadGateway("adminGetSettings");
  if(!result.settings)throw new Error("No database response");
  return NextResponse.json({ok:true,storage:"supabase"},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  console.error("FR keepalive failed:",error instanceof Error?error.message:error);
  return NextResponse.json({ok:false},{status:503,headers:{"Cache-Control":"no-store"}});
 }
}
