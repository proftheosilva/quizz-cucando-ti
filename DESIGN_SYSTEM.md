# Design System inicial — Quiz Cucando TI

## Direção visual
As três propostas compartilham tipografia legível, cartões claros de ação, espaços generosos e quatro formas de resposta distinguíveis também por texto/ícone. A opção escolhida definirá os tokens finais.

| Proposta | Professor | Aluno | Uso recomendado |
|---|---|---|---|
| 01 Arena clara | Superfície clara e navegação violeta | Sala roxa imersiva | Equilíbrio entre operação e jogo |
| 02 Estúdio lúdico | Amarelo quente e contornos marcados | Blocos vibrantes | Maior energia visual |
| 03 Laboratório neon | Azul petróleo escuro e turquesa | Sala tecnológica | Aulas de tecnologia e projeção |

## Tokens preliminares
- **Marca:** laranja `#FF792E`, amarelo `#F8C945`, violeta `#5521AD`, turquesa `#53E3D1`, tinta `#17202F`.
- **Espaçamento:** escala 4, 8, 12, 16, 24, 32 e 48 px.
- **Raios:** 10 px em controles, 17 px em cartões, 26 px em painéis de destaque.
- **Tipografia:** fonte de sistema até definição final; corpo mínimo 16 px nas telas de jogo; títulos fluidos de 24 a 38 px.
- **Botões:** alvo mínimo de 44 × 44 px, estados padrão, foco, desabilitado, carregando e erro.

## Componentes previstos
Cabeçalho, navegação lateral, cartão de dinâmica, construtor de pergunta, opção de resposta, seletor de tempo, lobby com PIN, cartão de avatar, cronômetro, placar, pódio, tabela de histórico, diálogo de confirmação e prévia de importação IA.

## Responsividade e acessibilidade
Professor: navegação lateral no desktop e barra compacta no celular. Aluno: entrada e resposta em coluna única no celular, quatro opções em grade quando houver espaço. Não depender apenas de cor para indicar alternativa ou correção; usar forma, ícone e texto. Garantir contraste, foco visível, ordem de tabulação, rótulos, mensagens `aria-live` para mudanças de fase e opção de reduzir movimento.

## Uso do logo
Os logos claro/escuro anexados orientam o cabeçalho e a tela de entrada. Na implementação, incluir cópias otimizadas dentro do projeto após a proposta escolhida; preservar proporção e margem de respiro. O wireframe usa uma marca tipográfica provisória.
