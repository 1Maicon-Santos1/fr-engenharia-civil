import Link from "next/link";
export function Header(){return <header className="header"><Link href="/" className="brand"><span>FR</span> ENGENHARIA <small>CIVIL E AVALIAÇÕES</small></Link><nav><Link href="/#servicos">Serviços</Link><Link href="/#processo">Como funciona</Link><Link href="/#sobre">A FR</Link><a className="headerCta" href="#diagnostico">Solicitar diagnóstico</a></nav></header>}
