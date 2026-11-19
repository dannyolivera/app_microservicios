# Iniciar Microservicio de Pagos Online (Puerto 8004)
$serviceDir = Join-Path $PSScriptRoot "payments_service"
$pythonExe = Join-Path $PSScriptRoot "venv\Scripts\python.exe"

Set-Location $serviceDir
& $pythonExe -m uvicorn main:app --host 127.0.0.1 --port 8004 --reload
