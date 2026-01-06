import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Переводы для разных языков
const resources = {
 en: {
    translation: {
      "messenger": "Messenger",
      "chat": "Chat",
      "help": "Help",
      "login": "Login",
      "username": "Username",
      "password": "Password",
      "send": "Send",
      "typeMessage": "Type a message...",
      "selectLanguage": "Select Language",
      "setupInstructions": "Setup Instructions",
      "helpContent": "Welcome to the Messenger application. Here you can communicate with other users in real-time. To get started, simply login with your credentials and select a chat to start messaging.",
      "webClientHelp": "Web Client Help",
      "javaClientHelp": "Java Client Help",
      "serverConnection": "Server Connection",
      "troubleshooting": "Troubleshooting"
    }
  },
  ru: {
    translation: {
      "messenger": "Мессенджер",
      "chat": "Чат",
      "help": "Помощь",
      "login": "Вход",
      "username": "Имя пользователя",
      "password": "Пароль",
      "send": "Отправить",
      "typeMessage": "Введите сообщение...",
      "selectLanguage": "Выбрать язык",
      "setupInstructions": "Инструкции по настройке",
      "helpContent": "Добро пожаловать в приложение Мессенджер. Здесь вы можете общаться с другими пользователями в режиме реального времени. Чтобы начать, просто войдите в систему с вашими учетными данными и выберите чат для начала общения.",
      "webClientHelp": "Помощь по веб-клиенту",
      "javaClientHelp": "Помощь по Java-клиенту",
      "serverConnection": "Подключение к серверу",
      "troubleshooting": "Устранение неполадок"
    }
 },
  es: {
    translation: {
      "messenger": "Mensajero",
      "chat": "Chat",
      "help": "Ayuda",
      "login": "Iniciar sesión",
      "username": "Nombre de usuario",
      "password": "Contraseña",
      "send": "Enviar",
      "typeMessage": "Escribe un mensaje...",
      "selectLanguage": "Seleccionar idioma",
      "setupInstructions": "Instrucciones de configuración",
      "helpContent": "Bienvenido a la aplicación de mensajería. Aquí puedes comunicarte con otros usuarios en tiempo real. Para comenzar, simplemente inicia sesión con tus credenciales y selecciona un chat para comenzar a enviar mensajes.",
      "webClientHelp": "Ayuda del cliente web",
      "javaClientHelp": "Ayuda del cliente Java",
      "serverConnection": "Conexión al servidor",
      "troubleshooting": "Solución de problemas"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // язык по умолчанию
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;