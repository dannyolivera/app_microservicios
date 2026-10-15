@echo off
title Microservicio 1: Catalogo (8001)
echo ========================================================
echo Iniciando Microservicio de Catalogo en el Puerto 8001
echo ========================================================
cd /d "%~dp0catalog_service"
"..\venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
pause
