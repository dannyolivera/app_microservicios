@echo off
title Microservicio 2: Usuarios (8002)
echo ========================================================
echo Iniciando Microservicio de Usuarios en el Puerto 8002
echo ========================================================
cd /d "%~dp0users_service"
"..\venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8002 --reload
pause
