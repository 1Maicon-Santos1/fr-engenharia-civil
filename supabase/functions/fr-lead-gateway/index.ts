import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const UAZAPI_SEND_TEXT_URL = "https://ipazua.uazapi.com/send/text";
const DEFAULT_PANEL_BASE_URL = "https://fr-engenharia-civil.vercel.app";
const DEFAULT_INITIAL_TEMPLATE = "🚨 *NOVO LEAD — FR ENGENHARIA*\n\n👤 *Nome:* {{nome}}\n📱 *WhatsApp:* {{whatsapp}}\n✉️ *E-mail:* {{email}}\n\n🧱 *Serviço:* {{servico}}\n📍 *Cidade:* {{cidade}}\n🕓 *Situação atual:* Captação inicial\n\n🔗 *Abrir no painel:*\n{{link_painel}}";
const DEFAULT_ENRICHED_TEMPLATE = "🟦 *LEAD ATUALIZADO — FR ENGENHARIA*\n\n👤 *Nome:* {{nome}}\n📱 *WhatsApp:* {{whatsapp}}\n✉️ *E-mail:* {{email}}\n\n🧱 *Serviço:* {{servico}}\n🏢 *Tipo de local:* {{tipo_local}}\n📍 *Cidade:* {{cidade}}\n⏱️ *Urgência:* {{urgencia}}\n📝 *Detalhes:* {{detalhes}}\n\n🔗 *Abrir no painel:*\n{{link_painel}}";
const apiUrl = Deno.env.get("SUPABASE_URL")!;
const legacyServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const serviceKey = legacyServiceKey || JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default;
const db = createClient(apiUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  service: string;
  situation: string | null;
  property_type: string | null;
  city: string | null;
  urgency: string | null;
  details: string | null;
  stage: "initial" | "enriched";
  source: string | null;
  attribution: Record<string, string | null> | null;
  created_at: string;
  enriched_at: string | null;
};

type Settings = {
  whatsapp_instance_token: string | null;
  whatsapp_group_id: string | null;
  whatsapp_connection_status: "pending" | "connected" | "error" | null;
  panel_base_url: string | null;
  initial_message_template: string | null;
  enriched_message_template: string | null;
  server_access_hash: string;
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}

function clean(value: unknown, max = 4_000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function nullable(value: unknown, max = 4_000) {
  return clean(value, max) || null;
}

function settingsPublic(settings: Settings) {
  const token = settings.whatsapp_instance_token?.trim() || "";
  const groupId = settings.whatsapp_group_id?.trim() || "";
  const status = settings.whatsapp_connection_status === "connected" || settings.whatsapp_connection_status === "error" ? settings.whatsapp_connection_status : "pending";
  return {
    configured: Boolean(token && groupId),
    groupId: groupId || null,
    tokenHint: token ? `••••••${token.slice(-4)}` : null,
    status,
    panelBaseUrl: settings.panel_base_url || DEFAULT_PANEL_BASE_URL,
    initialTemplate: settings.initial_message_template || DEFAULT_INITIAL_TEMPLATE,
    enrichedTemplate: settings.enriched_message_template || DEFAULT_ENRICHED_TEMPLATE,
  };
}

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

async function authorize(request: Request) {
  const token = request.headers.get("x-fr-function-token") || "";
  if (!token) return false;
  const { data, error } = await db.from("fr_panel_settings").select("server_access_hash").eq("id", true).maybeSingle();
  return !error && Boolean(data?.server_access_hash) && safeEqual(await sha256(token), data.server_access_hash);
}

async function getSettings() {
  const { data, error } = await db
    .from("fr_panel_settings")
    .select("whatsapp_instance_token,whatsapp_group_id,whatsapp_connection_status,panel_base_url,initial_message_template,enriched_message_template,server_access_hash")
    .eq("id", true)
    .single();
  if (error || !data) throw new Error("Não foi possível carregar as configurações do painel.");
  return data as Settings;
}

function normalizeGroupId(value: string) {
  const groupId = value.trim();
  if (!/^\d{10,30}@g\.us$/i.test(groupId)) throw new Error("Use o ID completo do grupo no formato 120…@g.us.");
  return groupId;
}

function normalizePanelBaseUrl(value: string) {
  const raw = value.trim();
  if (!raw) return DEFAULT_PANEL_BASE_URL;
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); }
  catch { throw new Error("Informe um domínio válido, como https://www.seudominio.com.br."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || (url.pathname && url.pathname !== "/") || url.search || url.hash) {
    throw new Error("Informe apenas o domínio do site, sem /admin ou outras páginas.");
  }
  return url.origin;
}

function text(value: string | null | undefined, fallback = "Não informado") {
  return value?.replace(/[\r\n]+/g, " ").replace(/[*_~`]/g, "").trim() || fallback;
}

function leadMessage(lead: Lead, event: "initial" | "enriched", settings: Settings) {
  const template = event === "initial" ? settings.initial_message_template || DEFAULT_INITIAL_TEMPLATE : settings.enriched_message_template || DEFAULT_ENRICHED_TEMPLATE;
  const panelBaseUrl = settings.panel_base_url || DEFAULT_PANEL_BASE_URL;
  const attribution = lead.attribution || {};
  const origin = lead.source && lead.source !== "site" ? text(lead.source) : "Não identificado (cadastro anterior)";
  const campaign = text(attribution.utm_campaign, "Sem campanha identificada");
  const medium = text(attribution.utm_medium, "Não informada");
  const sourceTag = text(attribution.utm_source, "Não informado");
  const tracking = [
    `*Origem:* ${origin}`,
    attribution.utm_campaign ? `*Campanha:* ${campaign}` : "",
    attribution.utm_medium ? `*Mídia:* ${medium}` : "",
  ].filter(Boolean).join("\n");
  const values: Record<string,string> = {
    nome: text(lead.name),
    whatsapp: text(lead.phone),
    email: text(lead.email),
    servico: text(lead.service),
    cidade: text(lead.city),
    origem: origin,
    campanha: campaign,
    midia: medium,
    utm_source: sourceTag,
    utm_medium: medium,
    utm_campaign: campaign,
    utm_content: text(attribution.utm_content),
    utm_term: text(attribution.utm_term),
    rastreio: tracking,
    tipo_local: text(lead.property_type),
    urgencia: text(lead.urgency),
    detalhes: text(lead.details),
    link_painel: `${panelBaseUrl.replace(/\/+$/, "")}/admin?lead=${encodeURIComponent(lead.id)}`,
  };
  const message = template.replace(/{{([a-z_]+)}}/g, (_match,key) => values[key] || `{{${key}}}`);
  // Garante a origem mesmo se um modelo antigo não tiver os marcadores novos.
  return template.includes("{{origem}}") || template.includes("{{rastreio}}")
    ? message
    : `${message}\n\n📊 *Origem e campanha:*\n${tracking}`;
}

function uazapiError(status: number) {
  if (status === 401) return "O token não foi aceito pela Uazapi. Salve o token da instância novamente.";
  if (status === 400) return "A Uazapi recusou os dados do envio. Confirme o ID do grupo.";
  if (status === 429) return "A Uazapi está temporariamente no limite de envios. Aguarde alguns segundos e tente de novo.";
  return "A Uazapi não respondeu ao envio neste momento. Tente novamente em instantes.";
}

async function sendText(groupId: string, token: string, message: string) {
  const request = await fetch(UAZAPI_SEND_TEXT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify({ number: groupId, text: message }),
  });
  return request.ok ? { ok: true, status: request.status, error: null } : { ok: false, status: request.status, error: uazapiError(request.status) };
}

async function updateConnectionStatus(status: "connected" | "error" | "pending") {
  const { error } = await db.from("fr_panel_settings").update({ whatsapp_connection_status: status }).eq("id", true);
  if (error) throw new Error("Não foi possível atualizar o status da integração.");
}

async function recordDelivery(lead: Lead, event: "initial" | "enriched", result: { ok: boolean; status: number; error: string | null }) {
  const statusColumn = event === "initial" ? "initial_notification_status" : "enriched_notification_status";
  const notifiedColumn = event === "initial" ? "initial_notified_at" : "enriched_notified_at";
  const status = result.ok ? "sent" : "failed";
  await db.from("fr_leads").update({ [statusColumn]: status, [notifiedColumn]: result.ok ? new Date().toISOString() : null }).eq("id", lead.id);
  await db.from("fr_lead_events").insert({
    lead_id: lead.id,
    event_type: result.ok ? `whatsapp_${event}_sent` : `whatsapp_${event}_failed`,
    detail: { status: result.status, error: result.error },
  });
}

async function notifyLead(lead: Lead, event: "initial" | "enriched") {
  const settings = await getSettings();
  const token = settings.whatsapp_instance_token?.trim() || "";
  const groupId = settings.whatsapp_group_id?.trim() || "";
  if (!token || !groupId) return;
  const result = await sendText(groupId, token, leadMessage(lead, event, settings));
  await recordDelivery(lead, event, result);
}

const ATTRIBUTION_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "referrer_domain", "landing_path", "click_id_type", "captured_at"] as const;

function parseAttribution(input: unknown) {
  const raw = input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {};
  const source = clean(raw.source, 100).replace(/[\\r\\n*_~`]/g, " ") || "Não identificado";
  const attribution: Record<string, string> = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = clean(raw[key], key === "landing_path" ? 250 : 150).replace(/[\\r\\n]/g, " ");
    if (value) attribution[key] = value;
  }
  return { source, attribution };
}

async function createLead(data: Record<string, unknown>) {
  const name = clean(data.name, 140);
  const phone = clean(data.phone, 32);
  const service = clean(data.service, 180);
  const { source, attribution } = parseAttribution(data.attribution);
  if (name.length < 2 || phone.length < 8 || service.length < 2) return response({ error: "Preencha nome, WhatsApp e serviço para continuar." }, 400);
  const { data: lead, error } = await db.from("fr_leads").insert({
    name, phone, service, email: nullable(data.email, 180), city: nullable(data.city, 180), source, attribution, stage: "initial",
  }).select().single();
  if (error || !lead) return response({ error: "Não foi possível registrar sua solicitação agora." }, 500);
  const typedLead = lead as Lead;
  await db.from("fr_lead_events").insert({ lead_id: typedLead.id, event_type: "created", detail: { source: "site", origem: source, attribution } });
  await notifyLead(typedLead, "initial");
  return response({ lead: typedLead });
}

async function enrichLead(data: Record<string, unknown>) {
  const id = clean(data.id, 80);
  if (!id) return response({ error: "Lead inválido." }, 400);
  const { data: existing, error: findError } = await db.from("fr_leads").select("*").eq("id", id).maybeSingle();
  if (findError || !existing) return response({ error: "Lead não encontrado." }, 404);
  const { data: lead, error } = await db.from("fr_leads").update({
    email: nullable(data.email, 180) || existing.email,
    city: nullable(data.city, 180) || existing.city,
    property_type: nullable(data.propertyType, 300),
    urgency: nullable(data.urgency, 300),
    details: nullable(data.details, 4_000),
    stage: "enriched",
    enriched_at: new Date().toISOString(),
  }).eq("id", id).select().single();
  if (error || !lead) return response({ error: "Não foi possível salvar os detalhes." }, 500);
  const typedLead = lead as Lead;
  await db.from("fr_lead_events").insert({ lead_id: typedLead.id, event_type: "enriched", detail: { source: "site" } });
  await notifyLead(typedLead, "enriched");
  return response({ lead: typedLead });
}

async function listLeads() {
  const { data, error } = await db.from("fr_leads").select("*").order("created_at", { ascending: false }).limit(500);
  return error ? response({ error: "Não foi possível carregar os leads." }, 500) : response({ leads: data || [] });
}

async function saveSettings(data: Record<string, unknown>) {
  const current = await getSettings();
  const token = clean(data.instanceToken, 1_000) || current.whatsapp_instance_token || "";
  if (!token) return response({ error: "Informe o token da instância para ativar o envio." }, 400);
  let groupId: string;
  try { groupId = normalizeGroupId(clean(data.groupId, 240)); } catch (error) { return response({ error: error instanceof Error ? error.message : "ID do grupo inválido." }, 400); }
  let panelBaseUrl: string;
  try { panelBaseUrl = normalizePanelBaseUrl(clean(data.panelBaseUrl, 500) || current.panel_base_url || DEFAULT_PANEL_BASE_URL); } catch (error) { return response({ error: error instanceof Error ? error.message : "Domínio inválido." }, 400); }
  const initialTemplate = clean(data.initialTemplate, 8_000) || current.initial_message_template || DEFAULT_INITIAL_TEMPLATE;
  const enrichedTemplate = clean(data.enrichedTemplate, 8_000) || current.enriched_message_template || DEFAULT_ENRICHED_TEMPLATE;
  if (!initialTemplate.includes("{{link_painel}}") || !enrichedTemplate.includes("{{link_painel}}")) return response({ error: "Mantenha a variável {{link_painel}} nas duas mensagens para que o grupo abra o lead no painel." }, 400);
  const connectionChanged = token !== current.whatsapp_instance_token || groupId !== current.whatsapp_group_id;
  const { error } = await db.from("fr_panel_settings").update({
    whatsapp_instance_token: token,
    whatsapp_group_id: groupId,
    whatsapp_connection_status: connectionChanged ? "pending" : current.whatsapp_connection_status || "pending",
    panel_base_url: panelBaseUrl,
    initial_message_template: initialTemplate,
    enriched_message_template: enrichedTemplate,
  }).eq("id", true);
  if (error) return response({ error: "Não foi possível salvar a configuração." }, 500);
  return response({ settings: settingsPublic(await getSettings()) });
}

async function testWhatsApp() {
  const settings = await getSettings();
  const token = settings.whatsapp_instance_token?.trim() || "";
  const groupId = settings.whatsapp_group_id?.trim() || "";
  if (!token || !groupId) return response({ error: "Salve o token e o ID do grupo antes de testar." }, 400);
  const result = await sendText(groupId, token, "✅ *Conexão validada — FR Engenharia*\nAs notificações de novos leads já podem ser enviadas para este grupo.");
  await updateConnectionStatus(result.ok ? "connected" : "error");
  return result.ok ? response({ ok: true }) : response({ error: result.error }, 422);
}

async function deleteLead(data: Record<string, unknown>) {
  const id = clean(data.id, 80);
  if (!id) return response({ error: "Lead inválido." }, 400);
  const { error: eventsError } = await db.from("fr_lead_events").delete().eq("lead_id", id);
  if (eventsError) return response({ error: "Não foi possível remover os eventos deste lead." }, 500);
  const { data: deleted, error } = await db.from("fr_leads").delete().eq("id", id).select("id");
  if (error) return response({ error: "Não foi possível excluir este lead." }, 500);
  if (!deleted?.length) return response({ error: "Este lead não foi encontrado." }, 404);
  return response({ success: true });
}

Deno.serve(async request => {
  if (request.method !== "POST") return response({ error: "Método não permitido." }, 405);
  if (!(await authorize(request))) return response({ error: "Não autorizado." }, 401);
  let payload: Record<string, unknown>;
  try { payload = await request.json(); } catch { return response({ error: "Conteúdo inválido." }, 400); }
  try {
    switch (payload.action) {
      case "createLead": return await createLead(payload);
      case "enrichLead": return await enrichLead(payload);
      case "adminListLeads": return await listLeads();
      case "adminGetSettings": return response({ settings: settingsPublic(await getSettings()) });
      case "adminSaveSettings": return await saveSettings(payload);
      case "adminTestWhatsApp": return await testWhatsApp();
      case "adminDeleteLead": return await deleteLead(payload);
      default: return response({ error: "Ação desconhecida." }, 400);
    }
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
