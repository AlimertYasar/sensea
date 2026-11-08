@echo off
chcp 65001 >nul
REM ============================================================
REM  Sensea - backend + Expo'yu iki pencerede baslatir.
REM  Cift tikla ya da CMD'de: Sensea-Baslat.bat
REM  Token ve API anahtarlari bu dosyada DEGIL, Windows ortam
REM  degiskenlerinde durur (setx ile bir kez kaydedilir).
REM ============================================================

if "%EXPO_TOKEN%"=="" (
  echo.
  echo  [!] EXPO_TOKEN tanimli degil.
  echo      Bir kez su komutu calistir, sonra bu pencereyi kapatip dosyayi tekrar ac:
  echo        setx EXPO_TOKEN "expo.dev'den aldigin token"
  echo.
  pause
  exit /b 1
)

start "Sensea Backend" cmd /k "cd /d "%~dp0backend" && call .venv\Scripts\activate.bat && set "SENSEA_DEV_TIERS=1" && uvicorn app.main:app --host 0.0.0.0 --port 8000"

timeout /t 2 >nul

start "Sensea App" cmd /k "cd /d "%~dp0mobile" && npx expo start"
