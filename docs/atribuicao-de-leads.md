# Origem de leads — FR Engenharia

A captação é salva no Supabase `public.fr_leads`: `source` (origem legível) e `attribution` (JSON com UTMs, domínio de referência, caminho de entrada e tipo de identificador, sem armazenar IDs brutos de cliques).

Exemplos de URLs:
- **Bio Instagram**: `https://www.frengenhariacivil.com.br/?utm_source=instagram&utm_medium=organic_social&utm_campaign=link_bio&utm_content=perfil`
- **Meta Ads**: `https://www.frengenhariacivil.com.br/?utm_source=facebook&utm_medium=paid_social&utm_campaign=engenharia_2026&utm_content=criativo_01`
- **Google Ads**: `https://www.frengenhariacivil.com.br/?utm_source=google&utm_medium=cpc&utm_campaign=engenharia_2026`

Quando as UTMs não existem, o site tenta identificar Google Ads por gclid/gbraid/wbraid, Microsoft Ads por msclkid, Meta por fbclid (sem supor que é necessariamente pago), e busca orgânica pelo domínio de referência. Acesso direto sem referência não é considerado "orgânico" automaticamente.

A informação fica na sessão do navegador (último canal identificado por até 30 minutos), inclusive após navegar para páginas internas. Nenhum dado é gravado no servidor até o lead enviar o formulário. Não devem ser incluídos dados pessoais nos valores de UTM.

As mensagens no grupo usam `{{rastreio}}` para origem, campanha e mídia (quando informadas). `{{origem}}`, `{{campanha}}`, `{{midia}}`, `{{utm_source}}`, `{{utm_medium}}` e `{{utm_campaign}}` estão disponíveis nos modelos. Mensagens antigas sem esses marcadores recebem automaticamente uma linha de origem.

**Limite**: UTMs e referências permitem atribuição indicativa e podem ser ausentes ou alterados. Não substituem a atribuição oficial da Meta e do Google. Valores para leads antigos não podem ser reconstruídos.
