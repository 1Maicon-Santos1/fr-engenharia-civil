# Política de segurança — fr-engenharia-civil

## Comunicação privada

Relate suspeitas ao responsável pelo projeto por um canal privado já verificado. Se a opção **Security → Report a vulnerability** estiver disponível neste repositório, ela também pode ser utilizada. A presença deste arquivo não significa que esse recurso esteja habilitado.

Não abra issues ou pull requests públicos com senhas, tokens, dados de clientes ou instruções de exploração. Inclua o componente, a versão/commit e uma descrição mínima do comportamento observado, com valores sensíveis removidos. Não envie credenciais reais para comprovar o problema.

## Manutenção

A manutenção acompanha a versão atualmente em produção e a branch de desenvolvimento padrão (`main`). Tags ou cópias antigas precisam de revisão própria antes de serem reutilizadas. Dependências, funções e políticas de banco exigem validação individual; não há promessa de compatibilidade por permanecer na mesma major.

Pull requests do Dependabot são propostas de mudança, não autorização de publicação. Atualizações de versão rotineiras limitam-se a patches/minors; uma correção de segurança que exija major continua visível e deve ter migração planejada. Não habilitar auto-merge ou publicar automaticamente mudanças sem a verificação exigida pelo responsável.

## Dados, credenciais e testes

- Preserve alterações locais, histórico e evidências de incidente. Não reescreva histórico publicado nem apague dados para corrigir um alerta.
- Mantenha senhas, chaves secretas e credenciais privilegiadas no servidor. Chaves públicas de cliente não substituem autorização no backend ou RLS.
- Se um segredo real for exposto, preserve evidências, identifique os acessos afetados e coordene sua revogação/rotação. Remover uma string da última versão não invalida a credencial nem a remove do histórico.
- Testes de aplicação usam ambiente isolado, credenciais e dados fictícios, sem bancos, WhatsApp, webhooks ou outros serviços de produção. O check estático de fonte não substitui testes funcionais, análise de dependências ou revisão completa de segurança.
- Antes de alteração em produção ou reinício, apresentar impacto, testes, backup/restauração e rollback ao responsável e obter autorização explícita. Backup de banco não substitui cópia separada dos objetos de Storage.

## Limites dos controles automáticos

O workflow `Source security baseline` procura um conjunto limitado de literais de credenciais e referências mutáveis de Actions nos arquivos rastreados atuais. Ele não lê valores de secrets do GitHub, não instala pacotes e não executa a aplicação. Não cobre todo o histórico, arquivos ignorados, arquivos acima dos limites de leitura nem todas as classes de vulnerabilidade.

Proteção de branch/rulesets, revisão obrigatória, MFA, acesso de membros e proteção de ambientes são configurações da conta e precisam ser verificadas separadamente. Ter arquivos de política ou um check aprovado não comprova que a aplicação ou a hospedagem estejam seguras.
