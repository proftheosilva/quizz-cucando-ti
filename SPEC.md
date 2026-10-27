# SPEC inicial — Quiz Cucando TI

**Estado:** arquitetura proposta, sujeita à validação do layout e das regras de jogo.

## Estrutura implementada
```text
src/           React + Vite; painel e entrada do aluno
server/        Node.js; API HTTP, WebSocket, regras e persistência
test/          testes de regras e fluxo de API
public/        logos oficiais
```

## Fluxo de dados
Navegador → API Node.js → Insforge Postgres. A comunicação da sala usa WebSocket com o servidor como autoridade sobre PIN, estado, relógio, correção e pontos. O backend chama OpenRouter apenas no fluxo de análise do administrador. Segredos ficam exclusivamente no servidor. Se o Insforge estiver indisponível, o servidor usa arquivo JSON local e avisa no console. Dados de cada professor recebem `ownerId`; registros antigos sem esse campo pertencem à conta administrativa legada.

## Módulos e rotas previstos
- `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /teachers`: sessão administrativa com cookie `HttpOnly`, `Secure` em produção e limitação de tentativas; novas contas docentes guardam hash scrypt. Apenas a conta administrativa original (`legacy-admin`) pode chamar `POST /teachers`; `/auth/me` informa `canManageTeachers` para a interface mostrar o controle autorizado.
- `GET/POST/PATCH /games`, `GET /games/:id`, `POST /games/:id/publish`: catálogo e edição.
- `POST /rooms`, `GET /rooms/:pin`, `POST /rooms/:pin/join`: criação e entrada.
- Eventos de sala: `participant_joined`, `game_started`, `question_opened`, `answer_submitted`, `question_closed`, `score_revealed`, `game_finished`.
- `GET /rankings`, `GET /results`: histórico e classificação por pontos.
- `GET/POST /catalog`: cadastro administrativo de turmas e disciplinas.
- `GET /analytics`: sessões com metadados de turma/disciplina, oportunidades de resposta e identificador pseudonimizado do aluno.
- `POST /imports/preview`, `POST /imports/commit`: prévia, validação e confirmação da análise externa.

## Dados previstos
Tabela `cucando_records` com `kind` (`game`, `session`, `import`, `room`, `catalog`, `student`, `review`, `teacher`) e `payload` JSONB. Registros pedagógicos são filtrados por `ownerId`; a migração de contas também cria índice único de e-mail docente. Salas em andamento são salvas como snapshots e restauradas na inicialização; os resultados guardam turma/disciplina, número de itens, participantes, HMAC de código por turma e eventos. O código de aluno não é persistido. As análises medem acertos/oportunidades e cobertura; pontos continuam como ranking competitivo.

## Insforge
A instância configurada usa `PROJECT_URL` e a chave administrativa `INSFORGE_ADMIN_API_KEY` na rota `POST /api/database/advance/rawsql` com parâmetros. A migração `20261013000100` criou a tabela com RLS e sem políticas públicas. A chave `uak_` existente não autenticou nas rotas de banco testadas. Referência: https://docs.insforge.dev/sdks/rest/database

## Configuração prevista
Variáveis usadas: `PROJECT_URL` (ou `INSFORGE_BASE_URL`), `INSFORGE_ADMIN_API_KEY`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `LOGIN_ADMIN`, `PASSWORD_ADMIN`, `SESSION_SECRET`. O `.env` fica fora do Git; `.env.example` não contém segredos.

## Regras técnicas
- Validar entrada e tamanho de texto no servidor; limitar requisições de login, entrada e resposta.
- Usar tempo do servidor e idempotência por participante/pergunta para impedir respostas duplicadas; a sala usa relógio único para a contagem nas duas interfaces.
- Para quiz, `publicRoom` envia ao aluno somente IDs e índices de cor das alternativas, nunca enunciados ou texto, inclusive após a revelação. Respostas simples são enviadas ao tocar; múltiplas têm debounce de 1,1 s.
- O estado da sala é persistido no armazenamento configurado após cada mudança. O processo mantém uma cópia em memória para responder ao jogo ao vivo; para múltiplas instâncias, acrescentar coordenação compartilhada e pub/sub.
- Importação por IA retorna dados estruturados com indicação de incerteza; nenhuma alteração é gravada sem confirmação do professor.
- Testes posteriores cobrirão pontuação, PIN, reconexão, permissões e persistência.
