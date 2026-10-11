import Image from "next/image";
import {notFound} from "next/navigation";
import Link from "next/link";
import {Header} from "@/components/Header";
import {Footer} from "@/components/Footer";
import {LeadQuiz} from "@/components/LeadQuiz";
import {bySlug,services} from "@/lib/services";

const serviceNotes:Record<string,{when:string;expect:string;image:string;alt:string}>={
  "avcb-clcb":{when:"Quando a emissão, renovação ou uma exigência do Corpo de Bombeiros coloca a operação em espera.",expect:"A FR analisa a situação do imóvel, orienta as adequações e organiza o caminho documental compatível com a demanda.",image:"/photos/avcb-clcb.webp",alt:"Vistoria de equipamentos de prevenção contra incêndio"},
  "regularizacao-de-imoveis":{when:"Quando uma pendência impede venda, financiamento, reforma, ampliação ou a abertura de uma nova atividade.",expect:"O atendimento parte de um diagnóstico do imóvel e do objetivo do proprietário — depois entram os documentos e acompanhamentos necessários.",image:"/photos/regularizacao-imoveis.webp",alt:"Análise de plantas para regularização de imóvel"},
  "laudos-tecnicos":{when:"Quando há sinais no imóvel ou quando uma decisão precisa de evidência técnica para avançar com segurança.",expect:"A inspeção observa, registra e traduz as condições encontradas em um parecer claro para a decisão e para o plano de ação.",image:"/photos/laudos-inspecoes.webp",alt:"Engenheiro realizando inspeção de fissura"}
};

export function generateStaticParams(){return services.map(s=>({slug:s.slug}));}
export default async function ServicePage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const s=bySlug(slug);if(!s)notFound();const note=serviceNotes[s.slug]||{when:"Quando uma decisão sobre o imóvel precisa de orientação técnica e documentação bem conduzida.",expect:"A FR entende o cenário antes de indicar a rota mais adequada para a sua demanda.",image:"/brand/fr-capa-corporativa.png",alt:"Identidade visual da FR Engenharia Civil"};const photo=s.photo||note.image;const photoAlt=s.photoAlt||note.alt;return <><Header/><main>
  <section className="serviceHero"><div><Link href="/" className="crumb">← Voltar para o início</Link><div className="heroRule"/><p className="eyebrow">{s.eyebrow}</p><h1>{s.title}</h1><p>{s.description}</p>{s.territory&&<span className="territoryNote">◉ {s.territory}</span>}<a href="#diagnostico" className="primary">Falar sobre meu caso <span>→</span></a></div><div className="serviceHeroVisual"><Image src={photo} alt={photoAlt} fill priority sizes="(max-width: 800px) 100vw, 42vw"/></div></section>
  <section className="serviceBody"><div><p className="eyebrow">O QUE A FR RESOLVE</p><h2>Critério técnico para você avançar <em>com segurança.</em></h2><p>Cada demanda é analisada de forma individual, considerando as características do imóvel, as exigências aplicáveis e a finalidade do projeto.</p><div className="serviceMoment"><span>Quando faz sentido procurar a FR</span><strong>{note.when}</strong></div></div><div className="bulletCard">{s.bullets.map((x,i)=><div key={x}><b>0{i+1}</b><span>{x}</span></div>)}<p>{note.expect}</p></div></section>
  <section className="serviceVisualBreak"><div><Image src={note.image} alt={note.alt} fill sizes="(max-width: 800px) 100vw, 52vw"/></div><article><p className="eyebrow">ATENDIMENTO QUE ORGANIZA</p><h2>O seu caso não entra em uma caixa pronta.</h2><p>A primeira conversa serve para separar o que é prioridade, o que depende de documento e o que exige uma avaliação no local.</p><a href="#diagnostico" className="textLink">Começar meu diagnóstico <span>→</span></a></article></section>
  <section id="diagnostico" className="diagnostic compact"><div className="diagIntro"><p className="eyebrow">FALE COM A FR</p><h2>Seu caso começa com uma conversa objetiva.</h2><p>Envie o essencial para o painel agora e, se desejar, responda mais algumas perguntas para deixar o retorno técnico ainda mais preciso.</p></div><LeadQuiz preset={s.title}/></section>
</main><Footer/></>}
