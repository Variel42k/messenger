package com.messenger.client;

import javafx.application.Application;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.stage.Stage;

/**
 * Основной класс приложения клиента мессенджера
 * Инициализирует графический интерфейс и запускает приложение
 */
public class ChatApplication extends Application {

    /**
     * Метод запуска приложения
     * @param primaryStage Главная сцена приложения
     * @throws Exception Исключение в случае ошибки при загрузке интерфейса
     */
    @Override
    public void start(Stage primaryStage) throws Exception {
        // Загрузка FXML файла с основным интерфейсом
        FXMLLoader loader = new FXMLLoader(getClass().getResource("/fxml/main.fxml"));
        Parent root = loader.load();
        
        // Создание сцены с размерами 1000x700
        Scene scene = new Scene(root, 1000, 700);
        // Добавление стилей CSS
        scene.getStylesheets().add(getClass().getResource("/css/style.css").toExternalForm());
        
        // Настройка заголовка окна и отображение
        primaryStage.setTitle("Messenger Client");
        primaryStage.setScene(scene);
        primaryStage.show();
    }

    /**
     * Точка входа в приложение
     * @param args Аргументы командной строки
     */
    public static void main(String[] args) {
        launch(args);
    }
}