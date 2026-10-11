import { NextResponse } from "next/server";
import { saveLead } from "@/lib/leads";
export async function POST(request:Request){ const data=await request.json(); if(!data.name||!data.phone||!data.service) return NextResponse.json({error:"Preencha os campos obrigatórios."},{status:400}); const lead=await saveLead({name:data.name,phone:data.phone,email:data.email||null,service:data.service,property_type:data.propertyType||null,city:data.city||null,urgency:data.urgency||null,details:data.details||null}); return NextResponse.json({lead}); }
