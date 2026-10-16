type Method = "createLead" | "enrichLead" | "adminListLeads" | "adminGetSettings";
export async function callLeadGateway(action:Method,payload:Record<string,unknown>={}) {
 const url=process.env.FR_LEAD_GATEWAY_URL;
 const token=process.env.FR_FUNCTION_TOKEN;
 if(!url||!token) throw new Error("A integração de leads ainda não está configurada.");
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),12000);
 try {
  const res=await fetch(url,{method:"POST",headers:{"content-type":"application/json","x-fr-function-token":token},body:JSON.stringify({...payload,action}),signal:controller.signal,cache:"no-store"});
  const data=await res.json().catch(()=>({error:"Resposta inválida do serviço de leads."}));
  if(!res.ok) throw new Error(typeof data.error==="string"?data.error:"Erro ao acessar o banco de dados.");
  return data;
 } finally {clearTimeout(timeout);}
}
