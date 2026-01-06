package com.messenger.client.controller;

import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.layout.VBox;
import javafx.scene.paint.Color;
import javafx.scene.text.Text;
import javafx.scene.text.TextFlow;
import javafx.stage.Stage;

import java.util.List;
import java.util.Locale;
import java.util.ResourceBundle;
import javafx.scene.control.Alert;

/**
 * Контроллер главного окна приложения мессенджера
 * Управляет интерфейсом чата, обрабатывает взаимодействие с пользователем
 */
public class MainController {

    @FXML private ListView<String> chatListView;      // Список чатов
    @FXML private ListView<MessageItem> messageListView; // Список сообщений
    @FXML private ListView<String> memberListView;    // Список участников чата
    
    @FXML private TextField newChatNameField;         // Поле ввода названия нового чата
    @FXML private TextField messageTextField;         // Поле ввода сообщения
    @FXML private TextField addMemberField;           // Поле ввода имени участника для добавления в чат
    
    @FXML private Button createChatButton;            // Кнопка создания чата
    @FXML private Button sendButton;                  // Кнопка отправки сообщения
    @FXML private Button fileButton;                  // Кнопка отправки файла
    @FXML private Button addMemberButton;             // Кнопка добавления участника
    @FXML private Button loginButton;                 // Кнопка входа
    @FXML private Button logoutButton;                // Кнопка выхода
    
    @FXML private Label chatNameLabel;                // Метка с названием текущего чата
    @FXML private Label onlineStatusLabel;            // Метка статуса онлайн/оффлайн
    @FXML private Label connectionStatusLabel;        // Метка статуса соединения

    @FXML private MenuItem englishMenuItem;           // Пункт меню для английского языка
    @FXML private MenuItem russianMenuItem;           // Пункт меню для русского языка
    @FXML private MenuItem spanishMenuItem;           // Пункт меню для испанского языка
    @FXML private MenuItem helpMenuItem;              // Пункт меню справки

    private ObservableList<String> chatList = FXCollections.observableArrayList();      // Список чатов
    private ObservableList<MessageItem> messageList = FXCollections.observableArrayList(); // Список сообщений
    private ObservableList<String> memberList = FXCollections.observableArrayList();    // Список участников

    private ResourceBundle resourceBundle;              // Ресурсы для локализации

    /**
     * Инициализация контроллера после загрузки FXML
     * Настройка начальных данных и обработчиков событий
     */
    public void initialize() {
        chatListView.setItems(chatList);
        messageListView.setItems(messageList);
        memberListView.setItems(memberList);
        
        // Демонстрационные данные
        chatList.add("General");
        chatList.add("Project Discussion");
        chatList.add("Random");
        
        memberList.add("Alice");
        memberList.add("Bob");
        memberList.add("Charlie");
        
        // Добавление демонстрационных сообщений
        messageList.add(new MessageItem("Alice", "Hello everyone!", true));
        messageList.add(new MessageItem("Bob", "Hi there!", false));
        
        // Настройка обработчиков событий
        setupEventHandlers();
        setupLanguageHandlers();
    }

    /**
     * Настройка обработчиков событий для элементов интерфейса
     */
    private void setupEventHandlers() {
        // Обработка выбора чата в списке
        chatListView.getSelectionModel().selectedItemProperty().addListener((obs, oldSelection, newSelection) -> {
            if (newSelection != null) {
                chatNameLabel.setText(newSelection);
                // Загрузка сообщений для выбранного чата
                loadChatMessages(newSelection);
            }
        });
        
        // Обработка нажатий на кнопки
        createChatButton.setOnAction(e -> createNewChat());
        sendButton.setOnAction(e -> sendMessage());
        addMemberButton.setOnAction(e -> addMemberToChat());
        loginButton.setOnAction(e -> login());
        logoutButton.setOnAction(e -> logout());
    }

    /**
     * Настройка обработчиков событий для переключения языка
     */
    private void setupLanguageHandlers() {
        // Обработка выбора языка
        englishMenuItem.setOnAction(e -> changeLanguage("en"));
        russianMenuItem.setOnAction(e -> changeLanguage("ru"));
        spanishMenuItem.setOnAction(e -> changeLanguage("es"));
    }

    /**
     * Изменение языка интерфейса
     * @param languageCode Код языка (en, ru, es)
     */
    private void changeLanguage(String languageCode) {
        Locale locale = new Locale(languageCode);
        resourceBundle = ResourceBundle.getBundle("i18n.messages", locale);
        // В реальном приложении здесь обновлялись бы тексты элементов интерфейса
        Alert alert = new Alert(Alert.AlertType.INFORMATION);
        alert.setTitle(resourceBundle.getString("app.title"));
        alert.setHeaderText(resourceBundle.getString("selectLanguage"));
        alert.setContentText(resourceBundle.getString("helpContent"));
        alert.showAndWait();
    }

    /**
     * Отображение окна справки
     */
    public void showHelp() {
        try {
            // Загрузка ресурсов для текущего языка
            if (resourceBundle == null) {
                resourceBundle = ResourceBundle.getBundle("i18n.messages", Locale.getDefault());
            }

            // Создание окна справки
            Stage helpStage = new Stage();
            VBox helpContent = new VBox(10);
            helpContent.setStyle("-fx-padding: 10; -fx-alignment: center-left;");

            Label title = new Label(resourceBundle.getString("help"));
            title.setStyle("-fx-font-size: 18px; -fx-font-weight: bold;");

            Label setupInstructions = new Label(resourceBundle.getString("setupInstructions"));
            setupInstructions.setStyle("-fx-font-size: 14px; -fx-font-weight: bold;");

            Label helpText = new Label(resourceBundle.getString("helpContent"));
            helpText.setWrapText(true);

            Label javaClientHelp = new Label(resourceBundle.getString("javaClientHelp"));
            javaClientHelp.setStyle("-fx-font-size: 14px; -fx-font-weight: bold;");

            Label serverConnection = new Label(resourceBundle.getString("serverConnection"));
            serverConnection.setStyle("-fx-font-size: 12px;");

            Label troubleshooting = new Label(resourceBundle.getString("troubleshooting"));
            troubleshooting.setStyle("-fx-font-size: 14px; -fx-font-weight: bold;");

            helpContent.getChildren().addAll(
                title,
                setupInstructions,
                helpText,
                javaClientHelp,
                serverConnection,
                troubleshooting
            );

            Scene helpScene = new Scene(helpContent, 500, 400);
            helpStage.setTitle(resourceBundle.getString("help"));
            helpStage.setScene(helpScene);
            helpStage.setResizable(false);
            helpStage.show();
        } catch (Exception e) {
            e.printStackTrace();
            Alert alert = new Alert(Alert.AlertType.ERROR);
            alert.setTitle("Error");
            alert.setHeaderText("Could not open help");
            alert.setContentText("An error occurred while opening the help window.");
            alert.showAndWait();
        }
    }

    /**
     * Создание нового чата
     * Добавляет чат в список чатов
     */
    private void createNewChat() {
        String chatName = newChatNameField.getText().trim();
        if (!chatName.isEmpty()) {
            chatList.add(chatName);
            newChatNameField.clear();
        }
    }

    /**
     * Отправка сообщения
     * Добавляет сообщение в список сообщений текущего пользователя
     */
    public void sendMessage() {
        String message = messageTextField.getText().trim();
        if (!message.isEmpty()) {
            // Добавление сообщения в список (от текущего пользователя)
            messageList.add(new MessageItem("You", message, true));
            messageTextField.clear();
            
            // В реальном приложении это отправит сообщение на сервер
            // и затем получит его обратно через WebSocket
        }
    }

    /**
     * Добавление участника в чат
     * Добавляет пользователя в список участников текущего чата
     */
    private void addMemberToChat() {
        String username = addMemberField.getText().trim();
        if (!username.isEmpty()) {
            memberList.add(username);
            addMemberField.clear();
        }
    }

    /**
     * Загрузка сообщений для выбранного чата
     * @param chatName Название чата для загрузки сообщений
     */
    private void loadChatMessages(String chatName) {
        // В реальном приложении это получит сообщения сервера
        messageList.clear();
        messageList.add(new MessageItem("System", "Loading messages for " + chatName, false));
    }

    /**
     * Вход в систему
     * Устанавливает статус соединения и онлайн-статус
     */
    private void login() {
        // В реальном приложении это откроет диалог входа и выполнит аутентификацию
        connectionStatusLabel.setText("Connected");
        connectionStatusLabel.setTextFill(Color.GREEN);
        onlineStatusLabel.setText("Online");
        onlineStatusLabel.setStyle("-fx-text-fill: #4caf50;");
    }

    /**
     * Выход из системы
     * Сбрасывает статус соединения и онлайн-статус
     */
    private void logout() {
        connectionStatusLabel.setText("Disconnected");
        connectionStatusLabel.setTextFill(Color.RED);
        onlineStatusLabel.setText("Offline");
        onlineStatusLabel.setStyle("-fx-text-fill: #9e9e9e;");
    }

    /**
     * Выбор файла для отправки
     * Открывает диалог выбора файла и отправляет выбранный файл
     */
    public void selectFile() {
        // В реальном приложении это откроет диалог выбора файла
        // и выполнит загрузку файла на сервер
        Alert alert = new Alert(Alert.AlertType.INFORMATION);
        alert.setTitle("Select File");
        alert.setHeaderText("File selection");
        alert.setContentText("File selection functionality will be implemented in the complete application.");
        alert.showAndWait();
    }

    /**
     * Внутренний класс для представления элемента сообщения в интерфейсе
     */
    public static class MessageItem {
        private String sender;           // Отправитель
        private String content;          // Содержание сообщения
        private boolean isFromCurrentUser; // Является ли сообщение от текущего пользователя

        public MessageItem(String sender, String content, boolean isFromCurrentUser) {
            this.sender = sender;
            this.content = content;
            this.isFromCurrentUser = isFromCurrentUser;
        }

        public String getSender() { return sender; }
        public String getContent() { return content; }
        public boolean isFromCurrentUser() { return isFromCurrentUser; }
    }
}