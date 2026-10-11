import { neon } from "@neondatabase/serverless";

export type Lead = {id:number; name:string; phone:string; email:string|null; service:string; property_type:string|null; city:string|null; urgency:string|null; details:string|null; created_at:string};
const memory: Lead[] = [];

export async function saveLead(input: Omit<Lead,"id"|"created_at">) {
  if (!process.env.POSTGRES_URL) { const lead={...input,id:Date.now(),created_at:new Date().toISOString()}; memory.unshift(lead); return lead; }
  const sql=neon(process.env.POSTGRES_URL);
  await sql`CREATE TABLE IF NOT EXISTS fr_leads (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT, service TEXT NOT NULL, property_type TEXT, city TEXT, urgency TEXT, details TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  const rows=await sql`INSERT INTO fr_leads (name,phone,email,service,property_type,city,urgency,details) VALUES (${input.name},${input.phone},${input.email},${input.service},${input.property_type},${input.city},${input.urgency},${input.details}) RETURNING *`;
  return rows[0] as Lead;
}
export async function getLeads() { if (!process.env.POSTGRES_URL) return memory; const sql=neon(process.env.POSTGRES_URL); await sql`CREATE TABLE IF NOT EXISTS fr_leads (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT, service TEXT NOT NULL, property_type TEXT, city TEXT, urgency TEXT, details TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`; return (await sql`SELECT * FROM fr_leads ORDER BY created_at DESC LIMIT 200`) as Lead[]; }
