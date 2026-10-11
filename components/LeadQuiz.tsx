"use client";

import {FormEvent,useEffect,useMemo,useState} from "react";

type Form={service:string;name:string;phone:string;email:string;city:string;propertyType:string;urgency:string;situation:string;details:string};
type Phase="quick"|"choice"|"details"|"done";

const initial:Form={service:"",name:"",phone:"",email:"",city:"",propertyType:"",urgency:"",situation:"",details:""};
const wa="5516992785507";
const solutions=[
  {value:"AVCB, CLCB e Licenças",label:"AVCB e CLCB",copy:"Licença, renovação ou adequação de segurança."},
  {value:"Regularização de Imóveis",label:"Regularização",copy:"Documentos e aprovação para seu imóvel avançar."},
  {value:"Laudos e Inspeções Técnicas",label:"Laudos técnicos",copy:"Inspeção, patologia ou parecer com responsabilidade técnica."},
  {value:"Outro serviço de engenharia",label:"Outra demanda",copy:"Conte o essencial e direcionamos você."}
];
const propertyOptions=["Comércio ou empresa","Condomínio","Residência","Indústria ou galpão","Terreno ou empreendimento"];
const urgencyOptions=["O quanto antes","Nos próximos 30 dias","Estou planejando","Quero uma orientação"];

function stageQuestion(service:string){
  if(service.includes("AVCB")||service.includes("CLCB")) return {title:"Em que ponto está a documentação de segurança?",options:["Primeira emissão","Vencido ou perto de vencer","Recebi uma exigência","Não sei informar"]};
  if(service.includes("Regularização")) return {title:"O que você precisa destravar com a regularização?",options:["Venda ou financiamento","Reforma ou ampliação","Imóvel com pendência","Quero entender o cenário"]};
  if(service.includes("Laudos")) return {title:"Qual situação pede uma análise técnica?",options:["Fissuras, infiltrações ou danos","Inspeção predial preventiva","Laudo para decisão ou negociação","Outro sinal no imóvel"]};
  return {title:"Qual é o principal objetivo desta demanda?",options:["Resolver uma pendência","Planejar uma decisão","Atender uma exigência","Quero orientação técnica"]};
}

export function LeadQuiz({preset}:{preset?:string}) {
  const [open,setOpen]=useState(false);
  const [phase,setPhase]=useState<Phase>("quick");
  const [quickStep,setQuickStep]=useState(preset?2:1);
  const [detailStep,setDetailStep]=useState(1);
  const [leadId,setLeadId]=useState<number|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [form,setForm]=useState<Form>({...initial,service:preset||""});
  const question=useMemo(()=>stageQuestion(form.service),[form.service]);
  const set=(key:keyof Form,value:string)=>setForm(current=>({...current,[key]:value}));
  const close=()=>setOpen(false);
  const launch=()=>{setOpen(true);setError("");};

  useEffect(()=>{
    if(!open) return;
    const original=document.body.style.overflow;
    const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape") close();};
    document.body.style.overflow="hidden";
    window.addEventListener("keydown",onKey);
    return ()=>{document.body.style.overflow=original;window.removeEventListener("keydown",onKey);};
  },[open]);

  const quickCanContinue=quickStep===1?Boolean(form.service):Boolean(form.name&&form.phone);
  const detailCanContinue=detailStep===1?Boolean(form.situation):detailStep===2?Boolean(form.propertyType):Boolean(form.urgency);
  const whatsappText=`Olá, sou ${form.name}. Preciso de ${form.service}${form.city?` em ${form.city}`:""}. ${form.situation?`Situação: ${form.situation}.`:""}`;

  async function captureInitial(event:FormEvent){
    event.preventDefault();
    if(!quickCanContinue) return;
    if(quickStep===1){setQuickStep(2);return;}
    setLoading(true);setError("");
    try{
      const response=await fetch("/api/leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({service:form.service,name:form.name,phone:form.phone,email:form.email,city:form.city})});
      const body=await response.json();
      if(!response.ok) throw new Error(body.error||"Não foi possível enviar seus dados.");
      setLeadId(body.lead.id);setPhase("choice");
    }catch(reason){setError(reason instanceof Error?reason.message:"Tente novamente em instantes.");}
    finally{setLoading(false);}
  }

  async function saveDetails(event:FormEvent){
    event.preventDefault();
    if(!detailCanContinue) return;
    if(detailStep<3){setDetailStep(step=>step+1);return;}
    if(!leadId){setPhase("done");return;}
    setLoading(true);setError("");
    const details=[form.situation&&`Situação: ${form.situation}.`,form.details].filter(Boolean).join(" ");
    try{
      const response=await fetch("/api/leads",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:leadId,email:form.email,city:form.city,propertyType:form.propertyType,urgency:form.urgency,details})});
      const body=await response.json();
      if(!response.ok) throw new Error(body.error||"Não foi possível complementar agora.");
      setPhase("done");
    }catch(reason){setError(reason instanceof Error?reason.message:"Tente novamente em instantes.");}
    finally{setLoading(false);}
  }

  const restart=()=>{setForm({...initial,service:preset||""});setPhase("quick");setQuickStep(preset?2:1);setDetailStep(1);setLeadId(null);setError("");};

  return <>
    <div className="quizLauncher"><div><span className="launcherIndex">01 — 02</span><h3>Comece com o essencial.</h3><p>Em menos de um minuto, a FR recebe os dados para orientar o seu caso. Depois, você decide se quer detalhar mais.</p></div><button type="button" className="primary" onClick={launch}>Iniciar diagnóstico <span>→</span></button></div>
    <button type="button" className="mobileQuote" onClick={launch}><span>Solicitar orçamento</span><b>→</b></button>
    {open&&<div className="leadModal" role="dialog" aria-modal="true" aria-labelledby="lead-title"><div className="leadModalShell">
      <aside className="leadAside"><span className="modalBrand">FR Engenharia Civil e Avaliações</span><div className="modalAsideCopy"><p className="eyebrow">DIAGNÓSTICO FR</p><h2>Vamos transformar sua demanda em um <em>próximo passo claro.</em></h2><p>A primeira etapa é curta e já coloca a sua solicitação no painel da equipe.</p></div><div className="modalSteps"><div className={phase==="quick"?"active":"complete"}><b>01</b><span>Captação essencial<small>serviço e contato</small></span></div><div className={phase==="details"||phase==="done"?"active":""}><b>02</b><span>Contexto opcional<small>mais precisão para o retorno</small></span></div></div></aside>
      <section className="leadPanel"><button type="button" className="modalClose" onClick={close} aria-label="Fechar formulário">×</button>
        {phase==="quick"&&<form className="leadForm" onSubmit={captureInitial}><div className="leadProgress"><span>Etapa 1 de 2</span><i><em style={{width:`${quickStep===1?48:100}%`}}/></i></div>
          {quickStep===1&&<><p className="quizKicker">Para começar</p><h1 id="lead-title">Qual serviço você quer resolver?</h1><p className="leadHelper">Escolha a opção que mais se aproxima. A gente cuida do direcionamento técnico.</p><div className="solutionChoices">{solutions.map(item=><button type="button" key={item.value} className={form.service===item.value?"selected":""} onClick={()=>set("service",item.value)}><b>{item.label}</b><span>{item.copy}</span><i>→</i></button>)}</div></>}
          {quickStep===2&&<><p className="quizKicker">O essencial para te encontrar</p><h1 id="lead-title">Para quem a FR deve retornar?</h1><p className="leadHelper">Seu pedido entra no painel agora. Os demais dados podem ficar para depois.</p><div className="leadFields"><label>Seu nome<input autoFocus placeholder="Como podemos chamar você?" value={form.name} onChange={event=>set("name",event.target.value)}/></label><label>WhatsApp com DDD<input inputMode="tel" placeholder="(00) 00000-0000" value={form.phone} onChange={event=>set("phone",event.target.value)}/></label><label>Em qual cidade fica o imóvel? <small>opcional nesta etapa</small><input placeholder="Cidade / SP" value={form.city} onChange={event=>set("city",event.target.value)}/></label></div></>}
          {error&&<p className="leadError">{error}</p>}<div className="leadActions">{quickStep===2&&<button type="button" className="back" onClick={()=>setQuickStep(1)}>Voltar</button>}<button className="primary" disabled={!quickCanContinue||loading}>{loading?"Enviando…":quickStep===1?"Continuar":"Enviar solicitação"}<span>→</span></button></div>
        </form>}
        {phase==="choice"&&<div className="leadResult"><span className="resultMark">✓</span><p className="quizKicker">Captação concluída</p><h1 id="lead-title">Pronto, {form.name.split(" ")[0]||"sua solicitação"} já chegou à FR.</h1><p>Quer responder algumas perguntas opcionais? Elas ajudam a equipe a retornar já entendendo o seu cenário.</p><button type="button" className="primary" onClick={()=>setPhase("details")}>Quero detalhar meu caso <span>→</span></button><a className="modalWhatsApp" href={`https://wa.me/${wa}?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noreferrer">Ou falar pelo WhatsApp agora <span>↗</span></a><button type="button" className="skipButton" onClick={()=>setPhase("done")}>Prefiro deixar para depois</button></div>}
        {phase==="details"&&<form className="leadForm" onSubmit={saveDetails}><div className="leadProgress"><span>Etapa 2 de 2 · opcional</span><i><em style={{width:`${detailStep*33}%`}}/></i></div>
          {detailStep===1&&<><p className="quizKicker">Vamos dar contexto</p><h1 id="lead-title">{question.title}</h1><p className="leadHelper">Uma resposta basta para o primeiro direcionamento.</p><div className="contextChoices">{question.options.map(option=><button type="button" key={option} className={form.situation===option?"selected":""} onClick={()=>set("situation",option)}>{option}</button>)}</div></>}
          {detailStep===2&&<><p className="quizKicker">Sobre o imóvel</p><h1 id="lead-title">Qual tipo de imóvel vamos analisar?</h1><div className="contextChoices two">{propertyOptions.map(option=><button type="button" key={option} className={form.propertyType===option?"selected":""} onClick={()=>set("propertyType",option)}>{option}</button>)}</div><label className="standaloneField">Cidade do imóvel<input placeholder="Cidade / SP" value={form.city} onChange={event=>set("city",event.target.value)}/></label></>}
          {detailStep===3&&<><p className="quizKicker">Prioridade e observações</p><h1 id="lead-title">Quando você precisa resolver isso?</h1><div className="contextChoices two">{urgencyOptions.map(option=><button type="button" key={option} className={form.urgency===option?"selected":""} onClick={()=>set("urgency",option)}>{option}</button>)}</div><label className="standaloneField">Há algum detalhe que ajude? <small>opcional</small><textarea placeholder="Ex.: documento vencido, venda em andamento, infiltração..." value={form.details} onChange={event=>set("details",event.target.value)}/></label></>}
          {error&&<p className="leadError">{error}</p>}<div className="leadActions"><button type="button" className="back" onClick={()=>detailStep===1?setPhase("choice"):setDetailStep(step=>step-1)}>Voltar</button><button className="primary" disabled={!detailCanContinue||loading}>{loading?"Salvando…":detailStep===3?"Concluir contexto":"Continuar"}<span>→</span></button></div>
        </form>}
        {phase==="done"&&<div className="leadResult"><span className="resultMark">✓</span><p className="quizKicker">Solicitação registrada</p><h1 id="lead-title">Obrigado. A FR já tem o ponto de partida.</h1><p>Você pode fechar esta tela ou abrir o WhatsApp para falar com a equipe agora.</p><a className="primary" href={`https://wa.me/${wa}?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noreferrer">Abrir WhatsApp <span>↗</span></a><button type="button" className="skipButton" onClick={restart}>Fazer outro diagnóstico</button></div>}
      </section>
    </div></div>}
  </>;
}
