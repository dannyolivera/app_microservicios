# Iniciar Microservicio de Pedidos / Órdenes (Puerto 8003)
$serviceDir = Join-Path $PSScriptRoot "orders_service"
$pythonExe = Join-Path $PSScriptRoot "venv\Scripts\python.exe"

Set-Location $serviceDir
& $pythonExe -m uvicorn main:app --host 127.0.0.1 --port 8003 --reload
