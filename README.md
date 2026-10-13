# Quiz Cucando TI

Plataforma de gamificação educacional para turmas presenciais. O professor cria quizzes e jogos de associação, abre uma sala com PIN e acompanha os alunos em tempo real. A interface segue a proposta aprovada **02 · Estúdio lúdico**.

## Funcionalidades

- Editor de quiz com escolha simples ou múltipla, imagem por URL, tempo, pontos e penalidade por erro.
- Revelação opcional da imagem após a resposta, duplicação de jogos e exportação em PDF.
- Matching game de conceitos com pontuação por acerto e perda por tentativa incorreta.
- Sala ao vivo com PIN de seis dígitos, apelido, avatar aleatório, lobby, revelação e pódio.
- Histórico de sessões e ranking acumulado por apelido.
- Prévia de dados externos por IA via OpenRouter, com confirmação antes da importação.
- Painel administrativo protegido por login e senha. Alunos não precisam de cadastro.

## Requisitos

Node.js 20 ou superior e npm. Para persistência remota: instância Insforge e chave administrativa da própria instância. Para análise IA: conta OpenRouter com chave e modelo habilitado.

## Instalação

```powershell
npm install --cache .npm-cache
Copy-Item .env.example .env
```

Preencha `.env` com:

| Variável | Uso |
|---|---|
| `LOGIN_ADMIN` / `PASSWORD_ADMIN` | Acesso ao painel do professor |
| `SESSION_SECRET` | Assinatura das sessões; use uma frase aleatória longa em produção |
| `PORT` | Porta da API; padrão 3001 |
| `APP_ORIGIN` | Endereço público do aplicativo |
| `PROJECT_URL` ou `INSFORGE_BASE_URL` | URL base da instância Insforge |
| `INSFORGE_ADMIN_API_KEY` | Chave administrativa da instância, usada **somente pelo servidor** |
| `OPENROUTER_API_KEY` | Chave para análise de ranking |
| `OPENROUTER_MODEL` | Identificador do modelo OpenRouter |

`INSFORGE_API_KEY` com prefixo `uak_` não foi aceito pela API de banco da instância testada. A chave `ik_` da instalação MCP funcionou na rota administrativa oficial. A chave pública `ISNFORGE_ANON_KEY` existente no ambiente não é usada pelo backend, pois a tabela tem RLS ativo e nenhum acesso público.

### Banco Insforge

O arquivo [server/schema.sql](server/schema.sql) cria a tabela `cucando_records` e ativa RLS sem políticas públicas. Execute uma vez como migração no Insforge. O adaptador do servidor usa a [API REST oficial de banco](https://docs.insforge.dev/sdks/rest/database), pela rota administrativa de SQL com parâmetros. Jogos, resultados e importações são armazenados em JSONB. Sem URL/chave/tabela acessível, a aplicação usa `.data/records.json` localmente e informa o modo no console e em `/api/health`.

No ambiente configurado durante a construção, a migração `20261013000100` já foi aplicada com sucesso e a leitura anônima da tabela retornou lista vazia, enquanto a leitura e escrita administrativas funcionaram.

## Executar

Desenvolvimento, com Vite em `http://localhost:5173` e API em `http://localhost:3001`:

```powershell
npm run dev
```

Versão compilada, servida pelo Node.js em `http://localhost:3001`:

```powershell
npm run build
npm start
```

- Painel: `/`
- Entrada do aluno: `/jogar`
- Saúde da API: `/api/health`

O jogo de demonstração **Demo · Fundamentos de IA Generativa** foi salvo na instância configurada para verificar a persistência.

## Como conduzir uma partida

1. Entre no painel, crie ou edite um jogo em **Meus jogos**.
2. Clique em **Iniciar sala** e compartilhe o PIN de seis dígitos.
3. Os alunos abrem `/jogar`, inserem o PIN e escolhem um apelido. O avatar é atribuído automaticamente.
4. No lobby, clique em **Começar jogo**. Em quiz, revele a resposta e avance pelas perguntas; em matching, encerre quando a turma terminar.
5. Consulte o pódio, o histórico e o ranking.

## Testes

```powershell
npm test
npm run build
```

Os testes cobrem cálculo de pontos, proteção do gabarito, apelido duplicado, duplicação, PDF e fluxo de API com sala, resposta, resultado e ranking.

## Segurança e limites atuais

- `.env` está no `.gitignore`; nunca envie chaves ao frontend ou ao repositório.
- O PIN e o estado da sala vivem na memória do processo Node.js. Reiniciar o servidor encerra salas ativas. Para várias instâncias, use um armazenamento compartilhado e pub/sub.
- O ranking soma resultados pelo **apelido** normalizado. Alunos distintos com o mesmo apelido em datas diferentes podem aparecer como uma pessoa; combine uma convenção de apelidos com a turma.
- Use HTTPS e `SESSION_SECRET` dedicado ao publicar. O cookie administrativo passa a usar `Secure` quando a requisição chega por HTTPS.
- Os dados enviados à análise IA são transmitidos ao OpenRouter. Revise e evite dados pessoais desnecessários.
- A análise aceita texto colado ou arquivo `.txt`, `.csv`, `.json` e `.md` até 200 KB. PDF e imagem exigem extração prévia do texto.

© 2026 Cucando TI · Todos os direitos reservados.
