# CRM Seguro de Vida

CRM simples e direto para a campanha de upsell de seguro de vida para a base de segurados (vigência jan–jun). Construído com Next.js (App Router) + SQLite local (`better-sqlite3`) — sem dependências externas de banco de dados.

## Funcionalidades

- **Cadastro de clientes**: manual ou em massa via importação de planilha (.xlsx/.csv) — colunas reconhecidas: Nome, Telefone, Data de início de vigência, e opcionalmente Corretor.
- **Responsável pelo contato**: Victor ou Lucas, obrigatório em todo cliente.
- **Status de CRM**: Não contatado → Em tentativa de contato → Contatado → Interessado → Proposta enviada → Fechado / Não interessado / Perdido.
- **Anotações em histórico**: cada cliente tem um log cronológico de anotações (objeções, combinados, contexto de vida).
- **Follow-up**: data de próximo contato, com destaque visual (linha vermelha) para vencidos ou para hoje, e alerta no dashboard.
- **Filtros e ordenação**: por status, corretor, classificação de lead, vigência, próximo contato, busca por nome/telefone, e ordenação por prioridade.
- **Dashboard**: total de clientes, contatados, taxa de conversão, fechados, perdidos, follow-ups pendentes, distribuição por status e performance por corretor (Victor vs Lucas).
- **Classificação de lead** (quente/morno/frio), **contador de tentativas de ligação**, **link direto para WhatsApp** (com sugestão de script por status) já incluídos como evoluções do escopo básico.

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse http://localhost:3000. O banco SQLite é criado automaticamente em `data/crm.db` (ignorado pelo git).

Para produção:

```bash
npm run build
npm run start
```

## Importando sua planilha

Vá em **Importar planilha**, escolha o corretor padrão (caso a planilha não tenha coluna "Corretor") e envie o arquivo .xlsx ou .csv. Linhas com dados obrigatórios faltando ou data inválida são reportadas individualmente, sem travar a importação das demais.

## Roadmap sugerido (próximos passos para profissionalizar ainda mais)

O sistema já cobre o essencial do funil de vendas. Para elevar o nível, sugiro evoluir em ondas:

1. **Automação de follow-up**
   - Notificação diária (e-mail/WhatsApp) para cada corretor com a lista de follow-ups do dia.
   - Regra automática: se um cliente fica X dias sem atualização de status, ele é sinalizado como "esfriando".

2. **Integração real com WhatsApp Business API**
   - Hoje o app já abre `wa.me` com mensagem pré-preenchida. O próximo passo é a API oficial (Twilio/Meta Cloud API) para registrar as mensagens automaticamente no histórico do cliente e detectar respostas.

3. **Scripts de venda dinâmicos**
   - Hoje há sugestões de script por status. Pode evoluir para uma biblioteca de scripts versionada por objeção (preço, "não preciso agora", "já tenho seguro", etc.), com botão de "copiar" e métricas de qual script mais converte.

4. **Métricas de performance por vendedor mais profundas**
   - Tempo médio até o primeiro contato, tempo médio até o fechamento, número médio de tentativas até a venda, ranking semanal Victor vs Lucas.

5. **Autenticação por corretor**
   - Login individual para Victor e Lucas, cada um vendo prioritariamente sua própria carteira (o filtro por corretor já existe; falta o login).

6. **Lembretes/calendário**
   - Sincronizar `next_contact_date` com Google Calendar para lembrete automático no celular do corretor.

Nenhum desses itens foi implementado nesta versão para manter o MVP enxuto e focado — mas a estrutura de dados (SQLite + API routes) já comporta todos eles sem necessidade de reescrever o sistema.
