import Link from "next/link";
import Image from "next/image";

export function Header(){return <header className="header"><Link href="/" className="brand" aria-label="FR Engenharia Civil e Avaliações"><Image src="/brand/fr-logo.jpg" alt="FR Engenharia Civil e Avaliações" width={260} height={100} priority/></Link><nav aria-label="Navegação principal"><Link href="/#servicos">Soluções</Link><Link href="/#processo">Como atuamos</Link><Link href="/#sobre">A FR</Link><a className="headerCta" href="#diagnostico">Fale com um engenheiro <span>→</span></a></nav></header>}
