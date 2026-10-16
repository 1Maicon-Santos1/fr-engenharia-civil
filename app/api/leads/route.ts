import {NextResponse} from "next/server";
import {callLeadGateway} from "@/lib/lead-gateway";
export const runtime="nodejs";
export async function POST(request:Request){
 try{
  const data=await request.json();
  if(typeof data.name!=="string"||data.name.trim().length<2||typeof data.phone!=="string"||data.phone.replace(/\D/g,"").length<10||typeof data.service!=="string"||data.service.trim().length<2)
   return NextResponse.json({error:"Informe serviço, nome e WhatsApp com DDD."},{status:400});
  const result=await callLeadGateway("createLead",{name:data.name,phone:data.phone,service:data.service,email:data.email,city:data.city,attribution:data.attribution&&typeof data.attribution==="object"&&!Array.isArray(data.attribution)?data.attribution:{}});
  return NextResponse.json({lead:result.lead},{headers:{"Cache-Control":"no-store"}});
 }catch(error){console.error("FR createLead:",error instanceof Error?error.message:error);return NextResponse.json({error:"Não foi possível enviar a solicitação. Tente novamente."},{status:503});}
}
export async function PATCH(request:Request){
 try{
  const data=await request.json();
  if(typeof data.id!=="string"||!data.id.trim())return NextResponse.json({error:"Identificador inválido."},{status:400});
  const result=await callLeadGateway("enrichLead",{id:data.id,email:data.email,city:data.city,propertyType:data.propertyType,urgency:data.urgency,details:data.details});
  return NextResponse.json({lead:result.lead},{headers:{"Cache-Control":"no-store"}});
 }catch(error){console.error("FR enrichLead:",error instanceof Error?error.message:error);return NextResponse.json({error:"Não foi possível salvar os detalhes. Tente novamente."},{status:503});}
}
