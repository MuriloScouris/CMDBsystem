# 🚀 ITAM CMDB - Portal de Gestão de Ativos

**Versão Documentada:** 1.0 (MVP Oficial)
**Data de Apresentação:** Março / 2026

---

## 📌 1. Visão Geral da Solução

O **ITAM CMDB** (*Configuration Management Database*) é uma ferramenta proprietária e sob medida desenvolvida para solucionar gargalos de auditoria, controle de estoque e rastreabilidade dos equipamentos e ativos de Tecnologia da Informação (ITAM).

O sistema proporciona à equipe de T.I. uma gestão ultra fluida, rápida e sem burocracias pesadas, ao mesmo tempo em que **garante automação de compliance** atrelando 100% de mudanças nos hardwares diretamente a aberturas automáticas de chamados na ferramenta oficial de Tickets corporativa: o **Atlassian Jira Service Desk**.

---

## 🛠️ 2. Arquitetura e Tecnologias

A aplicação foi montada sobre um ecossistema incrivelmente leve para rodar de forma local ou num servidor interno isolado, garantindo facilidade extrema no deploy e manutenção mínima:

*   **Front-end:** HTML, CSS (Design System customizado do zero) e Vanilla JavaScript sem frameworks externos pesados.
*   **Back-end:** Node.js com Express.
*   **Banco de Dados:** PostgreSQL (`core_cmdb`) garantindo solidez nas chaves relacionais (Foreign Keys) para garantir que peças do histórico não se percam caso máquinas mudem infinitamente de dono.
*   **Mensageria e Integração:** Jira REST API V3 (Service Desk API).

---

## 🧩 3. Módulos & Funcionalidades

O portal hoje é dividido nas seguintes frentes perfeitamente funcionais:

### 💻 3.1. Inventário Físico (Ponto de Controle de Equipamentos)
Espaço central com dashboards gerenciais. Onde a mágica acontece. A lista exibe rapidamente a placa de identificação (tag de patrimônio), o hardware exato, a matrícula de uso atual e o status de vida do aparelho (Em Estoque, Em Uso, Em Manutenção, Em Atraso). O sistema permite a gestão ativa de tudo (foco principal).
*   **Abertura Rápida de Detalhes:** Painel que escorrega para a direita extraindo logs e ciclo de vida.

### 🏭 3.2. Catálogo de Modelos (Padrões)
Ao invés de cadastrar textualmente o processador ou a memória dezenas de vezes a cada desktop montado, o usuário primeiro constrói Modelos base. Assim que um Hardware entra pro Estoque, você apenas escolhe o Padrão "Latitude 5430" que toda a arquitetura física já entra atrelada.

### 👥 3.3. Relatórios Gerenciais (Auditoria Visual)
Uma das estrelas do projeto: uma matriz focada "Pessoa por Pessoa". Apresentando exatamente o setor e todos os elementos de TI em posse simultaneamente com aquele CPF.
*   **Mapa Estrutural de Responsabilidade:** Um modal visual (em árvore) que consolida a arquitetura de ferramentas para cada colaborador (permitindo pular da pessoa pro próprio aparelho com 1 clique).
*   *Pronto para o Próximo Passo:* Coluna com o gatilho "Gerar Termo de Posse" já posicionada e separada.

### 🗑️ 3.4. Máquinas Excluídas (Segurança)
Exclusão Lógica. Máquinas obsoletas, devolvidas para consertos perdidos com as fábricas, nunca são apagadas e sim escondidas. A área resguarda e possibilita as ressurreições lógicas.

---

## ⚡ 4. A Integração com o Jira (*O Diferencial do Sistema*)

Qualquer ação dentro da plataforma está baseada na "Auditoria de Fechamento de Ciclo". No mundo corporativo, se a T.I entregou um mouse... existe a necessidade de haver um chamado documentando quando, por que, de quem era, para quem foi. 

Essa burocracia custosa sumiu com a arquitetura do ITAM CMDB. 

**Sistema de "Intenção em Fila" (Offline-First para Chamados)**:
Quando você movimenta ou cria uma máquina no portal, a instrução não vai parar o app (loading infinito) rodando uma API demorada lá nos EUA na Atlassian.
Ao invés disso:
1.  Ele faz a alteração instantânea no próprio banco (PostgreSQL).
2.  Adiciona de fininho um registro na Tabela de Fila (`jira_queue`).
3.  O botão verde da barra lateral começa a contar e avisar: **"☁️ Sincronizar Jira (1 pendência)"**.

Dessa forma, a T.I realiza 45 movimentações pesadas fisicamente na sala de infra e, ao sentar na cadeira e com o portal organizado, aperta para sincronizar as intenções. O Node.js ataca a API oficial convertendo em milissegundos tudo num chamado real no Service Desk 11 -> Forms 100 de Hardware. Total segurança e velocidade de interface.

---

## 🎨 5. Identidade Visual 
Toda a plataforma foi construída sem utilizar bibliotecas visuais engessadas, permitindo a adoção minuciosa de tokens de design modernos:
- Adoção de variantes cromáticas para menu, profundidade, realce dos campos em modal e sombreamentos.
- Destaques, botões e marcações com tons vibrantes, elevando a percepção real de uma robusta ferramenta corporativa.

---

## 🔮 6. Roadmap Imediato e Próximos Passos
1. **Termo de Devolução e Posse Automático:** Transformar a interface de Termos (já visivelmente implantada no relatório) num gerador de PDFs assináveis ou que notifique o Service Desk para assinatura sistêmica do requerente.
2. **Módulo 'Licenças de Software':** Espelhar as práticas atuais dos equipamentos físicos para assinaturas na nuvem.
3. **Módulo de Relatórios Globais em Excel:** Habilitar as Exportações de Visão Geral em formato compatível para BI e planilhas corporativas.
