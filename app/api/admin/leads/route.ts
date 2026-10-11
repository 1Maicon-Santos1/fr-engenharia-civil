import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getLeads } from "@/lib/leads";
export async function GET(){if(!(await isAdmin())) return NextResponse.json({error:"Não autorizado"},{status:401}); return NextResponse.json({leads:await getLeads()});}
