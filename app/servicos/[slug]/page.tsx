import {notFound} from "next/navigation";
import Link from "next/link";
import {Header} from "@/components/Header";
import {Footer} from "@/components/Footer";
import {LeadQuiz} from "@/components/LeadQuiz";
import {bySlug,services} from "@/lib/services";

export function generateStaticParams(){return services.map(s=>({slug:s.slug}));}
export default async function ServicePage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const s=bySlug(slug);if(!s)notFound();return <><Header/><main><section className="serviceHero"><div><Link href="/" className="crumb">← Voltar para o início</Link><div className="heroRule"/><p className="eyebrow">{s.eyebrow}</p><h1>{s.title}</h1><p>{s.description}</p><a href="#diagnostico" className="primary">Falar sobre meu caso <span>→</span></a></div><div className="serviceHeroVisual" role="presentation"><span>Engenharia que<br/>organiza caminhos.</span></div></section><section className="serviceBody"><div><p className="eyebrow">O QUE A FR RESOLVE</p><h2>Critério técnico para você avançar <em>com segurança.</em></h2><p>Cada demanda é analisada de forma individual, considerando as características do imóvel, as exigências aplicáveis e a finalidade do projeto.</p></div><div className="bulletCard">{s.bullets.map((x,i)=><div key={x}><b>0{i+1}</b><span>{x}</span></div>)}</div></section><section id="diagnostico" className="diagnostic compact"><div className="diagIntro"><p className="eyebrow">FALE COM A FR</p><h2>Seu caso começa com uma conversa objetiva.</h2><p>Conte o essencial e receba a orientação correta para o seu próximo passo.</p></div><LeadQuiz preset={s.title}/></section></main><Footer/></>}
