@echo off
title Microservicio 4: Pagos Online (8004)
echo ========================================================
echo Iniciando Microservicio de Pagos en el Puerto 8004
echo ========================================================
cd /d "%~dp0payments_service"
"..\venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8004 --reload
pause
