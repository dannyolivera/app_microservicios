@echo off
title Microservicio 3: Pedidos (8003)
echo ========================================================
echo Iniciando Microservicio de Pedidos en el Puerto 8003
echo ========================================================
cd /d "%~dp0orders_service"
"..\venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8003 --reload
pause
