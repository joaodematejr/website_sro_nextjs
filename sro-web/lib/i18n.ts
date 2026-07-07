export const I18N_COOKIE_NAME = 'sro_locale'

export const locales = ['pt-BR', 'en-US'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'pt-BR'

export function isLocale(value: string | undefined | null): value is Locale {
  if (!value) {
    return false
  }

  return (locales as readonly string[]).includes(value)
}

export const i18nMessages = {
  'pt-BR': {
    header: {
      home: 'Inicio',
      guide: 'Guia',
      download: 'Download',
      gameDownload: 'Baixar Jogo',
      community: 'Comunidade',
      member: 'Membro',
      register: 'Cadastro',
      chargeCenter: 'Central de Recarga',
      health: 'Saude',
      language: 'Idioma',
    },
    footer: {
      legal: 'Marcas registradas pertencem aos seus respectivos proprietarios. Todos os direitos reservados.',
    },
    home: {
      title: 'Migracao Web do Silkroad Online',
      description:
        'Home, download e fluxo de cadastro do legado estao sendo migrados de PHP para Next.js com TypeScript, mantendo compatibilidade com o banco do jogo.',
      goToDownload: 'Ir para Download',
      createAccount: 'Criar Conta',
      chargeCenter: 'Central de Recarga',
      accountRegistration: 'Cadastro de Conta',
      latestNews: 'Ultimas Noticias',
      badgeNew: 'Novo',
      hotType: 'Evento',
      hotDate: '2022-08-31',
      hotTitle: 'Atualizacao principal de eventos de setembro e recompensas de ranking',
      featuredNews: [
        {
          title: 'Plano de reset da Fortress e compensacao',
          date: '2022-09-20',
          type: 'Importante',
        },
        {
          title: 'Aviso de manutencao de rede no IDC',
          date: '2022-09-20',
          type: 'Sistema',
        },
        {
          title: 'Atualizacao das recompensas de setembro',
          date: '2022-09-19',
          type: 'Evento',
        },
      ],
    },
    download: {
      step: 'Migracao Etapa 1',
      title: 'Central de Download',
      description:
        'Pagina de download do legado PHP migrada para Next.js App Router. Links estaticos e requisitos estao tipados e mantidos em React.',
      downloadClient: 'Baixar Cliente',
      minimum: 'Minimo',
      recommended: 'Recomendado',
    },
    register: {
      step: 'Migracao Etapa 2',
      title: 'Cadastro de Membro',
      description:
        'Esta pagina substitui old/member/index.php e envia para uma API segura com SQL parametrizado.',
      username: 'Usuario',
      usernamePlaceholder: 'somente letras e numeros',
      password: 'Senha',
      passwordPlaceholder: 'minimo de 6 caracteres',
      email: 'E-mail',
      captcha: 'Captcha',
      refresh: 'Atualizar',
      captchaPlaceholder: 'digite os numeros da imagem',
      creating: 'Criando...',
      createAccount: 'Criar Conta',
      success: 'Conta criada com sucesso. Agora voce ja pode entrar no jogo.',
      networkError: 'Erro de rede inesperado ao criar a conta.',
      genericError: 'Nao foi possivel concluir o cadastro.',
      errors: {
        MISSING_REQUIRED_FIELDS: 'Preencha todos os campos obrigatorios.',
        INVALID_USERNAME: 'Usuario invalido. Use apenas letras e numeros (4 a 16 caracteres).',
        INVALID_PASSWORD: 'Senha invalida. Use entre 6 e 48 caracteres.',
        INVALID_EMAIL: 'E-mail invalido.',
        MISSING_CAPTCHA: 'Informe o captcha.',
        INVALID_CAPTCHA: 'Captcha incorreto. Tente novamente.',
        USERNAME_TAKEN: 'Este usuario ja esta em uso.',
        TOO_MANY_ATTEMPTS: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
        DATABASE_REQUEST_FAILED: 'Falha no servidor ao criar a conta. Tente novamente mais tarde.',
        REGISTER_FAILED: 'Falha no servidor ao criar a conta. Tente novamente mais tarde.',
      },
    },
    chargeCenter: {
      tag: 'Compatibilidade com Legado',
      title: 'Central de Recarga',
      description: 'A central de recarga do legado esta indisponivel nesta fase da migracao.',
      info: 'Volte para a pagina inicial e use os recursos ja migrados.',
      backHome: 'Voltar ao Inicio',
      registerAccount: 'Cadastrar Conta',
    },
  },
  'en-US': {
    header: {
      home: 'Home',
      guide: 'Guide',
      download: 'Download',
      gameDownload: 'Game Download',
      community: 'Community',
      member: 'Member',
      register: 'Register',
      chargeCenter: 'Charge Center',
      health: 'Health',
      language: 'Language',
    },
    footer: {
      legal: 'Trademarks belong to their respective owners. All rights reserved.',
    },
    home: {
      title: 'Silkroad Online Web Migration',
      description:
        'Legacy home, download and registration flow are being migrated from PHP to Next.js with TypeScript, keeping game database compatibility.',
      goToDownload: 'Go to Download',
      createAccount: 'Create Account',
      chargeCenter: 'Charge Center',
      accountRegistration: 'Account Registration',
      latestNews: 'Latest News',
      badgeNew: 'New',
      hotType: 'Event',
      hotDate: '2022-08-31',
      hotTitle: 'September major event update and ranked rewards',
      featuredNews: [
        {
          title: 'Fortress reset and compensation plan',
          date: '2022-09-20',
          type: 'Important',
        },
        {
          title: 'IDC network maintenance notice',
          date: '2022-09-20',
          type: 'System',
        },
        {
          title: 'September reward update',
          date: '2022-09-19',
          type: 'Event',
        },
      ],
    },
    download: {
      step: 'Migration Step 1',
      title: 'Download Center',
      description:
        'Legacy PHP download page migrated to Next.js App Router. Static links and requirements are now typed and maintained in React.',
      downloadClient: 'Download Client',
      minimum: 'Minimum',
      recommended: 'Recommended',
    },
    register: {
      step: 'Migration Step 2',
      title: 'Member Registration',
      description: 'This page replaces old/member/index.php and posts to a secure parameterized SQL API.',
      username: 'Username',
      usernamePlaceholder: 'letters and numbers only',
      password: 'Password',
      passwordPlaceholder: 'minimum 6 characters',
      email: 'Email',
      captcha: 'Captcha',
      refresh: 'Refresh',
      captchaPlaceholder: 'type the digits from image',
      creating: 'Creating...',
      createAccount: 'Create Account',
      success: 'Account created successfully. You can now log in to the game.',
      networkError: 'Unexpected network error while creating account.',
      genericError: 'Unable to complete registration.',
      errors: {
        MISSING_REQUIRED_FIELDS: 'Please fill all required fields.',
        INVALID_USERNAME: 'Invalid username. Use only letters and numbers (4 to 16 chars).',
        INVALID_PASSWORD: 'Invalid password. Use between 6 and 48 characters.',
        INVALID_EMAIL: 'Invalid email address.',
        MISSING_CAPTCHA: 'Please provide captcha.',
        INVALID_CAPTCHA: 'Invalid captcha. Please try again.',
        USERNAME_TAKEN: 'This username is already taken.',
        TOO_MANY_ATTEMPTS: 'Too many attempts. Please wait a few minutes and retry.',
        DATABASE_REQUEST_FAILED: 'Server failed while creating account. Please try later.',
        REGISTER_FAILED: 'Server failed while creating account. Please try later.',
      },
    },
    chargeCenter: {
      tag: 'Legacy Compatibility',
      title: 'Charge Center',
      description: 'Legacy charge center is unavailable in this migration phase.',
      info: 'Please return to the homepage and use the available migrated features.',
      backHome: 'Back to Home',
      registerAccount: 'Register Account',
    },
  },
} as const

export type I18nMessages = (typeof i18nMessages)[Locale]
