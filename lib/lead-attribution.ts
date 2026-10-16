/**
 * Atribuição indicativa de leads do site FR. Não captura IDs brutos de cliques,
 * endereço completo de referência ou dados pessoais do visitante.
 * Preserva o último canal identificável por até 30 minutos na aba.
 */
export type LeadAttribution = {
  source: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  referrer_domain: string;
  landing_path: string;
  click_id_type: string;
  captured_at: string;
};

const STORAGE_KEY = "fr_marketing_attribution_v1";
const WINDOW_MS = 30 * 60 * 1000;
const TRACKING_KEYS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "gclid", "gbraid", "wbraid", "fbclid", "msclkid"
];
function clean(value: string | null, max = 150): string {
  return (value || "").trim().replace(/[\r\n\t]/g, " ").slice(0, max);
}
function hostOf(value: string): string {
  if (!value) return "";
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); }
  catch { return ""; }
}
function isDomain(domain: string, base: string): boolean {
  return domain === base || domain.endsWith("." + base);
}
function sourceFrom(params: URLSearchParams, referrerDomain: string): string {
  const source = clean(params.get("utm_source")).toLowerCase().replace(/[\s-]+/g, "_");
  const medium = clean(params.get("utm_medium")).toLowerCase().replace(/[\s-]+/g, "_");
  const campaign = clean(params.get("utm_campaign")).toLowerCase();
  const content = clean(params.get("utm_content")).toLowerCase();
  const isPaid = /^(cpc|ppc|paid|paid_social|social_paid|paidsearch|paid_search|sem|cpm|ads|display|sponsored|paidsocial)$/.test(medium);
  const isMeta = /^(meta|fb|ig|facebook|instagram|messenger)(_|$)/.test(source);
  const isGoogle = /^(google|adwords|googleads|google_ads)$/.test(source);
  const isInstagram = /^(ig|instagram)(_|$)/.test(source);
  const isFacebook = /^(fb|facebook)(_|$)/.test(source);
  const googleClick = Boolean(params.get("gclid") || params.get("gbraid") || params.get("wbraid"));
  const metaClick = Boolean(params.get("fbclid"));
  const bingClick = Boolean(params.get("msclkid"));
  const bio = /(^|[^a-z])(bio|link_bio|perfil|linkinbio|link_in_bio)([^a-z]|$)/.test([medium,campaign,content].join(" "));
  if (googleClick || (isGoogle && isPaid)) return "Google Ads";
  if (isMeta && isPaid) return "Meta Ads";
  if (isInstagram && bio) return "Bio do Instagram";
  if (bingClick || (source === "bing" && isPaid)) return "Microsoft Ads";
  if (isGoogle && (medium === "organic" || medium === "organic_search")) return "Google orgânico";
  if (isInstagram && /^(organic|organic_social|social|bio)$/.test(medium)) return "Instagram orgânico";
  if (isFacebook && /^(organic|organic_social|social)$/.test(medium)) return "Facebook orgânico";
  if (isMeta) return isInstagram ? "Instagram (mídia não identificada)" : "Meta (mídia não identificada)";
  if (isGoogle) return "Google (mídia não identificada)";
  if (metaClick) return "Meta (link sem UTM)";
  if (source) return "Origem: " + source.slice(0, 60);
  if (/^(organic|organic_search|seo)$/.test(medium)) return "Busca orgânica";
  if (isPaid) return "Tráfego pago (plataforma não identificada)";
  if (medium) return "Mídia: " + medium.slice(0, 60);
  if (/(^|\.)google\.[a-z.]+$/.test(referrerDomain)) return "Google orgânico (referência)";
  if (isDomain(referrerDomain, "bing.com")) return "Bing orgânico (referência)";
  if (isDomain(referrerDomain, "instagram.com")) return "Instagram (referência)";
  if (isDomain(referrerDomain, "facebook.com") || isDomain(referrerDomain,"fb.com")) return "Facebook (referência)";
  if (isDomain(referrerDomain, "linkedin.com")) return "LinkedIn (referência)";
  if (isDomain(referrerDomain, "youtube.com")) return "YouTube (referência)";
  if (referrerDomain) return "Site de referência: " + referrerDomain.slice(0, 80);
  return "Acesso direto / não identificado";
}
function savedAttribution(): LeadAttribution | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const a = value as LeadAttribution;
    if (typeof a.source !== "string" || typeof a.captured_at !== "string") return null;
    const age = Date.now() - new Date(a.captured_at).getTime();
    return Number.isFinite(age) && age >= 0 && age < WINDOW_MS ? a : null;
  } catch { return null; }
}
export function captureLeadAttribution(): LeadAttribution {
  const fallback: LeadAttribution = {
    source: "Acesso direto / não identificado", utm_source:"", utm_medium:"",
    utm_campaign:"", utm_content:"", utm_term:"", referrer_domain:"",
    landing_path:"/", click_id_type:"", captured_at:new Date().toISOString()
  };
  if (typeof window === "undefined") return fallback;
  const params = new URLSearchParams(window.location.search);
  const tagged = TRACKING_KEYS.some(key => Boolean(params.get(key)));
  const previous = savedAttribution();
  if (!tagged && previous) return previous;
  const referrerDomain = hostOf(document.referrer);
  const currentDomain = window.location.hostname.toLowerCase().replace(/^www\./, "");
  const externalReferrer = referrerDomain && referrerDomain !== currentDomain ? referrerDomain : "";
  const attribution: LeadAttribution = {
    source: sourceFrom(params, externalReferrer),
    utm_source: clean(params.get("utm_source")),
    utm_medium: clean(params.get("utm_medium")),
    utm_campaign: clean(params.get("utm_campaign")),
    utm_content: clean(params.get("utm_content")),
    utm_term: clean(params.get("utm_term")),
    referrer_domain: clean(externalReferrer),
    landing_path: clean(window.location.pathname, 250) || "/",
    click_id_type: params.get("gclid") ? "gclid"
      : params.get("gbraid") ? "gbraid"
      : params.get("wbraid") ? "wbraid"
      : params.get("fbclid") ? "fbclid"
      : params.get("msclkid") ? "msclkid" : "",
    captured_at: new Date().toISOString()
  };
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution)); } catch { /* Navegação privada também funciona. */ }
  return attribution;
}
