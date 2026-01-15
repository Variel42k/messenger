@echo off
setlocal enabledelayedexpansion

REM Поиск Java в системе
set "JAVA_EXEC="
set "JAVA_HOME_FOUND="

REM Сначала проверяем, установлена ли Java в PATH
java --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=3" %%g in ('java -version 2^>^&1 ^| findstr /i "version"') do (
        set "JAVA_VERSION=%%g"
    )
    set JAVA_VERSION=!JAVA_VERSION:"=!
    for /f "delims=. tokens=1" %%v in ("!JAVA_VERSION!") do set MAJOR_VERSION=%%v
    
    if !MAJOR_VERSION! geq 17 (
        set "JAVA_EXEC=java"
        goto :run_app
    )
)

REM Если Java не найдена в PATH, ищем в стандартных местах
for /f "tokens=*" %%i in ('reg query "HKLM\SOFTWARE\JavaSoft\Java Runtime Environment" 2^>nul') do (
    if exist "%%i" (
        for /f "tokens=*" %%j in ('reg query "%%i" /v JavaHome 2^>nul ^| findstr /i "JavaHome"') do (
            set "JAVA_HOME_FOUND=%%j"
            set "JAVA_HOME_FOUND=!JAVA_HOME_FOUND:*JavaHome    REG_SZ    =!"
            if exist "!JAVA_HOME_FOUND!\bin\java.exe" (
                "!JAVA_HOME_FOUND!\bin\java.exe" --version >nul 2>&1
                if !errorlevel! equ 0 (
                    for /f "tokens=3" %%g in ('"!JAVA_HOME_FOUND!\bin\java.exe" -version 2^>^&1 ^| findstr /i "version"') do (
                        set "JAVA_VERSION=%%g"
                    )
                    set JAVA_VERSION=!JAVA_VERSION:"=!
                    for /f "delims=. tokens=1" %%v in ("!JAVA_VERSION!") do set MAJOR_VERSION=%%v
                    
                    if !MAJOR_VERSION! geq 17 (
                        set "JAVA_EXEC=!JAVA_HOME_FOUND!\bin\java.exe"
                        goto :run_app
                    )
                )
            )
        )
    )
)

REM Проверяем другие возможные места установки Java
for /d %%i in ("C:\Program Files\Java\jdk*") do (
    if exist "%%i\bin\java.exe" (
        "%%i\bin\java.exe" --version >nul 2>&1
        if !errorlevel! equ 0 (
            for /f "tokens=3" %%g in ('"%%i\bin\java.exe" -version 2^>^&1 ^| findstr /i "version"') do (
                set "JAVA_VERSION=%%g"
            )
            set JAVA_VERSION=!JAVA_VERSION:"=!
            for /f "delims=. tokens=1" %%v in ("!JAVA_VERSION!") do set MAJOR_VERSION=%%v
            
            if !MAJOR_VERSION! geq 17 (
                set "JAVA_EXEC=%%i\bin\java.exe"
                goto :run_app
            )
        )
    )
)

for /d %%i in ("C:\Program Files\Eclipse Adoptium\jdk*") do (
    if exist "%%i\bin\java.exe" (
        "%%i\bin\java.exe" --version >nul 2>&1
        if !errorlevel! equ 0 (
            for /f "tokens=3" %%g in ('"%%i\bin\java.exe" -version 2^>^&1 ^| findstr /i "version"') do (
                set "JAVA_VERSION=%%g"
            )
            set JAVA_VERSION=!JAVA_VERSION:"=!
            for /f "delims=. tokens=1" %%v in ("!JAVA_VERSION!") do set MAJOR_VERSION=%%v
            
            if !MAJOR_VERSION! geq 17 (
                set "JAVA_EXEC=%%i\bin\java.exe"
                goto :run_app
            )
        )
    )
)

for /d %%i in ("C:\Program Files\Amazon Corretto\jdk*") do (
    if exist "%%i\bin\java.exe" (
        "%%i\bin\java.exe" --version >nul 2>&1
        if !errorlevel! equ 0 (
            for /f "tokens=3" %%g in ('"%%i\bin\java.exe" -version 2^>^&1 ^| findstr /i "version"') do (
                set "JAVA_VERSION=%%g"
            )
            set JAVA_VERSION=!JAVA_VERSION:"=!
            for /f "delims=. tokens=1" %%v in ("!JAVA_VERSION!") do set MAJOR_VERSION=%%v
            
            if !MAJOR_VERSION! geq 17 (
                set "JAVA_EXEC=%%i\bin\java.exe"
                goto :run_app
            )
        )
    )
)

for /d %%i in ("C:\Program Files\Microsoft\jdk-*") do (
    if exist "%%i\bin\java.exe" (
        "%%i\bin\java.exe" --version >nul 2>&1
        if !errorlevel! equ 0 (
            for /f "tokens=3" %%g in ('"%%i\bin\java.exe" -version 2^>^&1 ^| findstr /i "version"') do (
                set "JAVA_VERSION=%%g"
            )
            set JAVA_VERSION=!JAVA_VERSION:"=!
            for /f "delims=. tokens=1" %%v in ("!JAVA_VERSION!") do set MAJOR_VERSION=%%v
            
            if !MAJOR_VERSION! geq 17 (
                set "JAVA_EXEC=%%i\bin\java.exe"
                goto :run_app
            )
        )
    )
)

REM Если Java не найдена, показываем сообщение и выходим
echo Java 17 или выше не найдена в системе.
echo.
echo Пожалуйста, установите Java 17 или выше и убедитесь, что она добавлена в переменную PATH.
echo.
echo Возможные варианты установки:
echo 1. Oracle JDK (https://www.oracle.com/java/technologies/downloads/)
echo 2. Eclipse Temurin (https://adoptium.net/)
echo 3. Amazon Corretto (https://aws.amazon.com/corretto/)
echo.
echo После установки перезапустите этот скрипт.
pause
exit /b 1

:run_app
REM Запускаем приложение с найденной Java
echo Найдена Java версии !MAJOR_VERSION! по пути: !JAVA_EXEC!
echo Запуск клиента мессенджера...
start "" "!JAVA_EXEC!" -jar target/messenger-client-0.0.1-SNAPSHOT.jar

echo Клиент запущен!
timeout /t 3 >nul
exit /b 0