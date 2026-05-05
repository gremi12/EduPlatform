document.addEventListener("DOMContentLoaded", () => {
  const languageButtons = document.querySelectorAll(".language-switcher-button");
  const chatbotToggleButton = document.querySelector("#chatbotToggleButton");
  const chatbotCloseButton = document.querySelector("#chatbotCloseButton");
  const chatbotPanel = document.querySelector("#chatbotPanel");
  const chatbotMessages = document.querySelector("#chatbotMessages");
  const chatbotSuggestions = document.querySelector("#chatbotSuggestions");
  const chatbotForm = document.querySelector("#chatbotForm");
  const chatbotInput = document.querySelector("#chatbotInput");
  const languageStorageKey = "eduplatform-language";
  const messages = [];

  const translations = {
    ro: {
      title: "EduPlatform | Acasă",
      nav: {
        resources: "Resurse",
        webinars: "Webinarii",
        community: "Comunități",
        profile: "Profil",
        login: "Autentificare",
        register: "Înregistrare",
      },
      hero: {
        badge: "COMUNITATE EDUCAȚIONALĂ",
        title: "Dezvoltarea platformei „Comunitate educațională pentru profesori”",
        list1: "Platformă pentru colaborarea profesorilor și elevilor.",
        list2: "Schimb rapid de resurse educaționale și materiale utile.",
        list3: "Participare la webinarii și cursuri video organizate pe platformă.",
        list4: "Comunități pe discipline și clase pentru lucru structurat.",
        ctaPrimary: "Creează cont gratuit",
        ctaSecondary: "Explorează resurse",
      },
      mockup: {
        home: "Acasă",
        resources: "Resurse",
        webinars: "Webinarii",
        community: "Comunități",
        popularResources: "Resurse populare",
        card1Title: "Lecție de matematică",
        card1Meta: "PDF · 4.8",
        card2Title: "Algoritmi",
        card2Meta: "PDF · 4.7",
        card3Title: "Plan de lecție",
        card3Meta: "DOCX · 4.9",
        nextWebinars: "Webinarii viitoare",
        webinarTitle: "Strategii de predare eficiente",
        webinarDate: "12 mai 2026 · 17:00",
        webinarButton: "Înscrie-te",
      },
      search: {
        placeholder: "Caută resurse: matematică, informatică, limba română...",
        optionAll: "Toate categoriile",
        optionInfo: "Informatică",
        optionScience: "Științe",
        optionRomanian: "Limba română",
        optionMath: "Matematică",
        button: "Caută",
      },
      cards: {
        goal: {
          title: "Scopul platformei",
          item1: "Spațiu colaborativ pentru profesori și elevi.",
          item2: "Acces ușor la resurse educaționale.",
          item3: "Organizare mai bună a activităților școlare.",
        },
        audience: {
          title: "Public țintă",
          item1: "Profesori",
          item2: "Elevi",
          item3: "Moderatori",
          item4: "Organizatori de cursuri",
        },
        roles: {
          title: "Roluri în sistem",
          item1: "Vizitator",
          item2: "Elev",
          item3: "Profesor",
          item4: "Moderator",
          item5: "Administrator",
        },
        structure: {
          title: "Structura platformei",
          item1: "Pagina principală",
          item2: "Catalog de resurse",
          item3: "Comunități pe clase și discipline",
          item4: "Webinarii și cursuri video",
          item5: "Profil și dashboard personal",
        },
        features: {
          title: "Funcționalități principale",
          item1: "Înregistrare și autentificare pe roluri.",
          item2: "Upload, editare și ștergere de resurse.",
          item3: "Căutare și filtre rapide în catalog.",
          item4: "Comunități, teme de discuție și chat.",
          item5: "Webinarii cu acces la lecții video.",
        },
        benefits: {
          title: "Beneficii pentru utilizatori",
          item1: "Interfață clară și ușor de folosit.",
          item2: "Colaborare reală între profesori și elevi.",
          item3: "Conținut actualizat și organizat pe nevoi reale.",
        },
        security: {
          title: "Securitate",
          item1: "Protecția datelor personale și a conturilor.",
          item2: "Autentificare securizată prin Supabase.",
          item3: "Acces diferențiat în funcție de rol.",
          item4: "Respectarea cerințelor GDPR.",
        },
        advantages: {
          title: "Avantaje",
          item1: "Acces gratuit pentru utilizatori.",
          item2: "Economisești timp când cauți materiale.",
          item3: "Lucrezi în comunități potrivite clasei tale.",
          item4: "Ai cursuri video și webinarii într-un singur loc.",
        },
      },
      how: {
        title: "Cum funcționează?",
        step1: { title: "Creează cont", text: "Alege rolul și completează profilul." },
        step2: { title: "Publică sau accesează", text: "Profesorii urcă resurse, elevii le găsesc rapid." },
        step3: { title: "Intră în comunități", text: "Participă la teme, chat și discuții pe clase." },
        step4: { title: "Învață continuu", text: "Înscrie-te la webinarii și urmărește cursuri video." },
      },
      cta: {
        title: "Alătură-te comunității noastre!",
        text: "Construim împreună o platformă educațională mai utilă pentru profesori și elevi.",
        button: "Creează cont gratuit",
      },
      chat: {
        toggle: "Asistent",
        header: "Asistent EduPlatform",
        subheader: "Răspunde la întrebări despre platformă",
        suggestion1: "Cum creez cont?",
        suggestion2: "Ce pot face pe platformă?",
        suggestion3: "Cum mă înscriu la webinarii?",
        placeholder: "Scrie întrebarea ta despre platformă...",
        send: "Trimite",
        openAria: "Deschide asistentul platformei",
        closeAria: "Închide chatbot",
        welcome: "Salut! Îți pot spune cum funcționează conturile, resursele, comunitățile, webinariile și dashboard-urile din platformă.",
        fallback: "Te pot ajuta cu întrebări despre cont, autentificare, resurse, comunități, webinarii, roluri sau administrare.",
        prompts: {
          createAccount: "Cum creez cont?",
          resources: "Ce pot face pe platformă?",
          webinars: "Cum mă înscriu la webinarii?",
        },
        answers: {
          createAccount: "Pentru a crea un cont, apasă pe „Înregistrare”, alege rolul potrivit și completează datele profilului. Elevii își pot seta și clasa, iar profesorii pot intra apoi în dashboard-ul lor.",
          login: "Pentru autentificare, apasă pe „Autentificare”, introdu emailul și parola, iar dacă ai uitat parola poți folosi opțiunea de resetare din formular.",
          resources: "Pe platformă poți descărca resurse, publica materiale dacă ai rol de profesor, edita propriile resurse și vedea conținut potrivit clasei sau disciplinei tale.",
          webinars: "Profesorii se pot înscrie la webinarii din pagina „Webinarii”. După înscriere, primesc acces la cursuri video și lecții organizate în aceeași secțiune.",
          communities: "În comunități poți intra în grupuri pe clasă sau materie, poți da join, deschide teme de discuție și trimite mesaje legate de lecții și activități.",
          roles: "Platforma are roluri precum elev, profesor, moderator și administrator. Fiecare rol vede dashboard și acțiuni diferite.",
          admin: "Conturile de admin se creează prin promovarea unui cont existent în baza de date. După ce rolul este setat la admin, te poți loga pe pagina admin cu același email și aceeași parolă.",
          support: "Pentru suport sau informații despre date personale și GDPR, poți folosi pagina „Contact”.",
        },
      },
      footer: {
        about: "Comunitate educațională pentru profesori și elevi. Împreună pentru o educație mai bună.",
        platform: "Platformă",
        resources: "Resurse",
        webinars: "Webinarii",
        community: "Comunități",
        profile: "Profil",
        support: "Suport",
        contact: "Contact",
        gdpr: "GDPR",
        copy: "© 2026 EduPlatform. Toate drepturile rezervate.",
      },
      chrome: {
        home: "Acasă",
        myProfile: "Profilul meu",
        teacherDashboard: "Dashboard profesor",
        studentDashboard: "Dashboard elev",
        adminDashboard: "Dashboard admin",
        logout: "Deconectare",
      },
    },
    ru: {
      title: "EduPlatform | Главная",
      nav: {
        resources: "Ресурсы",
        webinars: "Вебинары",
        community: "Сообщества",
        profile: "Профиль",
        login: "Вход",
        register: "Регистрация",
      },
      hero: {
        badge: "ОБРАЗОВАТЕЛЬНОЕ СООБЩЕСТВО",
        title: "Развитие платформы «Образовательное сообщество для преподавателей»",
        list1: "Платформа для сотрудничества преподавателей и учеников.",
        list2: "Быстрый обмен учебными ресурсами и полезными материалами.",
        list3: "Участие в вебинарах и видеокурсах на платформе.",
        list4: "Сообщества по предметам и классам для структурированной работы.",
        ctaPrimary: "Создать бесплатный аккаунт",
        ctaSecondary: "Открыть ресурсы",
      },
      mockup: {
        home: "Главная",
        resources: "Ресурсы",
        webinars: "Вебинары",
        community: "Сообщества",
        popularResources: "Популярные ресурсы",
        card1Title: "Урок математики",
        card1Meta: "PDF · 4.8",
        card2Title: "Алгоритмы",
        card2Meta: "PDF · 4.7",
        card3Title: "План урока",
        card3Meta: "DOCX · 4.9",
        nextWebinars: "Ближайшие вебинары",
        webinarTitle: "Эффективные стратегии преподавания",
        webinarDate: "12 мая 2026 · 17:00",
        webinarButton: "Записаться",
      },
      search: {
        placeholder: "Искать ресурсы: математика, информатика, румынский язык...",
        optionAll: "Все категории",
        optionInfo: "Информатика",
        optionScience: "Науки",
        optionRomanian: "Румынский язык",
        optionMath: "Математика",
        button: "Поиск",
      },
      cards: {
        goal: {
          title: "Цель платформы",
          item1: "Совместное пространство для преподавателей и учеников.",
          item2: "Удобный доступ к образовательным ресурсам.",
          item3: "Лучшая организация школьной деятельности.",
        },
        audience: {
          title: "Целевая аудитория",
          item1: "Преподаватели",
          item2: "Ученики",
          item3: "Модераторы",
          item4: "Организаторы курсов",
        },
        roles: {
          title: "Роли в системе",
          item1: "Гость",
          item2: "Ученик",
          item3: "Преподаватель",
          item4: "Модератор",
          item5: "Администратор",
        },
        structure: {
          title: "Структура платформы",
          item1: "Главная страница",
          item2: "Каталог ресурсов",
          item3: "Сообщества по классам и предметам",
          item4: "Вебинары и видеокурсы",
          item5: "Профиль и личная панель",
        },
        features: {
          title: "Основные функции",
          item1: "Регистрация и вход по ролям.",
          item2: "Загрузка, редактирование и удаление ресурсов.",
          item3: "Быстрый поиск и фильтры в каталоге.",
          item4: "Сообщества, темы обсуждений и чат.",
          item5: "Вебинары с доступом к видеоурокам.",
        },
        benefits: {
          title: "Преимущества для пользователей",
          item1: "Понятный и удобный интерфейс.",
          item2: "Настоящее сотрудничество между преподавателями и учениками.",
          item3: "Актуальный контент, организованный под реальные задачи.",
        },
        security: {
          title: "Безопасность",
          item1: "Защита личных данных и аккаунтов.",
          item2: "Безопасная аутентификация через Supabase.",
          item3: "Разный уровень доступа в зависимости от роли.",
          item4: "Соблюдение требований GDPR.",
        },
        advantages: {
          title: "Преимущества",
          item1: "Бесплатный доступ для пользователей.",
          item2: "Экономия времени при поиске материалов.",
          item3: "Работа в сообществах, подходящих вашему классу.",
          item4: "Видеокурсы и вебинары в одном месте.",
        },
      },
      how: {
        title: "Как это работает?",
        step1: { title: "Создайте аккаунт", text: "Выберите роль и заполните профиль." },
        step2: { title: "Публикуйте или изучайте", text: "Преподаватели загружают ресурсы, ученики быстро их находят." },
        step3: { title: "Вступайте в сообщества", text: "Участвуйте в темах, чате и обсуждениях по классам." },
        step4: { title: "Учитесь постоянно", text: "Записывайтесь на вебинары и смотрите видеокурсы." },
      },
      cta: {
        title: "Присоединяйтесь к нашему сообществу!",
        text: "Мы вместе создаем более полезную образовательную платформу для преподавателей и учеников.",
        button: "Создать бесплатный аккаунт",
      },
      chat: {
        toggle: "Помощник",
        header: "Помощник EduPlatform",
        subheader: "Отвечает на вопросы о платформе",
        suggestion1: "Как создать аккаунт?",
        suggestion2: "Что можно делать на платформе?",
        suggestion3: "Как записаться на вебинары?",
        placeholder: "Напишите свой вопрос о платформе...",
        send: "Отправить",
        openAria: "Открыть помощника платформы",
        closeAria: "Закрыть чат-бот",
        welcome: "Здравствуйте! Я могу подсказать, как работают аккаунты, ресурсы, сообщества, вебинары и личные панели на платформе.",
        fallback: "Я могу помочь с вопросами об аккаунте, входе, ресурсах, сообществах, вебинарах, ролях или администрировании.",
        prompts: {
          createAccount: "Как создать аккаунт?",
          resources: "Что можно делать на платформе?",
          webinars: "Как записаться на вебинары?",
        },
        answers: {
          createAccount: "Чтобы создать аккаунт, нажмите «Регистрация», выберите подходящую роль и заполните данные профиля. Ученики могут указать класс, а преподаватели затем получают доступ к своей панели.",
          login: "Для входа нажмите «Вход», введите email и пароль. Если вы забыли пароль, используйте функцию сброса в форме авторизации.",
          resources: "На платформе можно скачивать ресурсы, публиковать материалы при роли преподавателя, редактировать свои ресурсы и видеть контент, подходящий вашему классу или предмету.",
          webinars: "Преподаватели могут записываться на вебинары на странице «Вебинары». После регистрации открывается доступ к видеокурсам и урокам в этой же секции.",
          communities: "В сообществах можно вступать в группы по классу или предмету, открывать темы обсуждений и отправлять сообщения, связанные с уроками и заданиями.",
          roles: "На платформе есть роли: ученик, преподаватель, модератор и администратор. Для каждой роли доступны разные панели и действия.",
          admin: "Администраторский доступ выдается существующему аккаунту через базу данных. После установки роли admin можно войти на admin-страницу с тем же email и паролем.",
          support: "Для поддержки или вопросов о персональных данных и GDPR можно использовать страницу «Контакт».",
        },
      },
      footer: {
        about: "Образовательное сообщество для преподавателей и учеников. Вместе к лучшему образованию.",
        platform: "Платформа",
        resources: "Ресурсы",
        webinars: "Вебинары",
        community: "Сообщества",
        profile: "Профиль",
        support: "Поддержка",
        contact: "Контакт",
        gdpr: "GDPR",
        copy: "© 2026 EduPlatform. Все права защищены.",
      },
      chrome: {
        home: "Главная",
        myProfile: "Мой профиль",
        teacherDashboard: "Панель преподавателя",
        studentDashboard: "Панель ученика",
        adminDashboard: "Панель администратора",
        logout: "Выйти",
      },
    },
  };

  const intentPatterns = {
    createAccount: [
      "creez cont", "creeaza cont", "creează cont", "inregistr", "înregistr", "создать аккаунт", "регистрац", "аккаунт",
    ],
    login: [
      "autentific", "login", "logare", "parola", "пароль", "вход", "войти",
    ],
    resources: [
      "resurs", "material", "download", "pdf", "resource", "ресурс", "материал",
    ],
    webinars: [
      "webinar", "webinarii", "курс", "вебинар", "video", "видео",
    ],
    communities: [
      "comunit", "community", "chat", "grup", "clasa", "класс", "сообщ", "чат", "групп",
    ],
    roles: [
      "rol", "profesor", "elev", "moderator", "administrator", "роль", "ученик", "преподавател", "админ",
    ],
    admin: [
      "admin", "administrator", "панель администратора", "администратор",
    ],
    support: [
      "gdpr", "contact", "suport", "ajutor", "support", "помощ", "контакт", "данные",
    ],
  };

  let currentLanguage = loadSavedLanguage();

  initializeLanguageSwitcher();
  applyTranslations(currentLanguage);
  initializeChatbot();

  function loadSavedLanguage() {
    const saved = window.localStorage.getItem(languageStorageKey);
    return saved === "ru" ? "ru" : "ro";
  }

  function initializeLanguageSwitcher() {
    languageButtons.forEach(button => {
      button.addEventListener("click", () => {
        const nextLanguage = button.dataset.lang === "ru" ? "ru" : "ro";
        if (nextLanguage === currentLanguage) return;
        currentLanguage = nextLanguage;
        window.localStorage.setItem(languageStorageKey, currentLanguage);
        applyTranslations(currentLanguage);
        rerenderChatMessages();
      });
    });
  }

  function initializeChatbot() {
    if (!chatbotPanel || !chatbotMessages || !chatbotForm || !chatbotInput) return;

    if (!messages.length) {
      messages.push({ role: "bot", kind: "welcome" });
      rerenderChatMessages();
    }

    chatbotToggleButton?.addEventListener("click", () => {
      chatbotPanel.classList.toggle("d-none");
    });

    chatbotCloseButton?.addEventListener("click", () => {
      chatbotPanel.classList.add("d-none");
    });

    chatbotSuggestions?.querySelectorAll("[data-chat-intent]").forEach(button => {
      button.addEventListener("click", () => {
        const intent = button.dataset.chatIntent;
        sendIntentQuestion(intent);
      });
    });

    chatbotForm.addEventListener("submit", event => {
      event.preventDefault();
      const question = chatbotInput.value.trim();
      if (!question) return;
      sendQuestion(question);
      chatbotInput.value = "";
    });
  }

  function applyTranslations(language) {
    const dictionary = translations[language] || translations.ro;

    document.documentElement.lang = language;
    document.title = dictionary.title;

    document.querySelectorAll("[data-i18n]").forEach(element => {
      const key = element.dataset.i18n;
      const value = resolveTranslationValue(dictionary, key);
      if (typeof value === "string") {
        element.textContent = value;
      }
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
      const key = element.dataset.i18nPlaceholder;
      const value = resolveTranslationValue(dictionary, key);
      if (typeof value === "string") {
        element.setAttribute("placeholder", value);
      }
    });

    chatbotToggleButton?.setAttribute("aria-label", dictionary.chat.openAria);
    chatbotCloseButton?.setAttribute("aria-label", dictionary.chat.closeAria);

    languageButtons.forEach(button => {
      button.classList.toggle("active", button.dataset.lang === language);
    });

    translateDynamicChrome(language);
  }

  function resolveTranslationValue(dictionary, path) {
    return path.split(".").reduce((accumulator, key) => accumulator?.[key], dictionary);
  }

  function translateDynamicChrome(language) {
    const dictionary = translations[language] || translations.ro;
    const chrome = dictionary.chrome;

    translateLinksByHref(".navbar a", {
      "resources.html": dictionary.nav.resources,
      "webinars.html": dictionary.nav.webinars,
      "community.html": dictionary.nav.community,
      "profile.html": dictionary.nav.profile,
      "login.html#login": dictionary.nav.login,
      "login.html#register": dictionary.nav.register,
    });

    translateLinksByHref(".dropdown-menu a", {
      "profile.html": chrome.myProfile,
      "teachers-dashboard.html": chrome.teacherDashboard,
      "student-dashboard.html": chrome.studentDashboard,
      "admin.html": chrome.adminDashboard,
    });

    translateLinksByHref(".footer a", {
      "index.html": chrome.home,
      "contact.html": dictionary.footer.contact,
      "contact.html#gdpr": dictionary.footer.gdpr,
      "resources.html": dictionary.footer.resources,
      "webinars.html": dictionary.footer.webinars,
      "community.html": dictionary.footer.community,
      "profile.html": dictionary.footer.profile,
    });

    const logoutButton = document.querySelector("#logoutNavButton");
    if (logoutButton) {
      logoutButton.textContent = chrome.logout;
    }

    const footerHeadings = Array.from(document.querySelectorAll(".footer h6"));
    footerHeadings.forEach(heading => {
      const normalized = normalizeText(heading.textContent);
      if (normalized.includes("platform") || normalized.includes("platforma") || normalized.includes("платформ")) {
        heading.textContent = dictionary.footer.platform;
      } else if (normalized.includes("suport") || normalized.includes("support") || normalized.includes("поддерж")) {
        heading.textContent = dictionary.footer.support;
      }
    });
  }

  function translateLinksByHref(selector, labelsByHref) {
    document.querySelectorAll(selector).forEach(link => {
      const href = normalizeHref(link.getAttribute("href"));
      if (href && labelsByHref[href]) {
        link.textContent = labelsByHref[href];
      }
    });
  }

  function normalizeHref(href) {
    return String(href || "")
      .replace(/^\.\//, "")
      .replace(/^\/+/, "")
      .trim()
      .toLowerCase();
  }

  function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
  }

  function sendIntentQuestion(intent) {
    const prompt = translations[currentLanguage].chat.prompts[intent];
    if (!prompt) return;
    messages.push({ role: "user", text: prompt });
    messages.push({ role: "bot", kind: "faq", intent });
    rerenderChatMessages();
  }

  function sendQuestion(question) {
    const intent = detectIntent(question);
    messages.push({ role: "user", text: question });

    if (intent) {
      messages.push({ role: "bot", kind: "faq", intent });
    } else {
      messages.push({ role: "bot", kind: "fallback" });
    }

    rerenderChatMessages();
  }

  function detectIntent(question) {
    const normalizedQuestion = normalizeText(question);

    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      if (patterns.some(pattern => normalizedQuestion.includes(pattern))) {
        return intent;
      }
    }

    return null;
  }

  function rerenderChatMessages() {
    if (!chatbotMessages) return;

    chatbotMessages.innerHTML = "";

    messages.forEach(message => {
      const item = document.createElement("div");
      item.className = `platform-chatbot-message ${
        message.role === "user" ? "platform-chatbot-message-user" : "platform-chatbot-message-bot"
      }`;

      if (message.role === "user") {
        item.textContent = message.text;
      } else {
        item.textContent = resolveBotMessage(message);
      }

      chatbotMessages.appendChild(item);
    });

    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }

  function resolveBotMessage(message) {
    const dictionary = translations[currentLanguage] || translations.ro;

    if (message.kind === "welcome") {
      return dictionary.chat.welcome;
    }

    if (message.kind === "faq" && message.intent) {
      return dictionary.chat.answers[message.intent] || dictionary.chat.fallback;
    }

    return dictionary.chat.fallback;
  }
});
