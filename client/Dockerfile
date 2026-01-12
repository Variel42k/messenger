FROM maven:3.8.4-eclipse-temurin-17 AS build

WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM openjdk:17-jdk-slim

# Установка JavaFX SDK
RUN apt-get update && apt-get install -y wget unzip fontconfig && \
    wget https://download2.gluonhq.com/openjfx/17.0.1/openjfx-17.0.1_linux-x64_bin-sdk.zip && \
    unzip openjfx-17.0.1_linux-x64_bin-sdk.zip && \
    rm openjfx-17.0.1_linux-x64_bin-sdk.zip && \
    mkdir -p /opt/javafx/lib && \
    cp javafx-sdk-17.0.1/lib/* /opt/javafx/lib/

WORKDIR /app
COPY --from=build /app/target/messenger-client-0.0.1-SNAPSHOT.jar app.jar

# Установка DISPLAY для запуска JavaFX
ENV DISPLAY=:0

# Для запуска JavaFX приложения используем java с добавлением необходимых модулей
ENTRYPOINT ["java", "--module-path", "/opt/javafx/lib", "--add-modules", "javafx.controls,javafx.fxml,javafx.web", "-jar", "app.jar"]