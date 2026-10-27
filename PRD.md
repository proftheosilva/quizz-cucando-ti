# PRD inicial — Quiz Cucando TI

**Estado:** funcional em produção · contas docentes isoladas e modo quiz Kahoot · 27/10/2026.

## Objetivo
Oferecer a cada professor um espaço isolado para dinâmicas educacionais ao vivo, com quiz, matching, histórico de pontuação, ranking acumulado e análise pedagógica por turma, disciplina, período e aluno. Alunos entram com PIN e apelido; dinâmicas associadas a turma também pedem um código de aluno estável.

## Pessoas e jornadas
- **Professor:** entra com sua conta, cria turmas e dinâmicas próprias, abre a sala, acompanha respostas e tempo, encerra e consulta somente seus resultados.
- **Aluno:** informa PIN, escolhe apelido e avatar ainda livre na sala (ou sorteio), responde por cores e formas sem ver o enunciado no aparelho e vê feedback, pontuação e pódio.

## Escopo funcional
1. **Quiz:** perguntas com imagem opcional, escolha única ou múltipla, tempo por pergunta, pontos por acerto e penalidade configurável por erro; o enunciado e as alternativas completas ficam na tela do professor. O aluno responde por cores e formas, com envio automático e contagem regressiva compartilhada.
2. **Matching:** pares de conceitos, cronômetro e pontuação baseada em conclusão, tempo e tentativas.
3. **Áudio de jogo:** trilha chiptune opcional durante a sala na tela do professor e vinheta sintetizada antes das revelações do pódio; áudio inicia após gesto explícito do usuário, conforme as regras do navegador.
4. **Salas:** PIN único e temporário, lobby, entrada de participantes, início e avanço controlados pelo professor, reconexão e encerramento.
5. **Histórico e análise:** resultado por dinâmica e data; cada jogo pertence a uma turma e disciplina. O painel mostra aproveitamento, cobertura de respostas, evolução da turma/aluno e itens com menor acerto para orientar retomadas.
6. **Análise IA:** o administrador cola ou envia dados de outras dinâmicas; visualiza a interpretação e confirma a importação antes de alterar o ranking.
7. **Administração:** contas individuais de professor com nome, e-mail e senha; cada conta mantém jogos, turmas, alunos, salas e histórico isolados. A administração de contas existentes pode cadastrar docentes adicionais.

## Critérios de aceite principais
- Um aluno consegue entrar apenas com PIN válido e apelido; apelidos duplicados na mesma sala recebem aviso.
- Avatares são únicos por sala; o servidor resolve concorrência e rejeita uma escolha já ocupada.
- Em quiz, o payload enviado ao aluno não contém enunciado nem texto das alternativas, inclusive depois da revelação; um clique envia a opção simples. Questões múltiplas enviam após pausa curta na seleção, sem botão.
- Relógio em tamanho grande nas duas telas usa o instante de abertura do servidor e sinaliza em vermelho os últimos dez segundos.
- Professores só leem e alteram dados vinculados à própria conta; senhas são armazenadas como hash e nunca retornadas pela API.
- O servidor define tempo, correção e pontuação; clientes não podem atribuir pontos a si mesmos.
- Queda breve de conexão permite retorno à sala sem duplicar a pontuação.
- Histórico mostra pontos ganhos e perdidos por rodada e a soma do ranking.
- Importação por IA exige revisão humana e registra fonte, data e decisão.
- O painel e o jogo funcionam em celular e desktop, com teclado, foco visível e avisos legíveis por tecnologia assistiva.
- Códigos de aluno não são armazenados em texto: a aplicação persiste HMAC protegido por segredo da turma; histórico anterior continua consultável por apelido e é sinalizado como legado.
- Aproveitamento mede itens corretos divididos pelas oportunidades totais; não respondidos contam como incorretos. Cobertura de resposta é mostrada separadamente.

## Decisões pendentes para validação
- Proposta visual escolhida entre 01, 02 e 03.
- Fórmula exata de pontuação e limite de perda por erro.
- Cadastro prévio opcional de alunos/roster para medir presença sobre o total matriculado.
- Formatos aceitos na importação externa e política de correção de lançamentos.

## Fora do primeiro ciclo
Pagamentos, aplicativos nativos e integração automática com plataformas externas.
