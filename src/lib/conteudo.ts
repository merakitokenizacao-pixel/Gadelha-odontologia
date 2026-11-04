// O texto da página, bloco a bloco (docs/v27/COPY.md). Títulos em duas partes: [forte, suave].

const ZAP = "5561999025511";
const zap = (texto: string) => `https://wa.me/${ZAP}?text=${encodeURIComponent(texto)}`;

export const LINKS = {
  agendar: zap("Olá! Gostaria de agendar uma consulta na Gadelha Odontologia."),
  retorno: zap("Olá! Já fui paciente da Gadelha e quero marcar meu retorno."),
  telefone: "tel:+556137115511",
  instagram: "https://www.instagram.com/gadelhaodontologia/",
  email: "mailto:odontogadelha@gmail.com",
  maps: "https://maps.app.goo.gl/tLk5viHetdxAeN9M9",
  waze: "https://waze.com/ul?q=SHIS%20QI%209%2F11%20Bloco%20A%2C%20Lago%20Sul%2C%20Bras%C3%ADlia&navigate=yes",
  zap,
};

export type Titulo = [string, string];

export type Etiqueta = { texto: string; de: number; ate: number; x: string; y: string };

export type Tratamento = {
  id: "orto" | "estetica" | "implante" | "profilaxia";
  numero: string;
  nome: string;
  curto: string;
  resumo: string;
  paraQuem?: string;
  passos: [string, string, string];
  // onde cada passo começa no filme (0 a 1)
  tempos: [number, number, number];
  nota?: string;
  etiquetas?: Etiqueta[];
  rotuloPassos: string;
  cta: string;
  ctaCurto?: string;
  mensagem: string;
};

export const COPY = {
  abertura: { local: "Lago Sul, Brasília" },
  frase: {
    // espaço que não quebra em "família inteira,": a vírgula não fica sozinha numa linha
    titulo: ["Cuidar do sorriso da família inteira,", "do aparelho ao implante."] as Titulo,
    apoio: ["Estamos na ", "QI 9/11 do Lago Sul", " (com estacionamento fácil)."],
    cta: "Agendar pelo WhatsApp",
    nota: "A recepção responde em horário comercial.",
  },
  experiencia: {
    titulo: ["anos de experiência.", "Porque um tratamento complexo exige profissionalismo e segurança."] as Titulo,
    areas: ["Ortodontia", "Cirurgia", "Implantes", "Prevenção e limpeza"],
    cerca: "cerca de",
    pacientes: "pacientes atendidos.",
    retorno: "Já é paciente? Clique aqui para marcar seu retorno",
  },
  tratamentos: {
    rotulo: "Tratamentos",
    titulo: ["Como funciona", "cada tratamento."] as Titulo,
    passoAPasso: "Passo a passo",
    lista: [
      {
        id: "orto",
        numero: "01",
        nome: "Ortodontia",
        curto: "Ortodontia",
        resumo: "Alinhadores transparentes e aparelhos fixos para todas as idades.",
        paraQuem: "Ideal para alinhar os dentes e acertar a mordida com mais conforto.",
        passos: [
          "Planejamos no computador o caminho de cada dente.",
          "Cada alinhador move os dentes um pouco.",
          "A cada etapa, você troca de alinhador, até o fim do plano.",
        ],
        tempos: [0, 0.42, 0.64],
        etiquetas: [
          { texto: "o plano: onde cada borda deve chegar", de: 0.12, ate: 0.38, x: "50%", y: "64%" },
          { texto: "primeiro alinhador", de: 0.37, ate: 0.62, x: "50%", y: "64%" },
          { texto: "o seguinte", de: 0.665, ate: 0.8, x: "50%", y: "64%" },
          { texto: "e assim até o fim do plano", de: 0.88, ate: 0.995, x: "50%", y: "64%" },
        ],
        nota: "Mais de 10 anos de experiência com a técnica BFO (Ortodontia Fixa Sem Brackets).",
        rotuloPassos: "Passo a passo com alinhadores",
        cta: "Agendar avaliação de ortodontia",
        mensagem: "Olá! Gostaria de agendar uma avaliação de ortodontia.",
      },
      {
        id: "estetica",
        numero: "02",
        nome: "Estética do sorriso",
        curto: "Estética",
        resumo: "Facetas e restaurações que devolvem a cor e a harmonia natural do seu sorriso, corrigindo pequenas imperfeições.",
        passos: [
          "Avaliamos forma, cor e proporção de cada dente.",
          "Na faceta, colamos uma lâmina fina na frente do dente.",
          "Na restauração, refazemos em camadas a parte que falta.",
        ],
        tempos: [0, 0.32, 0.64],
        etiquetas: [
          { texto: "largura e proporção", de: 0.06, ate: 0.18, x: "50%", y: "70%" },
          { texto: "escala de cor", de: 0.2, ate: 0.32, x: "50%", y: "90%" },
          { texto: "faceta · só na frente", de: 0.43, ate: 0.61, x: "64%", y: "74%" },
          { texto: "dentina · mais quente e opaca", de: 0.627, ate: 0.773, x: "41.5%", y: "72%" },
          { texto: "esmalte", de: 0.707, ate: 0.853, x: "47%", y: "79%" },
          { texto: "borda translúcida", de: 0.787, ate: 0.933, x: "45.5%", y: "86%" },
        ],
        rotuloPassos: "Passo a passo",
        cta: "Agendar avaliação de estética",
        mensagem: "Olá! Gostaria de agendar uma avaliação de estética do sorriso.",
      },
      {
        id: "implante",
        numero: "03",
        nome: "Prótese e implantes",
        curto: "Implantes",
        resumo: "Implantes e próteses planejados para repor dentes perdidos, devolver a firmeza na mastigação e trazer conforto de volta.",
        passos: [
          "Colocamos o implante no osso, no lugar da raiz.",
          "Esperamos a cicatrização, para o osso se unir ao implante.",
          "Um pilar liga o implante à coroa, que completa o dente.",
        ],
        tempos: [0, 0.42, 0.66],
        etiquetas: [
          { texto: "o dente que falta", de: 0.03, ate: 0.14, x: "50%", y: "16%" },
          { texto: "implante · no lugar da raiz", de: 0.2, ate: 0.42, x: "71%", y: "64%" },
          { texto: "o osso se une ao implante", de: 0.45, ate: 0.64, x: "71%", y: "64%" },
          { texto: "pilar", de: 0.68, ate: 0.77, x: "66%", y: "34%" },
          { texto: "coroa", de: 0.78, ate: 0.88, x: "50%", y: "14%" },
        ],
        rotuloPassos: "Passo a passo do implante",
        cta: "Agendar avaliação de prótese e implantes",
        ctaCurto: "Agendar avaliação",
        mensagem: "Olá! Gostaria de agendar uma avaliação de prótese e implantes.",
      },
      {
        id: "profilaxia",
        numero: "04",
        nome: "Profilaxia e prevenção",
        curto: "Prevenção",
        resumo: "Limpeza detalhada e check-up preventivo para manter a saúde bucal da família sempre em dia.",
        passos: [
          "Removemos a placa e o tártaro.",
          "Polimos os dentes.",
          "Nas revisões, vemos cedo o que pode virar um problema maior.",
        ],
        tempos: [0, 0.42, 0.7],
        etiquetas: [
          { texto: "placa e tártaro", de: 0.02, ate: 0.13, x: "50%", y: "70%" },
          { texto: "ultrassom", de: 0.16, ate: 0.38, x: "70%", y: "20%" },
          { texto: "polimento", de: 0.46, ate: 0.66, x: "50%", y: "20%" },
          { texto: "6 meses", de: 0.73, ate: 0.89, x: "50%", y: "20%" },
          { texto: "revisão", de: 0.9, ate: 0.995, x: "50%", y: "20%" },
        ],
        rotuloPassos: "Passo a passo",
        cta: "Agendar limpeza",
        mensagem: "Olá! Gostaria de agendar uma limpeza.",
      },
    ] as Tratamento[],
  },
  tecnologia: {
    rotulo: "Tecnologia",
    // o documento da clínica diz "Veja o resultado do seu tratamento": "simulação" evita prometer resultado (CFO)
    titulo: ["Veja a simulação do seu tratamento", "antes mesmo de começar."] as Titulo,
    itens: [
      { n: "01", forte: "Escaneamento digital:", apoio: "Criamos um modelo tridimensional exato da sua arcada, sem necessidade de moldagem em gesso." },
      { n: "02", forte: "Simulação realista:", apoio: "Mostramos na tela como seus dentes vão se movimentar e o resultado esperado." },
      { n: "03", forte: "Impressão 3D na clínica:", apoio: "Agilidade e precisão com nossa impressora 3D própria." },
    ],
  },
  clinica: {
    rotulo: "A clínica",
    titulo: ["Sinta-se em casa.", "Conheça nosso espaço antes de vir nos visitar."] as Titulo,
    paradas: [
      { nome: "A entrada", forte: "Estamos no 1º andar do Bloco A.", suave: "É só procurar nossa fachada." },
      { nome: "A recepção", forte: "Um ambiente aconchegante", suave: "onde nossa equipe te recebe com todo o cuidado." },
      { nome: "O consultório", forte: "Iluminado por luz natural,", suave: "preparado para cuidar de você com calma e conforto." },
    ],
  },
  onde: {
    rotulo: "Onde estamos",
    titulo: ["Lago Sul, QI 9/11.", "Local de fácil acesso e estacionamento tranquilo."] as Titulo,
    endereco: ["SHIS QI 9/11, Bloco A, Loja 12, 1º andar", "Lago Sul, Brasília-DF"],
    estacionamento: "Estacionamento público",
    horario: "Horário: a confirmar com a clínica",
    convenios: "Atendimento particular e convênios STM e APEX",
    whatsapp: "(61) 99902-5511",
    telefone: "(61) 3711-5511",
  },
  rodape: {
    titulo: ["Para uma avaliação ou retorno,", "é só mandar uma mensagem."] as Titulo,
    cta: "Agendar pelo WhatsApp",
    nota: "A recepção responde em horário comercial.",
    rt: { nome: "Dr. Flávio Paiva Gadelha", cargo: "Cirurgião-dentista", funcao: "Responsável técnico", cro: "CRO-DF 3751" },
    instagram: "@gadelhaodontologia",
    email: "odontogadelha@gmail.com",
    base: "© 2026 Gadelha Odontologia",
    inscricao: "CRO-DF IE-973",
  },
};
