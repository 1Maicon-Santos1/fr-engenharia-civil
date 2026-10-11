import { neon } from "@neondatabase/serverless";

export type Lead = {
  id:number;
  name:string;
  phone:string;
  email:string|null;
  service:string;
  property_type:string|null;
  city:string|null;
  urgency:string|null;
  details:string|null;
  stage:"initial"|"enriched";
  enriched_at:string|null;
  created_at:string;
};

type LeadInput = Omit<Lead,"id"|"created_at"|"enriched_at">;
const memory: Lead[] = [];

async function prepare(sql:any) {
  await sql`CREATE TABLE IF NOT EXISTS fr_leads (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT, service TEXT NOT NULL, property_type TEXT, city TEXT, urgency TEXT, details TEXT, stage TEXT NOT NULL DEFAULT 'initial', enriched_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await sql`ALTER TABLE fr_leads ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'initial'`;
  await sql`ALTER TABLE fr_leads ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ`;
}

async function notifyNewLead(lead:Lead) {
  if (!process.env.LEADS_WEBHOOK_URL) return;
  try {
    await fetch(process.env.LEADS_WEBHOOK_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event:"fr_lead_created",lead})});
  } catch {
    // O armazenamento do lead não pode falhar por indisponibilidade de uma automação externa.
  }
}

export async function saveLead(input:LeadInput) {
  if (!process.env.POSTGRES_URL) {
    const lead={...input,id:Date.now(),enriched_at:null,created_at:new Date().toISOString()} as Lead;
    memory.unshift(lead);
    await notifyNewLead(lead);
    return lead;
  }
  const sql=neon(process.env.POSTGRES_URL);
  await prepare(sql);
  const rows=await sql`INSERT INTO fr_leads (name,phone,email,service,property_type,city,urgency,details,stage) VALUES (${input.name},${input.phone},${input.email},${input.service},${input.property_type},${input.city},${input.urgency},${input.details},${input.stage}) RETURNING *`;
  const lead=rows[0] as Lead;
  await notifyNewLead(lead);
  return lead;
}

export async function enrichLead(id:number,input:Pick<LeadInput,"email"|"property_type"|"city"|"urgency"|"details">) {
  if (!process.env.POSTGRES_URL) {
    const lead=memory.find(item=>item.id===id);
    if (!lead) return null;
    Object.assign(lead,{...input,stage:"enriched",enriched_at:new Date().toISOString()});
    return lead;
  }
  const sql=neon(process.env.POSTGRES_URL);
  await prepare(sql);
  const rows=await sql`UPDATE fr_leads SET email=COALESCE(${input.email},email), property_type=COALESCE(${input.property_type},property_type), city=COALESCE(${input.city},city), urgency=COALESCE(${input.urgency},urgency), details=COALESCE(${input.details},details), stage='enriched', enriched_at=NOW() WHERE id=${id} RETURNING *`;
  return (rows[0] as Lead|undefined) ?? null;
}

export async function getLeads() {
  if (!process.env.POSTGRES_URL) return memory;
  const sql=neon(process.env.POSTGRES_URL);
  await prepare(sql);
  return (await sql`SELECT * FROM fr_leads ORDER BY created_at DESC LIMIT 200`) as Lead[];
}
