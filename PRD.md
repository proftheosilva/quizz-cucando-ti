# PRD inicial — Quiz Cucando TI

**Estado:** proposta para validação visual e funcional · 13/10/2026.

## Objetivo
Oferecer ao professor uma plataforma própria de dinâmicas educacionais ao vivo, com quiz, matching, histórico de pontuação e ranking acumulado. Alunos entram com PIN e apelido, sem cadastro prévio.

## Pessoas e jornadas
- **Professor:** entra no painel, cria uma dinâmica, configura regras, abre a sala, acompanha respostas, revela resultados, encerra e consulta o histórico.
- **Aluno:** informa PIN, escolhe apelido, recebe avatar aleatório, responde no próprio dispositivo e vê feedback, pontuação e pódio.

## Escopo funcional
1. **Quiz:** perguntas com imagem opcional, escolha única ou múltipla, tempo por pergunta, pontos por acerto e penalidade configurável por erro; revelação da resposta, placar e pódio.
2. **Matching:** pares de conceitos, cronômetro e pontuação baseada em conclusão, tempo e tentativas.
3. **Salas:** PIN único e temporário, lobby, entrada de participantes, início e avanço controlados pelo professor, reconexão e encerramento.
4. **Histórico:** resultado por apelido, dinâmica e data; ranking geral acumulado e detalhamento da origem dos pontos.
5. **Análise IA:** o administrador cola ou envia dados de outras dinâmicas; visualiza a interpretação e confirma a importação antes de alterar o ranking.
6. **Administração:** login e senha, criação, edição, duplicação, publicação e arquivamento de jogos.

## Critérios de aceite principais
- Um aluno consegue entrar apenas com PIN válido e apelido; apelidos duplicados na mesma sala recebem aviso.
- O servidor define tempo, correção e pontuação; clientes não podem atribuir pontos a si mesmos.
- Queda breve de conexão permite retorno à sala sem duplicar a pontuação.
- Histórico mostra pontos ganhos e perdidos por rodada e a soma do ranking.
- Importação por IA exige revisão humana e registra fonte, data e decisão.
- O painel e o jogo funcionam em celular e desktop, com teclado, foco visível e avisos legíveis por tecnologia assistiva.

## Decisões pendentes para validação
- Proposta visual escolhida entre 01, 02 e 03.
- Fórmula exata de pontuação e limite de perda por erro.
- Regra de identidade para o mesmo apelido em datas diferentes; a associação por apelido isolado pode reunir pessoas distintas.
- Formatos aceitos na importação externa e política de correção de lançamentos.

## Fora do primeiro ciclo
Cadastro prévio de alunos, pagamentos, múltiplos administradores, aplicativos nativos e integração automática com plataformas externas.
