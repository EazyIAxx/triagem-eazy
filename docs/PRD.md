# PRD — Triagem Eazy

## 1. Contexto & Problema

Atualmente, pacientes classificados com baixa urgência (prioridade verde) precisam comparecer presencialmente ao hospital para realizar cadastro, abertura da ficha e triagem inicial. Esse processo gera filas desnecessárias, aumenta o tempo de permanência na unidade de saúde, contribui para a superlotação das recepções e expõe pacientes a ambientes com maior risco de contaminação.

Além disso, grande parte do tempo de espera desses pacientes ocorre antes mesmo do atendimento médico, reduzindo a eficiência do fluxo hospitalar e impactando negativamente a experiência do paciente.

A ausência de uma solução que permita a realização do cadastro e da triagem preliminar de forma remota impede que o hospital organize melhor sua fila de atendimento e que o paciente permaneça em casa durante o período de espera, deslocando-se para a unidade apenas quando estiver próximo do momento de ser atendido.

### Impactos do problema

- Aumento da superlotação em recepções e salas de espera.
- Longos períodos de espera dentro do hospital para casos de baixa urgência.
- Maior risco de exposição a doenças infecciosas.
- Sobrecarga das equipes responsáveis pelo cadastro e acolhimento.
- Baixa previsibilidade para pacientes e profissionais sobre o fluxo de atendimento.
- Experiência do paciente prejudicada devido ao tempo de espera e à falta de transparência sobre sua posição na fila.

## 2. Proposta de Solução

Desenvolver uma plataforma SaaS que permita aos pacientes classificados como casos de baixa urgência (fita verde) realizar o cadastro e uma triagem inicial de forma remota, antes de se deslocarem até a unidade de saúde.

Por meio de um aplicativo ou interface web, o paciente poderá informar seus dados pessoais, convênio (quando aplicável), sintomas e responder a um questionário de triagem padronizado. Essas informações serão enviadas para o sistema do hospital, permitindo que a equipe valide o atendimento e organize a fila de forma antecipada.

Após a conclusão da triagem, o paciente acompanhará, em tempo real, sua posição na fila e uma estimativa de tempo para atendimento. Quando sua consulta estiver próxima, o sistema enviará uma notificação solicitando seu deslocamento até a unidade de saúde, reduzindo significativamente o tempo de permanência no hospital.

A plataforma também disponibilizará um painel para a equipe hospitalar, permitindo acompanhar a fila de pacientes, revisar informações da triagem, atualizar o status dos atendimentos e gerenciar o fluxo de forma centralizada.

### Objetivos da Solução

- Reduzir a superlotação nas recepções e salas de espera.
- Diminuir o tempo de permanência de pacientes de baixa urgência dentro da unidade de saúde.
- Melhorar a experiência do paciente, oferecendo maior previsibilidade sobre o atendimento.
- Otimizar o fluxo operacional da equipe de recepção e triagem.
- Reduzir a exposição de pacientes a ambientes hospitalares enquanto aguardam atendimento.
- Aumentar a eficiência na gestão da fila de atendimento por meio da digitalização do processo de cadastro e triagem.

### Benefícios Esperados

**Para os pacientes**
- Cadastro e triagem realizados de qualquer lugar.
- Acompanhamento da fila em tempo real.
- Menor tempo de espera presencial.
- Mais conforto e segurança durante a espera.

**Para os hospitais**
- Redução da lotação em áreas de espera.
- Melhor organização do fluxo de atendimento.
- Menor carga operacional para recepção e triagem.
- Maior eficiência na utilização dos recursos da unidade.
- Dados centralizados e digitalizados para apoio à gestão e tomada de decisão.

## 3. Requisitos Funcionais

Infraestrutura geral de produto:

- Login e Autenticação
- Landing Page
- Dashboards
- Multi usuário
- Upload de Arquivos
- Notificações
- Calendário
- Integrações (API)
- Relatórios e Exportação
- Permissões por usuário
- Chat / Mensagens
- Busca e Filtros
- Onboarding do Usuário

### 3.1 Cadastro de Pacientes
- Cadastro com dados pessoais.
- Validação de informações obrigatórias.
- Histórico de atendimentos anteriores.

### 3.2 Pré-Triagem Online
- Questionário de sintomas.
- Registro da queixa principal.
- Envio das informações para a equipe do hospital.

### 3.3 Gerenciamento da Fila
- Entrada automática do paciente na fila após aprovação.
- Atualização da posição em tempo real.
- Estimativa de tempo de espera.

### 3.4 Notificações
- Aviso quando o cadastro for aprovado.
- Alerta para o paciente se dirigir ao hospital.
- Atualizações sobre mudanças no status do atendimento.

### 3.5 Painel do Profissional de Saúde
- Visualização da fila de pacientes.
- Consulta das informações enviadas na pré-triagem.
- Atualização do status do atendimento (ex.: Em análise, Chamado, Em atendimento, Finalizado).

### 3.6 Dashboard Administrativo
- Gerenciamento de usuários.
- Configuração do fluxo de atendimento.
- Visualização de métricas como:
  - Número de pacientes na fila.
  - Tempo médio de espera.
  - Atendimentos realizados.

### 3.7 Autenticação e Segurança
- Login seguro.
- Controle de acesso por perfil.
- Proteção dos dados dos pacientes.

### 3.8 Funcionalidades Futuras (Backlog)

Fora do MVP, mas fazem parte da visão de produto:

- Integração com sistemas hospitalares (HIS/Prontuário Eletrônico).
- Chat entre paciente e hospital.
- Upload de documentos e exames.
- Compartilhamento de localização para estimativa de chegada.
- Check-in automático ao chegar ao hospital.
- Avaliação do atendimento.
- Integração com WhatsApp para notificações.
- Teleorientação antes do deslocamento.
- Relatórios avançados para gestão hospitalar.
- Integração com convênios e planos de saúde.

## 4. Personas de Usuário

| Tipo de Usuário | Responsabilidades |
| --- | --- |
| **Paciente** | Realizar cadastro, responder à triagem, acompanhar a fila e receber notificações sobre o atendimento. |
| **Profissional de Saúde** | Visualizar pacientes, acessar as informações da triagem, atualizar o status do atendimento e registrar observações quando necessário. *(Perfil usado tanto por recepcionistas quanto por enfermeiros e médicos no MVP.)* |
| **Administrador** | Gerenciar usuários, configurar o hospital, acompanhar a fila e visualizar indicadores e relatórios do sistema. |

## 5. Stack Técnica

### Stack de referência
- Next.js
- React
- Tailwind CSS
- shadcn/ui
- Supabase
- Vercel
- tRPC
- Prisma
- TypeScript
- PostgreSQL
- Claude Code
- Node.js
- Resend (e-mails)

### Detalhamento por camada

**Front-end**
- React – construção da interface do usuário.
- Next.js – framework para React com roteamento, renderização otimizada e melhor desempenho.
- TypeScript – tipagem estática para maior segurança e manutenção do código.
- Tailwind CSS – estilização rápida e responsiva.

**Back-end**
- Node.js – ambiente de execução do servidor.
- NestJS – framework estruturado para criação de APIs escaláveis.
- TypeScript – linguagem utilizada em todo o backend.

**Banco de Dados**
- PostgreSQL – banco de dados relacional para armazenar pacientes, filas e atendimentos.
- Prisma ORM – mapeamento entre a aplicação e o banco de dados.

**Autenticação**
- JWT (JSON Web Token) – autenticação baseada em tokens.
- bcrypt – criptografia de senhas.

**Notificações**
- Firebase Cloud Messaging (FCM) – notificações push para dispositivos.
- Resend ou Nodemailer – envio de e-mails.

**Hospedagem e Infraestrutura**
- Vercel – hospedagem do frontend.
- Railway ou Render – hospedagem da API.
- Neon ou Supabase PostgreSQL – banco de dados PostgreSQL em nuvem.

**Controle de Versão**
- Git / GitHub

**Ferramentas de Desenvolvimento**
- Postman ou Insomnia – testes da API.
- Docker – padronização do ambiente de desenvolvimento.
- ESLint e Prettier – padronização e qualidade do código.

### Arquitetura
- Frontend: Next.js + React + TypeScript + Tailwind CSS
- Backend: NestJS + Node.js + TypeScript
- Banco de Dados: PostgreSQL + Prisma
- Autenticação: JWT
- Deploy: Vercel + Railway/Render + PostgreSQL em nuvem

## 6. Linguagem de Design

O design do sistema seguirá princípios de usabilidade, acessibilidade e simplicidade, priorizando uma experiência intuitiva tanto para pacientes quanto para profissionais de saúde.

### Referências

**Material Design (Google)** — interfaces limpas, componentes consistentes e excelente usabilidade.
- Formulários de cadastro.
- Botões e campos de entrada.
- Navegação intuitiva.
- Feedback visual para ações do usuário.

**Apple Human Interface Guidelines** — interfaces minimalistas e focadas na experiência do usuário.
- Espaçamento adequado.
- Tipografia legível.
- Hierarquia visual clara.
- Fluxos simples para pacientes.

**Dashboard Moderno (Linear / Stripe / Vercel)** — painéis administrativos modernos e organizados.
- Dashboard da equipe médica.
- Gestão da fila.
- Relatórios.
- Indicadores em tempo real.

**Aplicativos de Saúde** — inspiração em apps com boa UX (agenda de consultas, histórico de atendimentos, notificações, fluxos de cadastro simplificados).

### Diretrizes Visuais
- Interface limpa e minimalista.
- Poucos elementos por tela.
- Ícones intuitivos.
- Cores suaves para reduzir fadiga visual.
- Design responsivo para desktop, tablet e smartphone.
- Alta acessibilidade (bom contraste, tipografia legível e componentes acessíveis).

### Paleta de Cores (Sugestão)
- Azul `#2563EB` — confiança e saúde.
- Verde `#22C55E` — confirmação e sucesso.
- Amarelo `#F59E0B` — alertas.
- Vermelho `#EF4444` — urgências e erros.
- Cinza claro `#F8FAFC` — fundos.
- Cinza escuro `#334155` — textos.

### Tipografia
- Inter ou Geist.
- Títulos bem destacados.
- Textos objetivos e fáceis de ler.

### Componentes
- Cards.
- Tabelas para gerenciamento da fila.
- Stepper para o processo de triagem.
- Modais para confirmações.
- Toasts para notificações.
- Badges coloridas indicando o status do paciente.

## 7. Processo

- Dividir a construção do app em marcos lógicos (etapas).
- Cada marco deve ser um incremento entregável.
- Priorizar funcionalidade core primeiro, depois iterar.
- Testar cada marco antes de avançar para o próximo.
