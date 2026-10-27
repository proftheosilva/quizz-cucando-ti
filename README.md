# Quiz Cucando TI

Plataforma de gamificação educacional para turmas presenciais. O professor cria quizzes e jogos de associação, abre uma sala com PIN e acompanha os alunos em tempo real. A interface segue a proposta aprovada **02 · Estúdio lúdico**.

## Funcionalidades

- Editor de quiz com escolha simples ou múltipla, imagem por URL, tempo, pontos e penalidade por erro.
- Importação de perguntas de PDF com texto selecionável ou OCR em português para páginas escaneadas, prévia editável e revisão antes de salvar. O parser reconhece cabeçalhos como `FÁCIL 01/10`, `QUESTÃO 01`, `1. Enunciado` e `01 [Fácil]`, alternativas A–F, marcadores `[CORRETA]` ou `CORRETA` após a alternativa, e gabaritos por questão ou gerais.
- Marcadores de resposta correta são removidos do texto das alternativas. Quando o gabarito está ausente ou ambíguo, o professor escolhe a resposta na prévia; o parser não inventa uma opção correta.
- Revelação opcional da imagem após a resposta, duplicação de jogos e exportação em PDF.
- Botão **Remover** nos cartões de jogos da página inicial e de **Meus jogos**, com confirmação.
- Matching game de conceitos com pontuação por acerto e perda por tentativa incorreta.
- Trilha chiptune procedural durante a dinâmica na tela do professor, com controle de volume e ligar/desligar, e vinhetas curtas de suspense sincronizadas à revelação do pódio. O aluno também pode ajustar ou silenciar os sons.
- Sala ao vivo com PIN de seis dígitos, apelido e avatar escolhido pelo aluno ou sorteado. Um avatar escolhido fica reservado para aquela sala; o servidor impede escolhas duplicadas mesmo se dois alunos entrarem ao mesmo tempo.
- Modo quiz inspirado no Kahoot: o professor lê o enunciado e as alternativas; no dispositivo do aluno aparecem somente as cores e formas. Um toque envia uma resposta simples automaticamente. Em questões de seleção múltipla, as escolhas são enviadas automaticamente 1,1 segundo após o último toque.
- Contagem regressiva grande e sincronizada com o relógio do servidor na tela do professor e do aluno; fica vermelha quando restam 10 segundos ou menos.
- Revelação do pódio em sequência, ao longo de cerca de 7 segundos: bronze com pontuação, depois avatar e apelido; em seguida prata e ouro. Ao terminar a revelação do ouro, confetes caem sobre o pódio. A preferência do dispositivo por movimento reduzido é respeitada.
- Revelação automática quando todos respondem ou o tempo termina, com gráfico de barras por alternativa nas telas do professor e do aluno.
- Análise pedagógica por turma, disciplina e intervalo de datas, com aproveitamento da turma, cobertura de respostas, evolução temporal e resultados individuais em sinalização normal/atenção/perigo. Inclui tendências por questão, registro de conteúdo retomado e exportação para CSV ou impressão/PDF.
- Cadastro de alunos por turma e disciplina. Na entrada, cada aluno informa um apelido para a dinâmica e seleciona seu nome cadastrado; apelidos ficam visíveis durante a partida e o nome cadastrado identifica o aluno no pedagógico. Registros antigos sem vínculo continuam legíveis pelo apelido.
- Controles de acessibilidade para ampliar texto, alto contraste e preferência de volume/áudio na tela do aluno.
- Ranking acumulado por pontos mantido como classificação competitiva separada dos indicadores de aprendizagem.
- Remoção de sala pelo menu e botão para zerar o ranking, ambos com confirmação.
- Prévia de dados externos por IA via OpenRouter, com confirmação antes da importação.
- Painel administrativo com contas individuais de professor. Somente a conta administrativa original pode usar **Adicionar professor** no rodapé da barra lateral e cadastrar docentes; as demais contas não veem essa opção e a API também bloqueia a tentativa. Cada docente acessa seu próprio espaço de jogos, turmas, alunos, salas, resultados, importações e ranking. Senhas de novas contas são armazenadas com hash scrypt; cada professor também pode alterar a própria senha. Alunos não precisam de conta.

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
| `SESSION_SECRET` | Assinatura das sessões; use um segredo aleatório longo em produção |
| `PORT` | Porta da API; padrão 3001 |
| `APP_ORIGIN` | Endereço público do aplicativo |
| `PROJECT_URL` ou `INSFORGE_BASE_URL` | URL base da instância Insforge |
| `INSFORGE_ADMIN_API_KEY` | Chave administrativa da instância, usada **somente pelo servidor** |
| `OPENROUTER_API_KEY` | Chave para análise de ranking |
| `OPENROUTER_MODEL` | Identificador do modelo OpenRouter |

`INSFORGE_API_KEY` com prefixo `uak_` não foi aceito pela API de banco da instância testada. A chave `ik_` da instalação MCP funcionou na rota administrativa oficial. A chave pública `ISNFORGE_ANON_KEY` existente no ambiente não é usada pelo backend, pois a tabela tem RLS ativo e nenhum acesso público.

### Banco Insforge

O arquivo [server/schema.sql](server/schema.sql) cria a tabela `cucando_records` e ativa RLS sem políticas públicas. Em bancos existentes, aplique [20261014000100_active_rooms.sql](server/migrations/20261014000100_active_rooms.sql), [20261014000200_classes_analytics.sql](server/migrations/20261014000200_classes_analytics.sql), [20261014000300_roster_and_reviews.sql](server/migrations/20261014000300_roster_and_reviews.sql) e [20261027000100_teacher_accounts.sql](server/migrations/20261027000100_teacher_accounts.sql). A última migração habilita o tipo de registro `teacher` e garante e-mail único. O adaptador usa a [API REST oficial de banco](https://docs.insforge.dev/sdks/rest/database), pela rota administrativa de SQL com parâmetros. Jogos, resultados, importações, catálogo, alunos, retomadas, professores e snapshots de salas ativas são armazenados em JSONB. Sem URL/chave/tabela acessível, a aplicação usa `.data/records.json` localmente e informa o modo no console e em `/api/health`.

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

Também há o quiz de demonstração **Quiz de Exemplo · Cultura Digital**, com três perguntas. A partida simulada com quatro jogadores está registrada no histórico e seus pontos aparecem no ranking.

## Como conduzir uma partida

1. Em **Pedagógico**, cadastre as turmas e as disciplinas. Em **Meus jogos**, crie ou edite uma dinâmica e associe-a à turma/disciplina corretas.
   Para aproveitar um PDF, clique em **Enviar PDF**, confira a prévia e adicione as perguntas ao editor. Marque manualmente o gabarito quando a extração não o identificar.
2. Clique em **Iniciar sala** e compartilhe o PIN de seis dígitos.
3. Os alunos abrem `/jogar`, inserem o PIN, escolhem um apelido, selecionam seu nome cadastrado quando solicitado e podem escolher um avatar ainda livre naquela sala ou deixar o sorteio automático.
4. No lobby, clique em **Começar jogo**. Durante um quiz, o professor lê as perguntas na tela principal; no celular do aluno aparecem apenas as cores e formas. Um toque envia a resposta simples. Para uma pergunta de seleção múltipla, o aluno toca em todas as cores desejadas e o envio acontece automaticamente após 1,1 segundo sem novos toques. O relógio grande fica vermelho nos últimos 10 segundos. Depois que todos respondem ou o tempo termina, o gráfico aparece para o professor; avance à próxima pergunta. Em matching, encerre quando a turma terminar.
5. No fim, acompanhe a animação do pódio: primeiro o terceiro lugar (bronze), depois o segundo (prata) e por último o primeiro (ouro). Em cada etapa aparecem primeiro os pontos e depois o avatar e o apelido. Após a revelação do ouro, confetes celebram os vencedores. Os demais participantes aparecem na classificação logo abaixo.
6. Em **Pedagógico**, analise aproveitamento, cobertura de respostas, evolução da turma ou de um aluno e resultados por disciplina e período. O ranking de pontos permanece abaixo dos indicadores pedagógicos.

Ao encerrar, o aluno pode clicar em **Entrar com outro PIN**. Atualizar `/jogar` depois do fim também retorna à entrada do PIN.

### Contas docentes e segurança


No rodapé da barra lateral, a conta administrativa original vê **Adicionar professor**, que abre um formulário com nome completo, e-mail, senha e confirmação. Somente essa conta pode cadastrar docentes; o servidor impõe a restrição mesmo que alguém tente chamar a API diretamente. Senhas têm pelo menos 12 caracteres e são armazenadas com scrypt. A nova conta pode entrar com o e-mail e administrar seu espaço separado. Cada docente também pode usar **Alterar senha**, informar a senha atual e escolher uma nova; as sessões administrativas são invalidadas após a alteração.

**Remover sala** desconecta os participantes e descarta pontos ainda não salvos. **Zerar ranking** apaga permanentemente o histórico de sessões e as importações de pontos, mas preserva os jogos. A limpeza exige que não haja sala ativa.

## Testes

```powershell
npm test
npm run build
```

Os testes cobrem cálculo de pontos, proteção do gabarito, apelido duplicado, duplicação, formatos de importação de PDF com texto e OCR, marcadores e gabaritos, remoção de sala, limpeza de ranking e fluxo de API.

## Segurança e limites atuais

- `.env` está no `.gitignore`; nunca envie chaves ao frontend ou ao repositório.
- Cada registro de jogos, turmas, alunos, salas, sessões, importações e anotações é filtrado pelo identificador do professor autenticado. Registros antigos sem `ownerId` continuam no espaço da conta administrativa original.
- O ranking soma pontos pelo **apelido** normalizado. A análise longitudinal nova agrupa o HMAC do código de aluno, separado por turma; sessões antigas usam apelido e podem misturar alunos homônimos.
- O aproveitamento é acertos sobre questões/pares possíveis; itens sem resposta contam como não acertados. A cobertura informa quantas oportunidades receberam resposta. Matching conta um par correto se o aluno o resolveu corretamente, mesmo após uma tentativa incorreta.
- O aproveitamento é um indicador de aprendizagem e exige interpretação docente; isoladamente não demonstra causa ou eficácia do ensino.
- Use HTTPS e `SESSION_SECRET` dedicado ao publicar. O cookie administrativo passa a usar `Secure` quando a requisição chega por HTTPS.
- Os dados enviados à análise IA são transmitidos ao OpenRouter. Revise e evite dados pessoais desnecessários.
- A análise de ranking com IA aceita texto colado ou arquivo `.txt`, `.csv`, `.json` e `.md` até 200 KB. A importação de perguntas por PDF é uma função separada e local do servidor, limitada a 10 MB e 20 páginas.

© 2026 Cucando TI · Todos os direitos reservados.

## Implantação isolada na VPS Cucando TI

O Quiz é instalado em `/home/devuser/apps/quiz-cucando-ti`, em processo PM2 próprio (`quiz-cucando-ti`) e porta 3101, separado do AzuraCast e da aplicação da rádio (porta 3000). O servidor escuta em `172.18.0.1`, gateway interno da rede Docker usada pelo Nginx; a porta do Quiz não fica publicada diretamente na interface pública da VPS. O acesso público usa HTTPS em `https://quizz.cucandoti.com.br`, com o Nginx como proxy reverso.

O arquivo `.env.example` enumera os nomes das variáveis. Os valores secretos do `.env` local não fazem parte do GitHub porque `.env` é ignorado pelo Git. Transfira o arquivo por SCP/SFTP ou preencha-o diretamente na VPS; não copie segredos para `.env.example` nem para o repositório.

```bash
cd /home/devuser/apps/quiz-cucando-ti
cp .env.example .env
chmod 600 .env
nano .env
npm ci
npm test
npm run build
pm2 start ecosystem.config.cjs --only quiz-cucando-ti
pm2 save
```

Antes de iniciar, substitua os valores de demonstração de `LOGIN_ADMIN`, `PASSWORD_ADMIN` e `SESSION_SECRET` por valores fortes. Configure `INSFORGE_BASE_URL` e `INSFORGE_ADMIN_API_KEY` para manter os dados no banco remoto. Sem eles, o app usa `.data/records.json` local. Configure a chave/modelo OpenRouter apenas se for usar importação assistida por IA. O modo `HOST=172.18.0.1` e `PORT=3101` vem do arquivo PM2 de produção.

O app mantém uma cópia em memória das salas para operação em tempo real e salva cada alteração no armazenamento; salas não finalizadas são restauradas após reinício. Mantenha `instances: 1`, pois ainda não há coordenação entre instâncias. `/api/health` deve informar armazenamento `insforge` quando a conexão ao banco estiver correta. Para verificar a API localmente no host: `curl http://172.18.0.1:3101/api/health`.

Antes de publicar em um banco Insforge já existente, execute também `server/migrations/20261027000100_teacher_accounts.sql` no editor SQL para permitir contas de professor. A migração não altera os registros existentes; eles permanecem no espaço legado da conta administrativa. Em seguida, publique o código e reinicie o PM2 quando não houver uma aula ativa. A inicialização restaura salas que já tenham sido salvas.

Para publicar alterações, rode os testes e gere os arquivos de produção antes de reiniciar o serviço:

```bash
npm test
npm run build
pm2 restart quiz-cucando-ti --update-env
pm2 save
```

Após aplicar a migração e publicar esta versão, reiniciar o processo restaura as salas que já foram persistidas. A publicação inicial ainda exige uma janela sem aula ativa, pois a versão anterior mantinha as salas apenas em memória. Para mudanças somente na interface, o `npm run build` atualiza os arquivos estáticos sem exigir reinício do Node; para alterações no backend, reinicie o PM2 depois de preparar a migração.
