import { NextResponse } from "next/server";
import { enrichLead,saveLead } from "@/lib/leads";

export async function POST(request:Request) {
  const data=await request.json();
  if(!data.name||!data.phone||!data.service) return NextResponse.json({error:"Preencha os campos obrigatórios."},{status:400});
  const lead=await saveLead({name:data.name,phone:data.phone,email:data.email||null,service:data.service,property_type:data.propertyType||null,city:data.city||null,urgency:data.urgency||null,details:data.details||null,stage:"initial"});
  return NextResponse.json({lead});
}

export async function PATCH(request:Request) {
  const data=await request.json();
  const id=Number(data.id);
  if(!Number.isFinite(id)) return NextResponse.json({error:"Lead inválido."},{status:400});
  const lead=await enrichLead(id,{email:data.email||null,property_type:data.propertyType||null,city:data.city||null,urgency:data.urgency||null,details:data.details||null});
  if(!lead) return NextResponse.json({error:"Lead não encontrado."},{status:404});
  return NextResponse.json({lead});
}
