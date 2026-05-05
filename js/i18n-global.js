document.addEventListener("DOMContentLoaded", () => {
  const languageStorageKey = "eduplatform-language";
  const legacyLanguageStorageKey = "eduplatform-home-language";
  const pageName = window.location.pathname.split("/").pop() || "index.html";
  const navbarList = document.querySelector(".navbar-nav");
  let currentLanguage = loadLanguage();
  let navbarObserver = null;
  let documentObserver = null;
  let observerScheduled = false;
  let isApplyingTranslations = false;

  const commonTranslations = {
    ro: {
      nav: {
        resources: "Resurse",
        webinars: "Webinarii",
        community: "Comunități",
        profile: "Profil",
        login: "Autentificare",
        register: "Înregistrare",
      },
      footer: {
        about: "Comunitate educațională pentru profesori și elevi. Împreună pentru o educație mai bună.",
        platform: "Platformă",
        support: "Suport",
        contact: "Contact",
        gdpr: "GDPR",
        copy: "© 2026 EduPlatform. Toate drepturile rezervate.",
      },
      chrome: {
        myProfile: "Profilul meu",
        teacherDashboard: "Dashboard profesor",
        studentDashboard: "Dashboard elev",
        adminDashboard: "Dashboard admin",
        logout: "Deconectare",
      },
      languageLabel: "Schimbă limba",
    },
    ru: {
      nav: {
        resources: "Ресурсы",
        webinars: "Вебинары",
        community: "Сообщества",
        profile: "Профиль",
        login: "Вход",
        register: "Регистрация",
      },
      footer: {
        about: "Образовательное сообщество для преподавателей и учеников. Вместе к лучшему образованию.",
        platform: "Платформа",
        support: "Поддержка",
        contact: "Контакт",
        gdpr: "GDPR",
        copy: "© 2026 EduPlatform. Все права защищены.",
      },
      chrome: {
        myProfile: "Мой профиль",
        teacherDashboard: "Панель преподавателя",
        studentDashboard: "Панель ученика",
        adminDashboard: "Панель администратора",
        logout: "Выйти",
      },
      languageLabel: "Сменить язык",
    },
  };

  const pageTranslations = {
    "login.html": {
      ro: {
        title: "Autentificare | EduPlatform",
        texts: [
          ["#sessionPanel h1", "Sesiune activă"],
          ["#sessionPanel p", "Ești deja autentificat în platformă."],
          ["#registerPanel h1", "Înregistrare"],
          ["#registerPanel > p", "Creează cont gratuit pe platformă."],
          ['label[for="registerName"]', "Nume"],
          ['label[for="registerEmail"]', "Email"],
          ['label[for="registerPassword"]', "Parolă"],
          ['label[for="registerRole"]', "Rol"],
          ['label[for="registerClassLevel"]', "Clasa / grupa"],
          ['#registerRole option[value="profesor"]', "Profesor"],
          ['#registerRole option[value="elev"]', "Elev"],
          ['#registerForm button[type="submit"]', "Creează cont"],
          ["#registerPanel .auth-switch span", "Ai cont?"],
          ["#showLoginButton", "Autentifică-te!"],
          ["#loginPanel h1", "Autentificare"],
          ["#loginPanel > p", "Intră în contul tău."],
          ['label[for="loginEmail"]', "Email"],
          ['label[for="loginPassword"]', "Parolă"],
          ["#resetPasswordButton", "Ai uitat parola? Resetează parola"],
          ['#loginForm button[type="submit"]', "Autentificare"],
          ["#loginPanel .auth-switch span", "Nu ai cont?"],
          ["#showRegisterButton", "Înregistrează-te!"],
          ["#resetPanel h1", "Resetare parolă"],
          ["#resetPanel > p", "Introdu doar emailul contului tău și îți trimitem linkul de resetare."],
          ['label[for="resetEmail"]', "Email"],
          ['#resetForm button[type="submit"]', "Trimite email de resetare"],
          ["#resetPanel .auth-switch span", "Ți-ai amintit parola?"],
          ["#backToLoginButton", "Revino la autentificare"],
        ],
        placeholders: [
          ["#registerName", "Nume Prenume"],
          ["#registerEmail", "nume@email.com"],
          ["#registerPassword", "Minimum 8 caractere, un număr și un simbol"],
          ["#registerClassLevel", "Ex: VIII-E"],
          ["#loginEmail", "nume@email.com"],
          ["#loginPassword", "Parola ta"],
          ["#resetEmail", "nume@email.com"],
        ],
      },
      ru: {
        title: "Вход | EduPlatform",
        texts: [
          ["#sessionPanel h1", "Активная сессия"],
          ["#sessionPanel p", "Вы уже вошли в платформу."],
          ["#registerPanel h1", "Регистрация"],
          ["#registerPanel > p", "Создайте бесплатный аккаунт на платформе."],
          ['label[for="registerName"]', "Имя"],
          ['label[for="registerEmail"]', "Email"],
          ['label[for="registerPassword"]', "Пароль"],
          ['label[for="registerRole"]', "Роль"],
          ['label[for="registerClassLevel"]', "Класс / группа"],
          ['#registerRole option[value="profesor"]', "Преподаватель"],
          ['#registerRole option[value="elev"]', "Ученик"],
          ['#registerForm button[type="submit"]', "Создать аккаунт"],
          ["#registerPanel .auth-switch span", "Уже есть аккаунт?"],
          ["#showLoginButton", "Войти!"],
          ["#loginPanel h1", "Вход"],
          ["#loginPanel > p", "Войдите в свой аккаунт."],
          ['label[for="loginEmail"]', "Email"],
          ['label[for="loginPassword"]', "Пароль"],
          ["#resetPasswordButton", "Забыли пароль? Сбросить пароль"],
          ['#loginForm button[type="submit"]', "Войти"],
          ["#loginPanel .auth-switch span", "Нет аккаунта?"],
          ["#showRegisterButton", "Зарегистрируйтесь!"],
          ["#resetPanel h1", "Сброс пароля"],
          ["#resetPanel > p", "Введите только email вашего аккаунта, и мы отправим ссылку для сброса."],
          ['label[for="resetEmail"]', "Email"],
          ['#resetForm button[type="submit"]', "Отправить письмо для сброса"],
          ["#resetPanel .auth-switch span", "Вспомнили пароль?"],
          ["#backToLoginButton", "Вернуться ко входу"],
        ],
        placeholders: [
          ["#registerName", "Имя Фамилия"],
          ["#registerEmail", "name@email.com"],
          ["#registerPassword", "Минимум 8 символов, число и спецсимвол"],
          ["#registerClassLevel", "Например: VIII-E"],
          ["#loginEmail", "name@email.com"],
          ["#loginPassword", "Ваш пароль"],
          ["#resetEmail", "name@email.com"],
        ],
      },
    },
    "reset-password.html": {
      ro: {
        title: "Resetare parolă | EduPlatform",
        texts: [
          ["main h1", "Schimbă parola"],
          ["main .auth-card > p", "Setează o parolă nouă pentru contul tău, apoi revino la autentificare."],
          ['label[for="newPassword"]', "Parolă nouă"],
          ['label[for="confirmPassword"]', "Confirmă parola nouă"],
          ['#resetPasswordUpdateForm button[type="submit"]', "Schimbă parola"],
          [".auth-switch span", "Vrei să revii?"],
          [".auth-switch-link", "Înapoi la autentificare"],
        ],
      },
      ru: {
        title: "Смена пароля | EduPlatform",
        texts: [
          ["main h1", "Изменить пароль"],
          ["main .auth-card > p", "Установите новый пароль для аккаунта, затем вернитесь ко входу."],
          ['label[for="newPassword"]', "Новый пароль"],
          ['label[for="confirmPassword"]', "Подтвердите новый пароль"],
          ['#resetPasswordUpdateForm button[type="submit"]', "Изменить пароль"],
          [".auth-switch span", "Хотите вернуться?"],
          [".auth-switch-link", "Назад ко входу"],
        ],
      },
    },
    "resources.html": {
      ro: {
        title: "Catalog resurse | EduPlatform",
        texts: [
          [".page-header .custom-badge", "CATALOG RESURSE"],
          [".page-header .page-title", "Descoperă resurse educaționale pentru profesori"],
          [".page-header .page-subtitle", "Caută materiale didactice, planuri de lecție, fișe de lucru și prezentări pentru diferite clase și discipline."],
          [".upload-card h5", "Ai o resursă utilă?"],
          [".upload-card p", "Încarcă materiale educaționale și ajută alți profesori."],
          ['.upload-card button[data-bs-target="#resourceUploadModal"]', "Încarcă resursă"],
          ['label[for="resourceSearch"]', "Caută resurse"],
          ['label[for="categoryFilter"]', "Categorie"],
          ['label[for="classFilter"]', "Clasa"],
          ["#resetFilters", "Reset"],
          ["main section:nth-of-type(2) .section-title", "Categorii resurse"],
          ["main section:nth-of-type(3) .section-title", "Resurse disponibile"],
          [".sort-select option:nth-child(1)", "Cele mai populare"],
          [".sort-select option:nth-child(2)", "Cele mai noi"],
          [".sort-select option:nth-child(3)", "Rating ridicat"],
          [".category-card:nth-of-type(1) h5", "Informatică"],
          [".category-card:nth-of-type(1) p", "Algoritmi, programare"],
          [".category-card:nth-of-type(2) h5", "Științe"],
          [".category-card:nth-of-type(2) p", "Biologie, chimie, fizică"],
          [".category-card:nth-of-type(3) h5", "Limba Română"],
          [".category-card:nth-of-type(3) p", "Gramatică, literatură"],
          [".category-card:nth-of-type(4) h5", "Matematică"],
          [".category-card:nth-of-type(4) p", "Ecuații, exerciții"],
          [".resource-item:nth-of-type(1) h5", "Introducere în algoritmi"],
          [".resource-item:nth-of-type(1) > .resource-card > p", "Algoritmi, pseudocod și exemple practice."],
          [".resource-item:nth-of-type(2) h5", "Fotosinteza explicată"],
          [".resource-item:nth-of-type(2) > .resource-card > p", "Experiment și fișă de lucru pentru elevi."],
          [".resource-item:nth-of-type(3) h5", "Analiza textului literar"],
          [".resource-item:nth-of-type(3) > .resource-card > p", "Model de analiză și exerciții de interpretare."],
          [".resource-item:nth-of-type(4) h5", "Ecuații de gradul I"],
          [".resource-item:nth-of-type(4) > .resource-card > p", "Exemple rezolvate și probleme practice."],
          [".resource-item:nth-of-type(1) .resource-open-button", "Deschide"],
          [".resource-item:nth-of-type(2) .resource-open-button", "Deschide"],
          [".resource-item:nth-of-type(3) .resource-open-button", "Deschide"],
          [".resource-item:nth-of-type(4) .resource-open-button", "Deschide"],
        ],
        placeholders: [["#resourceSearch", "Ex: informatică, științe, limba română"]],
        options: [
          ["#categoryFilter option:nth-child(1)", "Toate categoriile"],
          ["#categoryFilter option:nth-child(2)", "Informatică"],
          ["#categoryFilter option:nth-child(3)", "Științe"],
          ["#categoryFilter option:nth-child(4)", "Limba Română"],
          ["#categoryFilter option:nth-child(5)", "Matematică"],
          ["#classFilter option:nth-child(1)", "Toate clasele"],
        ],
      },
      ru: {
        title: "Каталог ресурсов | EduPlatform",
        texts: [
          [".page-header .custom-badge", "КАТАЛОГ РЕСУРСОВ"],
          [".page-header .page-title", "Откройте образовательные ресурсы для преподавателей"],
          [".page-header .page-subtitle", "Ищите учебные материалы, планы уроков, рабочие листы и презентации для разных классов и предметов."],
          [".upload-card h5", "Есть полезный ресурс?"],
          [".upload-card p", "Загрузите учебные материалы и помогите другим преподавателям."],
          ['.upload-card button[data-bs-target="#resourceUploadModal"]', "Загрузить ресурс"],
          ['label[for="resourceSearch"]', "Поиск ресурсов"],
          ['label[for="categoryFilter"]', "Категория"],
          ['label[for="classFilter"]', "Класс"],
          ["#resetFilters", "Сброс"],
          ["main section:nth-of-type(2) .section-title", "Категории ресурсов"],
          ["main section:nth-of-type(3) .section-title", "Доступные ресурсы"],
          [".sort-select option:nth-child(1)", "Самые популярные"],
          [".sort-select option:nth-child(2)", "Самые новые"],
          [".sort-select option:nth-child(3)", "Высокий рейтинг"],
          [".category-card:nth-of-type(1) h5", "Информатика"],
          [".category-card:nth-of-type(1) p", "Алгоритмы, программирование"],
          [".category-card:nth-of-type(2) h5", "Науки"],
          [".category-card:nth-of-type(2) p", "Биология, химия, физика"],
          [".category-card:nth-of-type(3) h5", "Румынский язык"],
          [".category-card:nth-of-type(3) p", "Грамматика, литература"],
          [".category-card:nth-of-type(4) h5", "Математика"],
          [".category-card:nth-of-type(4) p", "Уравнения, упражнения"],
          [".resource-item:nth-of-type(1) h5", "Введение в алгоритмы"],
          [".resource-item:nth-of-type(1) > .resource-card > p", "Алгоритмы, псевдокод и практические примеры."],
          [".resource-item:nth-of-type(2) h5", "Фотосинтез объяснён"],
          [".resource-item:nth-of-type(2) > .resource-card > p", "Эксперимент и рабочий лист для учеников."],
          [".resource-item:nth-of-type(3) h5", "Анализ литературного текста"],
          [".resource-item:nth-of-type(3) > .resource-card > p", "Модель анализа и упражнения по интерпретации."],
          [".resource-item:nth-of-type(4) h5", "Уравнения первой степени"],
          [".resource-item:nth-of-type(4) > .resource-card > p", "Решённые примеры и практические задачи."],
          [".resource-item:nth-of-type(1) .resource-open-button", "Открыть"],
          [".resource-item:nth-of-type(2) .resource-open-button", "Открыть"],
          [".resource-item:nth-of-type(3) .resource-open-button", "Открыть"],
          [".resource-item:nth-of-type(4) .resource-open-button", "Открыть"],
        ],
        placeholders: [["#resourceSearch", "Например: информатика, науки, румынский язык"]],
        options: [
          ["#categoryFilter option:nth-child(1)", "Все категории"],
          ["#categoryFilter option:nth-child(2)", "Информатика"],
          ["#categoryFilter option:nth-child(3)", "Науки"],
          ["#categoryFilter option:nth-child(4)", "Румынский язык"],
          ["#categoryFilter option:nth-child(5)", "Математика"],
          ["#classFilter option:nth-child(1)", "Все классы"],
        ],
      },
    },
    "community.html": {
      ro: {
        title: "Comunități | EduPlatform",
        texts: [
          [".page-header .custom-badge", "COMUNITĂȚI"],
          [".page-header .page-title", "Grupuri și discuții pentru profesori"],
          [".page-header .page-subtitle", "Grupe tematice, schimb de idei și postări scurte pentru colaborare între profesori, moderatori și organizatori."],
          ["main section.info-card .section-title", "Ce poți face aici"],
          ["main section.info-card .mb-0.text-secondary", "În comunități poți urmări feed-uri tematice, publica întrebări rapide, împărtăși bune practici și coordona resurse pe discipline."],
          [".community-mini-meta span:nth-of-type(1)", "Grupuri tematice"],
          [".community-mini-meta span:nth-of-type(2)", "Postări rapide"],
          [".community-mini-meta span:nth-of-type(3)", "Moderare prin roluri"],
          ["#communityCreateSection .section-title", "Creează o comunitate nouă"],
          ["#communityCreateSection .text-secondary", "Profesorii pot crea comunități dedicate pentru o clasă exactă și o materie."],
          ['label[for="communityName"]', "Nume comunitate"],
          ['label[for="communitySubject"]', "Materie"],
          ['label[for="communityTargetClass"]', "Clasa țintă"],
          ['label[for="communityIcon"]', "Icon"],
          ['label[for="communityFocusArea"]', "Etichetă scurtă"],
          ['label[for="communityDescription"]', "Descriere"],
          ["#communityCreateSubmitButton", "Creează comunitatea"],
          ["main section.mb-5 .section-title", "Grupe disponibile"],
          ["main section.mb-5 .text-secondary", "Alege un grup pentru a vedea feed-ul și pentru a publica o postare."],
          ["#communityJoinButton", "Join comunitate"],
          ["#communityRefreshPostsButton", "Actualizează feed"],
        ],
      },
      ru: {
        title: "Сообщества | EduPlatform",
        texts: [
          [".page-header .custom-badge", "СООБЩЕСТВА"],
          [".page-header .page-title", "Группы и обсуждения для преподавателей"],
          [".page-header .page-subtitle", "Тематические группы, обмен идеями и короткие публикации для сотрудничества преподавателей, модераторов и организаторов."],
          ["main section.info-card .section-title", "Что можно делать здесь"],
          ["main section.info-card .mb-0.text-secondary", "В сообществах можно следить за тематическими лентами, публиковать быстрые вопросы, делиться хорошими практиками и координировать ресурсы по предметам."],
          [".community-mini-meta span:nth-of-type(1)", "Тематические группы"],
          [".community-mini-meta span:nth-of-type(2)", "Быстрые публикации"],
          [".community-mini-meta span:nth-of-type(3)", "Модерация по ролям"],
          ["#communityCreateSection .section-title", "Создать новое сообщество"],
          ["#communityCreateSection .text-secondary", "Преподаватели могут создавать сообщества для конкретного класса и предмета."],
          ['label[for="communityName"]', "Название сообщества"],
          ['label[for="communitySubject"]', "Предмет"],
          ['label[for="communityTargetClass"]', "Целевой класс"],
          ['label[for="communityIcon"]', "Иконка"],
          ['label[for="communityFocusArea"]', "Короткая метка"],
          ['label[for="communityDescription"]', "Описание"],
          ["#communityCreateSubmitButton", "Создать сообщество"],
          ["main section.mb-5 .section-title", "Доступные группы"],
          ["main section.mb-5 .text-secondary", "Выберите группу, чтобы увидеть ленту и публиковать сообщения."],
          ["#communityJoinButton", "Вступить в сообщество"],
          ["#communityRefreshPostsButton", "Обновить ленту"],
        ],
      },
    },
    "webinars.html": {
      ro: {
        title: "Webinarii | EduPlatform",
        texts: [
          [".page-header .custom-badge", "EDUPLATFORM"],
          [".page-header .page-title", "Webinarii"],
          [".page-header .page-subtitle", "Participă la sesiuni educaționale și cursuri pentru profesori."],
          ["#webinarLibrarySection .section-title", "Cursurile mele video"],
          ["#webinarLibrarySection .text-secondary", "După înscriere, aici găsești lecțiile video și materialele pentru cursurile la care ai acces."],
          ["#webinarRecommendedSection .section-title", "Webinarii recomandate"],
          ["#webinarRecommendedSection .text-secondary", "La final, poți descoperi și alte sesiuni utile care merită urmărite."],
        ],
        aria: [
          ["#webinarsPrevButton", "Webinar anterior"],
          ["#webinarsNextButton", "Webinar următor"],
          ["#webinarsDots", "Navigare webinarii"],
        ],
      },
      ru: {
        title: "Вебинары | EduPlatform",
        texts: [
          [".page-header .custom-badge", "EDUPLATFORM"],
          [".page-header .page-title", "Вебинары"],
          [".page-header .page-subtitle", "Участвуйте в образовательных сессиях и курсах для преподавателей."],
          ["#webinarLibrarySection .section-title", "Мои видеокурсы"],
          ["#webinarLibrarySection .text-secondary", "После регистрации здесь появятся видеоуроки и материалы курсов, к которым у вас есть доступ."],
          ["#webinarRecommendedSection .section-title", "Рекомендуемые вебинары"],
          ["#webinarRecommendedSection .text-secondary", "В конце вы можете открыть и другие полезные сессии, которые стоит посмотреть."],
        ],
        aria: [
          ["#webinarsPrevButton", "Предыдущий вебинар"],
          ["#webinarsNextButton", "Следующий вебинар"],
          ["#webinarsDots", "Навигация по вебинарам"],
        ],
      },
    },
    "contact.html": {
      ro: {
        title: "Contact și GDPR | EduPlatform",
        texts: [
          [".page-header .custom-badge", "CONTACT"],
          [".page-header .page-title", "Contact și GDPR"],
          [".page-header .page-subtitle", "Informații utile pentru utilizatori, profesori și instituții."],
          ["main .details-card:nth-of-type(1) h2", "Contact"],
          ["main .details-card:nth-of-type(1) p", "Pentru suport, corectarea datelor sau întrebări despre cont, ne poți lăsa un mesaj folosind formularul de mai jos."],
          ['label[for="contactName"]', "Nume"],
          ['label[for="contactEmail"]', "Email"],
          ['label[for="contactMessage"]', "Mesaj"],
          ["#gdpr h2", "GDPR"],
          ["main .details-card:last-child h2", "Drepturile tale"],
          ['button[type="button"].custom-btn', "Trimite mesaj"],
        ],
        placeholders: [
          ["#contactName", "Nume Prenume"],
          ["#contactEmail", "nume@email.com"],
          ["#contactMessage", "Scrie mesajul tău aici"],
        ],
      },
      ru: {
        title: "Контакт и GDPR | EduPlatform",
        texts: [
          [".page-header .custom-badge", "КОНТАКТ"],
          [".page-header .page-title", "Контакт и GDPR"],
          [".page-header .page-subtitle", "Полезная информация для пользователей, преподавателей и учреждений."],
          ["main .details-card:nth-of-type(1) h2", "Контакт"],
          ["main .details-card:nth-of-type(1) p", "Для поддержки, исправления данных или вопросов об аккаунте вы можете отправить сообщение через форму ниже."],
          ['label[for="contactName"]', "Имя"],
          ['label[for="contactEmail"]', "Email"],
          ['label[for="contactMessage"]', "Сообщение"],
          ["#gdpr h2", "GDPR"],
          ["main .details-card:last-child h2", "Ваши права"],
          ['button[type="button"].custom-btn', "Отправить сообщение"],
        ],
        placeholders: [
          ["#contactName", "Имя Фамилия"],
          ["#contactEmail", "name@email.com"],
          ["#contactMessage", "Напишите ваше сообщение здесь"],
        ],
      },
    },
    "student-dashboard.html": {
      ro: {
        title: "Dashboard elev | EduPlatform",
        texts: [
          [".page-header .custom-badge", "ELEV"],
          ["main .info-card:nth-of-type(1) h5", "Clase înscrise"],
          ["main .info-card:nth-of-type(2) h5", "Fișiere disponibile"],
          ["main .info-card:nth-of-type(3) h5", "Comunități"],
          ["main .info-card:nth-of-type(4) h5", "Email cont"],
          ["main .details-card:nth-of-type(1) h2", "Date cont"],
          ["main .details-card:nth-of-type(2) h2", "Clasele mele"],
          ["main .details-card:nth-of-type(3) h2", "Fișiere pentru clasele mele"],
          ["main .details-card:nth-of-type(4) h2", "Comunitățile tale"],
          ['main a[href="profile.html"].custom-btn', "Deschide profilul"],
          ['main a[href="resources.html"].btn-outline-primary', "Vezi toate resursele"],
          ['main a[href="community.html"].btn-outline-primary', "Deschide comunități"],
        ],
      },
      ru: {
        title: "Панель ученика | EduPlatform",
        texts: [
          [".page-header .custom-badge", "УЧЕНИК"],
          ["main .info-card:nth-of-type(1) h5", "Записанные классы"],
          ["main .info-card:nth-of-type(2) h5", "Доступные файлы"],
          ["main .info-card:nth-of-type(3) h5", "Сообщества"],
          ["main .info-card:nth-of-type(4) h5", "Email аккаунта"],
          ["main .details-card:nth-of-type(1) h2", "Данные аккаунта"],
          ["main .details-card:nth-of-type(2) h2", "Мои классы"],
          ["main .details-card:nth-of-type(3) h2", "Файлы для моих классов"],
          ["main .details-card:nth-of-type(4) h2", "Ваши сообщества"],
          ['main a[href="profile.html"].custom-btn', "Открыть профиль"],
          ['main a[href="resources.html"].btn-outline-primary', "Все ресурсы"],
          ['main a[href="community.html"].btn-outline-primary', "Открыть сообщества"],
        ],
      },
    },
    "teachers-dashboard.html": {
      ro: {
        title: "Dashboard profesor | EduPlatform",
        texts: [
          [".page-header .custom-badge", "PROFESOR"],
          [".page-header .page-title", "Dashboard profesor"],
          ["main .info-card:nth-of-type(1) h5", "Resurse încărcate"],
          ["main .info-card:nth-of-type(2) h5", "Descărcări"],
          ["main .info-card:nth-of-type(3) h5", "Rating mediu"],
          ["main .details-card h2", "Încarcă o resursă nouă"],
          ['label[for="resourceTitle"]', "Titlu resursă"],
          ['label[for="resourceCategory"]', "Categorie"],
          ['label[for="resourceClassLevel"]', "Clasa"],
          ['label[for="resourceFormat"]', "Format"],
          ['label[for="resourceLicense"]', "Licență"],
          ['label[for="resourceDescription"]', "Descriere"],
          ['label[for="resourceFile"]', "Încarcă fișier"],
          ['#publishResourceButton', "Publică resursa"],
        ],
      },
      ru: {
        title: "Панель преподавателя | EduPlatform",
        texts: [
          [".page-header .custom-badge", "ПРЕПОДАВАТЕЛЬ"],
          [".page-header .page-title", "Панель преподавателя"],
          ["main .info-card:nth-of-type(1) h5", "Загруженные ресурсы"],
          ["main .info-card:nth-of-type(2) h5", "Скачивания"],
          ["main .info-card:nth-of-type(3) h5", "Средний рейтинг"],
          ["main .details-card h2", "Загрузить новый ресурс"],
          ['label[for="resourceTitle"]', "Название ресурса"],
          ['label[for="resourceCategory"]', "Категория"],
          ['label[for="resourceClassLevel"]', "Класс"],
          ['label[for="resourceFormat"]', "Формат"],
          ['label[for="resourceLicense"]', "Лицензия"],
          ['label[for="resourceDescription"]', "Описание"],
          ['label[for="resourceFile"]', "Загрузить файл"],
          ['#publishResourceButton', "Опубликовать ресурс"],
        ],
      },
    },
    "admin.html": {
      ro: {
        title: "Dashboard admin | EduPlatform",
        texts: [
          [".page-header .custom-badge", "ADMIN"],
          [".page-header .page-title", "Dashboard administrare"],
          ["#adminAuthSection h2", "Intrare admin"],
          ['label[for="adminEmail"]', "Email admin"],
          ['label[for="adminPassword"]', "Parolă"],
          ["#adminLoginButton", "Intră în dashboard"],
          ["#adminDashboardSection .section-title", "Control centru"],
        ],
        placeholders: [
          ["#adminEmail", "admin@exemplu.ro"],
          ["#adminPassword", "Introdu parola contului de admin"],
        ],
      },
      ru: {
        title: "Панель администратора | EduPlatform",
        texts: [
          [".page-header .custom-badge", "АДМИН"],
          [".page-header .page-title", "Панель администрирования"],
          ["#adminAuthSection h2", "Вход администратора"],
          ['label[for="adminEmail"]', "Email администратора"],
          ['label[for="adminPassword"]', "Пароль"],
          ["#adminLoginButton", "Войти в панель"],
          ["#adminDashboardSection .section-title", "Центр управления"],
        ],
        placeholders: [
          ["#adminEmail", "admin@example.ru"],
          ["#adminPassword", "Введите пароль аккаунта администратора"],
        ],
      },
    },
    "profile.html": {
      ro: {
        title: "Profil | EduPlatform",
        texts: [
          ["main .info-card h5", "Informații profil"],
          ['#uploadResourceCta', "Încarcă resursă"],
          ['#logoutButton', "Deconectare"],
          ["main .details-card h2", "Resursele mele"],
          [".details-card small.text-muted", "Poți edita sau șterge resursele publicate de tine."],
          ["#editResourceModalLabel", "Editează resursa"],
          ['#saveResourceChangesButton', "Salvează modificările"],
        ],
      },
      ru: {
        title: "Профиль | EduPlatform",
        texts: [
          ["main .info-card h5", "Информация профиля"],
          ['#uploadResourceCta', "Загрузить ресурс"],
          ['#logoutButton', "Выйти"],
          ["main .details-card h2", "Мои ресурсы"],
          [".details-card small.text-muted", "Вы можете редактировать или удалять опубликованные вами ресурсы."],
          ["#editResourceModalLabel", "Редактировать ресурс"],
          ['#saveResourceChangesButton', "Сохранить изменения"],
        ],
      },
    },
    "resource-matematica.html": buildResourceTranslations({
      ro: {
        title: "Detalii resursă | EduPlatform",
        badge: "MATEMATICĂ · CLASA A 7-A",
        heading: "Lecție Matematică: Ecuații de gradul I",
        subtitle: "Material didactic pentru predarea ecuațiilor de gradul I, cu exemple, exerciții și fișă de lucru.",
      },
      ru: {
        title: "Детали ресурса | EduPlatform",
        badge: "МАТЕМАТИКА · 7 КЛАСС",
        heading: "Урок математики: уравнения первой степени",
        subtitle: "Учебный материал для преподавания уравнений первой степени с примерами, упражнениями и рабочим листом.",
      },
    }),
    "resource-informatica.html": buildResourceTranslations({
      ro: {
        title: "Informatică | EduPlatform",
        badge: "INFORMATICĂ · CLASA A 9-A",
        heading: "Lecție Informatică: Algoritmi și pseudocod",
        subtitle: "Material didactic pentru introducerea elevilor în algoritmi, pași logici și pseudocod.",
      },
      ru: {
        title: "Информатика | EduPlatform",
        badge: "ИНФОРМАТИКА · 9 КЛАСС",
        heading: "Урок информатики: алгоритмы и псевдокод",
        subtitle: "Учебный материал для введения учеников в алгоритмы, логические шаги и псевдокод.",
      },
    }),
    "resource-biologie.html": buildResourceTranslations({
      ro: {
        title: "Biologie | EduPlatform",
        badge: "ȘTIINȚE · CLASA A 8-A",
        heading: "Lecție Biologie: Fotosinteza",
        subtitle: "Material didactic pentru explicarea fotosintezei, cu experiment și fișă de lucru.",
      },
      ru: {
        title: "Биология | EduPlatform",
        badge: "НАУКИ · 8 КЛАСС",
        heading: "Урок биологии: фотосинтез",
        subtitle: "Учебный материал для объяснения фотосинтеза с экспериментом и рабочим листом.",
      },
    }),
    "resource-fizica.html": buildResourceTranslations({
      ro: {
        title: "Fizică | EduPlatform",
        badge: "ȘTIINȚE · CLASA A 8-A",
        heading: "Lecție Fizică: Circuitul electric simplu",
        subtitle: "Material didactic pentru introducerea noțiunilor de circuit electric și componente de bază.",
      },
      ru: {
        title: "Физика | EduPlatform",
        badge: "НАУКИ · 8 КЛАСС",
        heading: "Урок физики: простая электрическая цепь",
        subtitle: "Учебный материал для введения понятий электрической цепи и базовых компонентов.",
      },
    }),
    "resource-romana.html": buildResourceTranslations({
      ro: {
        title: "Limba română | EduPlatform",
        badge: "LIMBA ROMÂNĂ · CLASA A 8-A",
        heading: "Lecție Limba Română: Analiza textului literar",
        subtitle: "Material didactic pentru analiza textului literar, cu exemple și exerciții de interpretare.",
      },
      ru: {
        title: "Румынский язык | EduPlatform",
        badge: "РУМЫНСКИЙ ЯЗЫК · 8 КЛАСС",
        heading: "Урок румынского языка: анализ литературного текста",
        subtitle: "Учебный материал по анализу литературного текста с примерами и упражнениями на интерпретацию.",
      },
    }),
  };

  window.eduPlatformI18n = {
    getLanguage: () => currentLanguage,
  };

  ensureLanguageSwitcher();
  bindLanguageButtons();
  applyTranslations(currentLanguage);
  observeNavbar();
  observeDocument();

  function loadLanguage() {
    const saved = window.localStorage.getItem(languageStorageKey);
    if (saved === "ru" || saved === "ro") return saved;
    const legacy = window.localStorage.getItem(legacyLanguageStorageKey);
    if (legacy === "ru" || legacy === "ro") {
      window.localStorage.setItem(languageStorageKey, legacy);
      return legacy;
    }
    return "ro";
  }

  function ensureLanguageSwitcher() {
    if (!navbarList) return;

    let switcherItem = navbarList.querySelector(".language-switcher-nav-item");
    if (!switcherItem) {
      const existingSwitchers = Array.from(navbarList.querySelectorAll(".language-switcher"));
      if (existingSwitchers.length) {
        switcherItem = existingSwitchers[0].closest("li");
        switcherItem?.classList.add("language-switcher-nav-item");

        existingSwitchers.slice(1).forEach(switcher => {
          switcher.closest("li")?.remove();
        });
      }
    }

    if (!switcherItem) {
      switcherItem = document.createElement("li");
      switcherItem.className = "nav-item language-switcher-nav-item";
      switcherItem.innerHTML = `
        <div class="language-switcher navbar-language-switcher" role="group" aria-label="">
          <button type="button" class="language-switcher-button" data-lang="ro">RO</button>
          <button type="button" class="language-switcher-button" data-lang="ru">RU</button>
        </div>
      `;
    }

    const dropdownItem = navbarList.querySelector(".nav-item.dropdown");
    const registerItem = Array.from(navbarList.querySelectorAll('a[href*="#register"]'))
      .map(link => link.closest("li"))
      .find(Boolean);

    if (!switcherItem.parentElement) {
      if (dropdownItem) {
        navbarList.insertBefore(switcherItem, dropdownItem);
      } else if (registerItem) {
        navbarList.insertBefore(switcherItem, registerItem.nextSibling);
      } else {
        navbarList.appendChild(switcherItem);
      }
    }
  }

  function bindLanguageButtons() {
    document.querySelectorAll(".language-switcher-button").forEach(button => {
      if (button.dataset.i18nBound === "true") return;
      button.dataset.i18nBound = "true";
      button.addEventListener("click", () => {
        const nextLanguage = button.dataset.lang === "ru" ? "ru" : "ro";
        if (nextLanguage === currentLanguage) return;
        currentLanguage = nextLanguage;
        window.localStorage.setItem(languageStorageKey, currentLanguage);
        window.localStorage.setItem(legacyLanguageStorageKey, currentLanguage);
        applyTranslations(currentLanguage);
        window.dispatchEvent(new CustomEvent("eduplatform:languagechange", { detail: { language: currentLanguage } }));
      });
    });
  }

  function observeNavbar() {
    if (!navbarList) return;
    navbarObserver = new MutationObserver(() => {
      if (isApplyingTranslations) return;
      scheduleReapply();
    });
    navbarObserver.observe(navbarList, { childList: true, subtree: true });
  }

  function observeDocument() {
    if (!document.body) return;
    documentObserver = new MutationObserver(() => {
      if (isApplyingTranslations) return;
      scheduleReapply();
    });
    documentObserver.observe(document.body, { childList: true, subtree: true });
  }

  function scheduleReapply() {
    if (observerScheduled) return;
    observerScheduled = true;
    window.requestAnimationFrame(() => {
      observerScheduled = false;
      ensureLanguageSwitcher();
      bindLanguageButtons();
      applyTranslations(currentLanguage, true);
    });
  }

  function applyTranslations(language, skipPersist = false) {
    isApplyingTranslations = true;

    const common = commonTranslations[language] || commonTranslations.ro;
    const pageConfig = pageTranslations[pageName]?.[language];

    document.documentElement.lang = language === "ru" ? "ru" : "ro";
    updateLanguageButtons(language, common.languageLabel);
    applyCommonNav(common);
    applyCommonFooter(common);
    applyDropdown(common);

    if (pageConfig?.title) {
      document.title = pageConfig.title;
    }

    applyEntries(pageConfig?.texts);
    applyPlaceholders(pageConfig?.placeholders);
    applyAria(pageConfig?.aria);
    applyEntries(pageConfig?.options);

    if (!skipPersist) {
      window.localStorage.setItem(languageStorageKey, language);
      window.localStorage.setItem(legacyLanguageStorageKey, language);
    }

    window.setTimeout(() => {
      isApplyingTranslations = false;
    }, 0);
  }

  function updateLanguageButtons(language, label) {
    const switcher = document.querySelector(".navbar-language-switcher");
    if (switcher) switcher.setAttribute("aria-label", label);
    document.querySelectorAll(".language-switcher-button").forEach(button => {
      button.classList.toggle("active", button.dataset.lang === language);
    });
  }

  function applyCommonNav(common) {
    document.querySelectorAll(".navbar-nav a").forEach(link => {
      const href = (link.getAttribute("href") || "").toLowerCase();
      if (href.includes("resources")) link.textContent = common.nav.resources;
      if (href.includes("webinars")) link.textContent = common.nav.webinars;
      if (href.includes("community")) link.textContent = common.nav.community;
      if (href.includes("profile")) link.textContent = common.nav.profile;
      if (href.includes("login") && href.includes("#register")) link.textContent = common.nav.register;
      if ((href === "login.html" || href.includes("#login") || href.endsWith("/login")) && !href.includes("#register")) {
        link.textContent = common.nav.login;
      }
    });
  }

  function applyCommonFooter(common) {
    const footer = document.querySelector(".footer");
    if (!footer) return;

    const about = footer.querySelector(".col-lg-4 p");
    if (about) about.textContent = common.footer.about;

    footer.querySelectorAll("h6").forEach(heading => {
      const text = normalize(heading.textContent);
      if (text.includes("plat")) heading.textContent = common.footer.platform;
      if (text.includes("suport") || text.includes("support")) heading.textContent = common.footer.support;
    });

    footer.querySelectorAll("a").forEach(link => {
      const href = (link.getAttribute("href") || "").toLowerCase();
      if (href.includes("resources")) link.textContent = common.nav.resources;
      if (href.includes("webinars")) link.textContent = common.nav.webinars;
      if (href.includes("community")) link.textContent = common.nav.community;
      if (href.includes("profile")) link.textContent = common.nav.profile;
      if (href === "contact.html") link.textContent = common.footer.contact;
      if (href.includes("#gdpr")) link.textContent = common.footer.gdpr;
    });

    const copy = footer.querySelector("p.small.text-center");
    if (copy) copy.textContent = common.footer.copy;
  }

  function applyDropdown(common) {
    document.querySelectorAll(".dropdown-menu a, .dropdown-menu button").forEach(item => {
      const href = (item.getAttribute("href") || "").toLowerCase();
      if (href.includes("profile")) item.textContent = common.chrome.myProfile;
      if (href.includes("teachers-dashboard")) item.textContent = common.chrome.teacherDashboard;
      if (href.includes("student-dashboard")) item.textContent = common.chrome.studentDashboard;
      if (href.includes("admin.html")) item.textContent = common.chrome.adminDashboard;
      if (item.id === "logoutNavButton") item.textContent = common.chrome.logout;
    });
  }

  function applyEntries(entries = []) {
    entries.forEach(([selector, text]) => {
      const element = document.querySelector(selector);
      if (element) element.textContent = text;
    });
  }

  function applyPlaceholders(entries = []) {
    entries.forEach(([selector, text]) => {
      const element = document.querySelector(selector);
      if (element) element.setAttribute("placeholder", text);
    });
  }

  function applyAria(entries = []) {
    entries.forEach(([selector, text]) => {
      const element = document.querySelector(selector);
      if (element) element.setAttribute("aria-label", text);
    });
  }

  function normalize(text) {
    return (text || "")
      .toLowerCase()
      .replaceAll("ă", "a")
      .replaceAll("â", "a")
      .replaceAll("î", "i")
      .replaceAll("ș", "s")
      .replaceAll("ş", "s")
      .replaceAll("ț", "t")
      .replaceAll("ţ", "t");
  }

  function buildResourceTranslations(config) {
    return {
      ro: {
        title: config.ro.title,
        texts: [
          [".back-link", "Înapoi la catalog"],
          [".page-header .custom-badge", config.ro.badge],
          [".page-header .page-title", config.ro.heading],
          [".page-header .page-subtitle", config.ro.subtitle],
          [".download-box h5", "Fișier PDF"],
          [".download-box .btn.btn-primary", "Descarcă resursa"],
          [".download-box .btn.btn-outline-primary", "Salvează în profil"],
          ["main .details-card:nth-of-type(1) h2", "Descrierea resursei"],
          ["main .details-card:nth-of-type(2) h2", "Evaluări și comentarii"],
          ["aside.details-card.mb-4 h2", "Informații"],
          ["aside.details-card:last-child h2", "Resurse recomandate"],
        ],
      },
      ru: {
        title: config.ru.title,
        texts: [
          [".back-link", "Назад к каталогу"],
          [".page-header .custom-badge", config.ru.badge],
          [".page-header .page-title", config.ru.heading],
          [".page-header .page-subtitle", config.ru.subtitle],
          [".download-box h5", "PDF файл"],
          [".download-box .btn.btn-primary", "Скачать ресурс"],
          [".download-box .btn.btn-outline-primary", "Сохранить в профиле"],
          ["main .details-card:nth-of-type(1) h2", "Описание ресурса"],
          ["main .details-card:nth-of-type(2) h2", "Оценки и комментарии"],
          ["aside.details-card.mb-4 h2", "Информация"],
          ["aside.details-card:last-child h2", "Рекомендуемые ресурсы"],
        ],
      },
    };
  }
});
