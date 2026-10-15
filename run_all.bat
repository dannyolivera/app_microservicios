@echo off
title InkaPharmacy Microservices Launcher
echo =========================================================================
echo Levantando Arquitectura de Microservicios InkaPharmacy (3 APIs + Frontend)
echo =========================================================================

start "Microservicio 1: Catalogo (:8001)" cmd /k "cd /d "%~dp0catalog_service" && "..\venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload"
timeout /t 2 /nobreak >nul

start "Microservicio 2: Usuarios (:8002)" cmd /k "cd /d "%~dp0users_service" && "..\venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8002 --reload"
timeout /t 2 /nobreak >nul

start "Microservicio 3: Pedidos (:8003)" cmd /k "cd /d "%~dp0orders_service" && "..\venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8003 --reload"
timeout /t 2 /nobreak >nul

start "Frontend Web: InkaPharmacy (:5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Todos los servicios estan corriendo en sus respectivas ventanas:
echo   - Catalogo:  http://127.0.0.1:8001/docs
echo   - Usuarios:  http://127.0.0.1:8002/docs
echo   - Pedidos:   http://127.0.0.1:8003/docs
echo   - Web App:   http://localhost:5173
echo.
echo Presione cualquier tecla para cerrar esta ventana lanzadora (los servicios continuaran corriendo).
pause >nul
