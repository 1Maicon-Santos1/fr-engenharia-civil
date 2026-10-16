"use client";

import Image from "next/image";
import {FormEvent, useCallback, useEffect, useMemo, useState} from "react";
import "./admin.css";

type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  service: string;
  situation?: string | null;
  property_type: string | null;
  city: string | null;
  urgency: string | null;
  details: string | null;
  stage: "initial" | "enriched";
  source?: string | null;
  attribution?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    referrer_domain?: string;
    landing_path?: string;
  } | null;
  created_at: string;
};
type Settings = {
  configured: boolean;
  groupId: string | null;
  tokenHint: string | null;
  status: "connected" | "pending" | "error";
  panelBaseUrl: string;
  initialTemplate: string;
  enrichedTemplate: string;
};
type Draft = {groupId: string; panelBaseUrl: string; initialTemplate: string; enrichedTemplate: string};
type Notice = {kind: "success" | "error"; text: string} | null;
type HttpError = Error & {status?: number};
type Session = "checking" | "login" | "ready" | "unavailable";
type Tab = "leads" | "settings";

function draftFrom(settings: Settings): Draft {
  return {
    groupId: settings.groupId || "",
    panelBaseUrl: settings.panelBaseUrl || "",
    initialTemplate: settings.initialTemplate || "",
    enrichedTemplate: settings.enrichedTemplate || ""
  };
}
function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}
async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {credentials: "same-origin", cache: "no-store", ...init});
  const data = await response.json().catch(() => ({})) as {error?: string};
  if (!response.ok) {
    const error = new Error(data.error || "O servidor não respondeu à solicitação.") as HttpError;
    error.status = response.status;
    throw error;
  }
  return data as T;
}
const jsonHeaders = {"Content-Type": "application/json"};

export default function Admin() {
  const [session, setSession] = useState<Session>("checking");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [tab, setTab] = useState<Tab>("leads");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadsError, setLeadsError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [newToken, setNewToken] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testing, setTesting] = useState(false);
  const [confirmTest, setConfirmTest] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<Notice>(null);

  const loadLeads = useCallback(async (initial = false) => {
    setLoadingLeads(true);
    setLeadsError("");
    try {
      const result = await requestJson<{leads: Lead[]}>("/api/admin/leads");
      setLeads(Array.isArray(result.leads) ? result.leads : []);
      setSession("ready");
    } catch (error) {
      if ((error as HttpError).status === 401) {
        setSession("login");
        setSettings(null);
        setDraft(null);
      } else {
        setLeadsError(errorText(error));
        if (initial) setSession("unavailable");
      }
    } finally {
      setLoadingLeads(false);
    }
  }, []);

  useEffect(() => { void loadLeads(true); }, [loadLeads]);

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    setSettingsNotice(null);
    setConfirmTest(false);
    try {
      const result = await requestJson<{settings: Settings}>("/api/admin/settings");
      setSettings(result.settings);
      setDraft(draftFrom(result.settings));
      setNewToken("");
    } catch (error) {
      if ((error as HttpError).status === 401) setSession("login");
      setSettingsNotice({kind: "error", text: errorText(error)});
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    if (session === "ready" && tab === "settings" && !settings && !loadingSettings && !settingsNotice) {
      void loadSettings();
    }
  }, [session, tab, settings, loadingSettings, settingsNotice, loadSettings]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    try {
      await requestJson("/api/auth/login", {method: "POST", headers: jsonHeaders, body: JSON.stringify({password})});
      setPassword("");
      await loadLeads(true);
    } catch (error) {
      setLoginError(errorText(error));
    } finally {
      setLoggingIn(false);
    }
  }

  async function logout() {
    try { await requestJson("/api/auth/logout", {method: "POST"}); } catch { /* Limpa a interface mesmo que a rede falhe. */ }
    setSession("login");
    setTab("leads");
    setPassword("");
    setLeads([]);
    setSettings(null);
    setDraft(null);
    setNewToken("");
    setConfirmDeleteId(null);
  }

  async function deleteLead(id: string) {
    if (confirmDeleteId !== id) return;
    setDeletingId(id);
    setDeleteError("");
    try {
      await requestJson("/api/admin/leads", {
        method: "DELETE",
        headers: jsonHeaders,
        body: JSON.stringify({id})
      });
      setLeads(current => current.filter(lead => lead.id !== id));
      setConfirmDeleteId(null);
    } catch (error) {
      setDeleteError(errorText(error));
    } finally {
      setDeletingId(null);
    }
  }

  const dirty = Boolean(settings && draft && (
    newToken.trim() !== "" ||
    draft.groupId !== (settings.groupId || "") ||
    draft.panelBaseUrl !== settings.panelBaseUrl ||
    draft.initialTemplate !== settings.initialTemplate ||
    draft.enrichedTemplate !== settings.enrichedTemplate
  ));

  function edit(key: keyof Draft, value: string) {
    setDraft(current => current ? {...current, [key]: value} : current);
    setSettingsNotice(null);
    setConfirmTest(false);
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !settings || savingSettings) return;
    const groupId = draft.groupId.trim();
    if (!/^\d{10,30}@g\.us$/i.test(groupId)) {
      setSettingsNotice({kind: "error", text: "Informe o ID completo do grupo, no formato 120…@g.us."});
      return;
    }
    if (!draft.initialTemplate.includes("{{link_painel}}") || !draft.enrichedTemplate.includes("{{link_painel}}")) {
      setSettingsNotice({kind: "error", text: "As duas mensagens precisam conter a variável {{link_painel}}."});
      return;
    }
    setSavingSettings(true);
    setSettingsNotice(null);
    try {
      const result = await requestJson<{settings: Settings}>("/api/admin/settings", {
        method: "PUT",
        headers: jsonHeaders,
        body: JSON.stringify({
          groupId,
          panelBaseUrl: draft.panelBaseUrl.trim(),
          instanceToken: newToken.trim(),
          initialTemplate: draft.initialTemplate,
          enrichedTemplate: draft.enrichedTemplate
        })
      });
      setSettings(result.settings);
      setDraft(draftFrom(result.settings));
      setNewToken("");
      setSettingsNotice({kind: "success", text: "Configurações salvas no Supabase. O token permanece protegido."});
    } catch (error) {
      setSettingsNotice({kind: "error", text: errorText(error)});
    } finally {
      setSavingSettings(false);
    }
  }

  async function testConnection() {
    if (!settings || dirty || testing) return;
    setConfirmTest(false);
    setTesting(true);
    setSettingsNotice(null);
    try {
      await requestJson("/api/admin/settings/test", {method: "POST"});
      const updated = await requestJson<{settings: Settings}>("/api/admin/settings");
      setSettings(updated.settings);
      setDraft(draftFrom(updated.settings));
      setSettingsNotice({kind: "success", text: "Mensagem de teste enviada para o grupo configurado."});
    } catch (error) {
      setSettingsNotice({kind: "error", text: errorText(error)});
    } finally {
      setTesting(false);
    }
  }

  const filtered = useMemo(() => {
    const value = search.trim().toLocaleLowerCase("pt-BR");
    if (!value) return leads;
    return leads.filter(lead =>
      [lead.name, lead.phone, lead.email, lead.service, lead.city, lead.property_type, lead.details,
        lead.source, lead.attribution?.utm_source, lead.attribution?.utm_campaign, lead.attribution?.utm_medium]
        .some(field => (field || "").toLocaleLowerCase("pt-BR").includes(value))
    );
  }, [search, leads]);
  const enriched = leads.filter(lead => lead.stage === "enriched").length;

  if (session === "checking") return <main className="frAdminLogin"><div className="frLoginCard"><p>Verificando acesso ao painel FR...</p></div></main>;
  if (session === "unavailable") return <main className="frAdminLogin"><div className="frLoginCard"><h1>Não foi possível carregar o painel</h1><p>{leadsError || "Verifique sua conexão e tente novamente."}</p><button className="frBtn frBtnPrimary" onClick={() => void loadLeads(true)}>Tentar novamente</button><button className="frBtn frBtnQuiet" onClick={() => setSession("login")}>Entrar novamente</button></div></main>;

  if (session === "login") return <main className="frAdminLogin">
    <div className="frLoginCard">
      <div className="frLoginLogo"><Image src="/brand/fr-logo-horizontal.png" alt="FR Engenharia" width={185} height={65} priority /></div>
      <p className="frEyebrow">ÁREA RESTRITA</p>
      <h1>Painel FR</h1>
      <p>Gerencie os diagnósticos e as configurações do atendimento.</p>
      <form onSubmit={login}>
        <label htmlFor="fr-admin-password">Senha de acesso</label>
        <input id="fr-admin-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="Sua senha" />
        <button className="frBtn frBtnPrimary" disabled={loggingIn}>{loggingIn ? "Entrando..." : "Entrar no painel"}</button>
      </form>
      {loginError && <p className="frNotice frNoticeError" role="alert">{loginError}</p>}
    </div>
  </main>;

  return <div className="frAdmin">
    <header className="frAdminHeader">
      <div className="frAdminHeaderInner">
        <div className="frAdminIdentity">
          <span className="frAdminLogo"><Image src="/brand/fr-logo-horizontal.png" alt="FR Engenharia" width={138} height={48} priority /></span>
          <span className="frAdminProduct"><b>Painel administrativo</b><small>FR Engenharia Civil e Avaliações</small></span>
        </div>
        <div className="frAdminHeaderActions">
          <nav className="frAdminNav" aria-label="Seções do painel">
            <button type="button" onClick={() => setTab("leads")} className={tab === "leads" ? "active" : ""} aria-current={tab === "leads" ? "page" : undefined}>Leads</button>
            <button type="button" onClick={() => setTab("settings")} className={tab === "settings" ? "active" : ""} aria-current={tab === "settings" ? "page" : undefined}>Configurações</button>
          </nav>
          <button type="button" className="frExit" onClick={() => void logout()}>Sair</button>
        </div>
      </div>
    </header>

    {tab === "leads" ? <main className="frAdminContent">
      <div className="frPageHeading"><div><p className="frEyebrow">GESTÃO COMERCIAL</p><h1>Leads recebidos</h1><p>Cadastros enviados pelo formulário da FR Engenharia.</p></div>
        <button className="frBtn frBtnOutline" type="button" disabled={loadingLeads} onClick={() => void loadLeads()}>{loadingLeads ? "Atualizando..." : "Atualizar leads"}</button>
      </div>
      <div className="frMetrics">
        <div className="frMetric"><span>Total carregado</span><strong>{leads.length}</strong></div>
        <div className="frMetric"><span>Captação inicial</span><strong>{leads.length - enriched}</strong></div>
        <div className="frMetric"><span>Diagnóstico completo</span><strong>{enriched}</strong></div>
      </div>
      <div className="frListToolbar">
        <label htmlFor="fr-search-leads">Buscar cadastros</label>
        <input id="fr-search-leads" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome, telefone, serviço ou cidade" />
        <span>{filtered.length} resultado{filtered.length === 1 ? "" : "s"}</span>
      </div>
      {leadsError && <div className="frNotice frNoticeError" role="alert">{leadsError}</div>}
      {filtered.length === 0 ? <div className="frEmpty">{leads.length ? "Nenhum lead corresponde à busca." : "Nenhum diagnóstico registrado até o momento."}</div> :
        <div className="frLeadList">{filtered.map(lead => {
          const phoneDigits = lead.phone.replace(/\D/g, "");
          const waNumber = phoneDigits.startsWith("55") ? phoneDigits : "55" + phoneDigits;
          return <article className="frLeadCard" key={lead.id}>
            <div className="frLeadCardTop">
              <div><h2>{lead.name}</h2><span className="frLeadDate">Recebido em {new Date(lead.created_at).toLocaleString("pt-BR")}</span></div>
              <div className="frLeadBadges">
                <span className="frOriginTag">Origem: {lead.source && lead.source !== "site" ? lead.source : "Não identificada (cadastro antigo)"}</span>
                <span className={lead.stage === "enriched" ? "frStage frStageComplete" : "frStage"}>{lead.stage === "enriched" ? "Diagnóstico completo" : "Captação inicial"}</span>
              </div>
            </div>
            <div className="frLeadDetails">
              <div><span>Serviço solicitado</span><strong>{lead.service}</strong></div>
              <div><span>Origem do lead</span><strong>{lead.source && lead.source !== "site" ? lead.source : "Não identificada (cadastro antigo)"}</strong></div>
              {lead.attribution?.utm_campaign && <div><span>Campanha (UTM)</span><strong>{lead.attribution.utm_campaign}</strong></div>}
              {lead.attribution?.utm_medium && <div><span>Mídia (UTM)</span><strong>{lead.attribution.utm_medium}</strong></div>}
              {lead.attribution?.utm_source && <div><span>Fonte (UTM)</span><strong>{lead.attribution.utm_source}</strong></div>}
              <div><span>WhatsApp</span><a href={"https://wa.me/" + waNumber} target="_blank" rel="noopener noreferrer">{lead.phone}</a></div>
              <div><span>Cidade informada</span><strong>{lead.city || "Não informada"}</strong></div>
              <div><span>Tipo de imóvel</span><strong>{lead.property_type || "Não informado"}</strong></div>
              {lead.email && <div><span>E-mail</span><a href={"mailto:" + lead.email}>{lead.email}</a></div>}
              {lead.urgency && <div><span>Prazo</span><strong>{lead.urgency}</strong></div>}
              {lead.situation && <div><span>Situação</span><strong>{lead.situation}</strong></div>}
            </div>
            {lead.details && <div className="frLeadNotes"><span>Observações</span><p>{lead.details}</p></div>}
            <div className="frLeadCardActions">
              <a className="frBtn frBtnOutline" href={"https://wa.me/" + waNumber} target="_blank" rel="noopener noreferrer">Conversar no WhatsApp ↗</a>
              <button type="button" className="frBtn frBtnDangerGhost" onClick={() => {setConfirmDeleteId(lead.id); setDeleteError("");}} disabled={deletingId === lead.id}>Excluir lead</button>
            </div>
            {confirmDeleteId === lead.id && <div className="frDeleteConfirm" role="group" aria-label={"Confirmação de exclusão de " + lead.name}>
              <p><strong>Excluir definitivamente o cadastro de {lead.name}?</strong> Essa ação remove o lead e seu histórico de eventos do Supabase e não poderá ser desfeita.</p>
              {deleteError && <p className="frNotice frNoticeError" role="alert">{deleteError}</p>}
              <div><button className="frBtn frBtnDanger" type="button" disabled={deletingId === lead.id} onClick={() => void deleteLead(lead.id)}>{deletingId === lead.id ? "Excluindo..." : "Confirmar exclusão"}</button>
              <button className="frBtn frBtnOutline" type="button" disabled={deletingId === lead.id} onClick={() => {setConfirmDeleteId(null);setDeleteError("");}}>Cancelar</button></div>
            </div>}
          </article>;
        })}</div>}
    </main> : <main className="frAdminContent">
      <div className="frPageHeading"><div><p className="frEyebrow">INTEGRAÇÃO E AUTOMAÇÃO</p><h1>Configurações</h1><p>Gerencie o grupo de recebimento, a chave protegida e os textos enviados aos atendentes.</p></div>
        <button type="button" className="frBtn frBtnOutline" onClick={() => void loadSettings()} disabled={loadingSettings || savingSettings || testing}>Recarregar</button>
      </div>
      {settingsNotice && <div className={"frNotice " + (settingsNotice.kind === "error" ? "frNoticeError" : "frNoticeSuccess")} role={settingsNotice.kind === "error" ? "alert" : "status"}>{settingsNotice.text}</div>}
      {loadingSettings && <div className="frEmpty">Carregando configurações do Supabase...</div>}
      {!loadingSettings && !draft && <div className="frEmpty">As configurações não foram carregadas. Clique em Recarregar para tentar novamente.</div>}
      {!loadingSettings && draft && settings && <form onSubmit={saveSettings}>
        <div className="frSettingsGrid">
          <section className="frSettingsCard">
            <div className="frCardHeading"><div><p className="frEyebrow">WHATSAPP</p><h2>Grupo e conexão</h2></div>
              <span className={settings.status === "connected" ? "frConnection connected" : settings.status === "error" ? "frConnection failed" : "frConnection"}>{settings.status === "connected" ? "Último teste: conectado" : settings.status === "error" ? "Último teste: falhou" : "Teste pendente"}</span>
            </div>
            <label className="frField">ID completo do grupo
              <input value={draft.groupId} onChange={event => edit("groupId", event.target.value)} placeholder="120...@g.us" autoComplete="off" required />
              <small>É o grupo que recebe automaticamente os novos leads. Salvar outro ID altera o destino das próximas mensagens.</small>
            </label>
            <label className="frField">Token da instância
              <input type="password" value={newToken} onChange={event => {setNewToken(event.target.value);setSettingsNotice(null);setConfirmTest(false);}} placeholder={settings.tokenHint ? "Token cadastrado: " + settings.tokenHint : "Informe o token da instância"} autoComplete="new-password" />
              <small>{settings.tokenHint ? "Chave existente: " + settings.tokenHint + ". Deixe em branco para preservá-la; digite somente para substituir." : "Nenhum token salvo. Informe a chave da integração."} O valor completo nunca é exibido.</small>
            </label>
            <label className="frField">Endereço público do painel
              <input type="url" value={draft.panelBaseUrl} onChange={event => edit("panelBaseUrl", event.target.value)} placeholder="https://frengenhariacivil.com.br" required />
              <small>Utilizado nos links das notificações recebidas no grupo.</small>
            </label>
          </section>
          <aside className="frSettingsCard frSettingsInfo">
            <p className="frEyebrow">COMO FUNCIONA</p>
            <h2>Notificações automáticas</h2>
            <p>Depois que o visitante envia nome e WhatsApp, o sistema registra o cadastro no Supabase e prepara a notificação de captação inicial.</p>
            <p>Quando ele responde as perguntas complementares, a segunda mensagem apresenta as informações adicionais.</p>
            <div className="frSettingsStatus"><span>Token cadastrado</span><strong>{settings.tokenHint || "Não cadastrado"}</strong></div>
            <div className="frSettingsStatus"><span>Grupo configurado</span><strong>{settings.configured ? "Sim" : "Pendente"}</strong></div>
            <div className="frTestActions"><button type="button" className="frBtn frBtnOutline" disabled={!settings.configured || dirty || testing} onClick={() => setConfirmTest(true)}>Testar envio para o grupo</button>
              <small>Envia uma mensagem real para o grupo salvo. Salve as alterações antes de testar.</small>
            </div>
            {confirmTest && <div className="frTestConfirm"><p>Enviar agora uma mensagem real de teste para o grupo configurado?</p><div>
              <button className="frBtn frBtnPrimary" type="button" disabled={testing} onClick={() => void testConnection()}>{testing ? "Enviando..." : "Confirmar teste"}</button>
              <button className="frBtn frBtnOutline" type="button" disabled={testing} onClick={() => setConfirmTest(false)}>Cancelar</button>
            </div></div>}
          </aside>
        </div>
        <section className="frSettingsCard frTemplateCard">
          <div className="frCardHeading"><div><p className="frEyebrow">MODELOS DE NOTIFICAÇÃO</p><h2>Formato das mensagens</h2><p>Edite o texto que chega ao grupo em cada etapa do formulário.</p></div></div>
          <p className="frTemplateHelp">Variáveis disponíveis: <code>{"{{nome}}"}</code> <code>{"{{whatsapp}}"}</code> <code>{"{{email}}"}</code> <code>{"{{servico}}"}</code> <code>{"{{cidade}}"}</code> <code>{"{{tipo_local}}"}</code> <code>{"{{urgencia}}"}</code> <code>{"{{detalhes}}"}</code> <code>{"{{link_painel}}"}</code> <code>{"{{origem}}"}</code> <code>{"{{rastreio}}"}</code> <code>{"{{campanha}}"}</code> <code>{"{{midia}}"}</code> <code>{"{{utm_source}}"}</code> <code>{"{{utm_medium}}"}</code> <code>{"{{utm_campaign}}"}</code>. Mantenha <code>{"{{link_painel}}"}</code> nas duas mensagens.</p>
          <div className="frTemplatesGrid">
            <label className="frField"><b>Mensagem 1 — Novo lead</b><small>Enviada após a captação essencial.</small>
              <textarea rows={12} maxLength={8000} value={draft.initialTemplate} onChange={event => edit("initialTemplate", event.target.value)} required spellCheck={false} />
            </label>
            <label className="frField"><b>Mensagem 2 — Lead atualizado</b><small>Enviada quando o visitante conclui o contexto opcional.</small>
              <textarea rows={12} maxLength={8000} value={draft.enrichedTemplate} onChange={event => edit("enrichedTemplate", event.target.value)} required spellCheck={false} />
            </label>
          </div>
        </section>
        <div className="frSaveBar"><p>{dirty ? "Existem alterações ainda não salvas." : "Tudo sincronizado com as configurações salvas."}</p><button className="frBtn frBtnPrimary" type="submit" disabled={!dirty || savingSettings}>{savingSettings ? "Salvando..." : "Salvar configurações"}</button></div>
      </form>}
    </main>}
  </div>;
}
