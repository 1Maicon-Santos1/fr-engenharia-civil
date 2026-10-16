import Link from "next/link";
import Image from "next/image";

export function Header(){return <header className="header"><Link href="/" className="brand" aria-label="FR Engenharia Civil e Avaliações"><Image src="/brand/fr-logo-horizontal.png" alt="FR Engenharia Civil e Avaliações" width={415} height={146} priority/></Link><nav aria-label="Navegação principal"><Link href="/#servicos">Soluções</Link><Link href="/#processo">Como atuamos</Link><Link href="/#sobre">A FR</Link><a className="headerCta" href="/#diagnostico" data-open-lead="true">Fale com um engenheiro <span>→</span></a></nav></header>}
