# Script para levantar todos los microservicios y el frontend en ventanas separadas
$pythonExe = Join-Path $PSScriptRoot "venv\Scripts\python.exe"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\catalog_service'; & '$pythonExe' -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload"
Start-Sleep -Seconds 1

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\users_service'; & '$pythonExe' -m uvicorn main:app --host 127.0.0.1 --port 8002 --reload"
Start-Sleep -Seconds 1

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\orders_service'; & '$pythonExe' -m uvicorn main:app --host 127.0.0.1 --port 8003 --reload"
Start-Sleep -Seconds 1

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\frontend'; npm run dev"

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Todos los microservicios han sido lanzados exitosamente:" -ForegroundColor Green
Write-Host "  - Catalogo:  http://127.0.0.1:8001/docs" -ForegroundColor Yellow
Write-Host "  - Usuarios:  http://127.0.0.1:8002/docs" -ForegroundColor Yellow
Write-Host "  - Pedidos:   http://127.0.0.1:8003/docs" -ForegroundColor Yellow
Write-Host "  - Frontend:  http://localhost:5173" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
