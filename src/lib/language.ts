export type Language = "ru" | "kk" | "en";
export const languageLocales: Record<Language, string> = { ru: "ru-RU", kk: "kk-KZ", en: "en-GB" };
export const isLanguage = (value: unknown): value is Language => value === "ru" || value === "kk" || value === "en";

const ru = {
  city: "Город", allCities: "Все города", unknownCity: "Город не указан", language: "Язык интерфейса",
  search: "Поиск событий", searchPlaceholder: "Поиск событий…", notifications: "Уведомления", support: "Поддержка",
  organizer: "Кабинет организатора", becomeOrganizer: "Стать организатором", checkIn: "Check-in", platform: "Панель платформы", users: "Пользователи",
  myTickets: "Мои билеты", profile: "Профиль", login: "Войти", logout: "Выйти", categories: "Категории", all: "Все",
  popular: "Популярные события", searchResults: "Результаты поиска «{query}»", noResults: "Ничего не найдено. Попробуйте другой город, дату или запрос.",
  noEvents: "Пока нет опубликованных событий.", resetFilters: "Сбросить фильтры", showMore: "Показать ещё", dateSelection: "Выбор даты", today: "Сегодня", chooseDate: "Выбрать дату",
  tickets: "Билеты", noTicketsRequired: "Билеты не требуются", free: "Бесплатно", fromPrice: "от {price}", buyTicket: "Купить билет",
  poster: "Постер", eventPoster: "Постер события", posterFailed: "Не удалось загрузить постер", retry: "Повторить", genericError: "Что-то пошло не так",
  loginToSeeEvents: "Чтобы увидеть события, войдите в аккаунт.",
  loginOrRegister: "Вход или регистрация", signInByEmail: "Войдите по электронной почте", signInTab: "Вход", registerTab: "Регистрация",
  password: "Пароль", repeatPassword: "Повторите пароль", validEmail: "Введите корректный email", passwordMinimum: "Минимум 6 символов",
  passwordsDiffer: "Пароли не совпадают", wait: "Подождите…", register: "Зарегистрироваться", forgotPassword: "Забыли пароль?",
  agreement: "Нажимая «{action}», вы принимаете условия Пользовательского соглашения", close: "Закрыть",
  verifyNotice: "Подтвердите email {email}: после регистрации на него отправляется письмо со ссылкой.", resendEmail: "Отправить письмо повторно", refreshStatus: "Обновить статус",
  emailSent: "Если для адреса требуется подтверждение, письмо отправлено. Проверьте входящие и спам; повторная отправка доступна не чаще раза в минуту.",
};
export type TranslationKey = keyof typeof ru;
type Dictionary = Record<TranslationKey, string>;
export const translations: Record<Language, Dictionary> = {
  ru,
  kk: {
    city: "Қала", allCities: "Барлық қалалар", unknownCity: "Қала көрсетілмеген", language: "Интерфейс тілі",
    search: "Іс-шараларды іздеу", searchPlaceholder: "Іс-шараларды іздеу…", notifications: "Хабарландырулар", support: "Қолдау",
    organizer: "Ұйымдастырушы кабинеті", becomeOrganizer: "Ұйымдастырушы болу", checkIn: "Кіруді тексеру", platform: "Платформа панелі", users: "Пайдаланушылар",
    myTickets: "Менің билеттерім", profile: "Профиль", login: "Кіру", logout: "Шығу", categories: "Санаттар", all: "Барлығы",
    popular: "Танымал іс-шаралар", searchResults: "«{query}» іздеу нәтижелері", noResults: "Ештеңе табылмады. Басқа қаланы, күнді немесе сұрауды таңдаңыз.",
    noEvents: "Әзірге жарияланған іс-шаралар жоқ.", resetFilters: "Сүзгілерді тазарту", showMore: "Тағы көрсету", dateSelection: "Күнді таңдау", today: "Бүгін", chooseDate: "Күнді таңдау",
    tickets: "Билеттер", noTicketsRequired: "Билет қажет емес", free: "Тегін", fromPrice: "{price} бастап", buyTicket: "Билет сатып алу",
    poster: "Афиша", eventPoster: "Іс-шара афишасы", posterFailed: "Афишаны жүктеу мүмкін болмады", retry: "Қайталау", genericError: "Қате пайда болды",
    loginToSeeEvents: "Іс-шараларды көру үшін аккаунтқа кіріңіз.",
    loginOrRegister: "Кіру немесе тіркелу", signInByEmail: "Электрондық пошта арқылы кіріңіз", signInTab: "Кіру", registerTab: "Тіркелу",
    password: "Құпиясөз", repeatPassword: "Құпиясөзді қайталаңыз", validEmail: "Дұрыс email енгізіңіз", passwordMinimum: "Кемінде 6 таңба",
    passwordsDiffer: "Құпиясөздер сәйкес келмейді", wait: "Күте тұрыңыз…", register: "Тіркелу", forgotPassword: "Құпиясөзді ұмыттыңыз ба?",
    agreement: "«{action}» түймесін басу арқылы Пайдаланушы келісімінің шарттарын қабылдайсыз", close: "Жабу",
    verifyNotice: "{email} мекенжайын растаңыз: тіркелгеннен кейін сілтемесі бар хат жіберіледі.", resendEmail: "Хатты қайта жіберу", refreshStatus: "Күйді жаңарту",
    emailSent: "Мекенжайды растау қажет болса, хат жіберілді. Кіріс хаттар мен спамды тексеріңіз; хатты минутына бір реттен жиі қайта жіберу мүмкін емес.",
  },
  en: {
    city: "City", allCities: "All cities", unknownCity: "City not specified", language: "Interface language",
    search: "Search events", searchPlaceholder: "Search events…", notifications: "Notifications", support: "Support",
    organizer: "Organizer dashboard", becomeOrganizer: "Become an organizer", checkIn: "Check-in", platform: "Platform dashboard", users: "Users",
    myTickets: "My tickets", profile: "Profile", login: "Sign in", logout: "Sign out", categories: "Categories", all: "All",
    popular: "Popular events", searchResults: "Search results for “{query}”", noResults: "No events found. Try another city, date or search.",
    noEvents: "No published events yet.", resetFilters: "Clear filters", showMore: "Show more", dateSelection: "Choose a date", today: "Today", chooseDate: "Choose a date",
    tickets: "Tickets", noTicketsRequired: "No tickets required", free: "Free", fromPrice: "from {price}", buyTicket: "Buy tickets",
    poster: "Poster", eventPoster: "Event poster", posterFailed: "Could not load the poster", retry: "Try again", genericError: "Something went wrong",
    loginToSeeEvents: "Sign in to see events.",
    loginOrRegister: "Sign in or register", signInByEmail: "Sign in with your email", signInTab: "Sign in", registerTab: "Register",
    password: "Password", repeatPassword: "Repeat password", validEmail: "Enter a valid email", passwordMinimum: "At least 6 characters",
    passwordsDiffer: "Passwords do not match", wait: "Please wait…", register: "Register", forgotPassword: "Forgot password?",
    agreement: "By clicking “{action}”, you accept the User Agreement", close: "Close",
    verifyNotice: "Verify your email {email}: a confirmation link is sent after registration.", resendEmail: "Resend email", refreshStatus: "Refresh status",
    emailSent: "If this address needs verification, an email has been sent. Check your inbox and spam; emails can be resent at most once a minute.",
  },
};
export function translate(language: Language, key: TranslationKey, values: Record<string, string> = {}) {
  return translations[language][key].replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
}
