# Iniciar Microservicio de Usuarios y Autenticación (Puerto 8002)
$serviceDir = Join-Path $PSScriptRoot "users_service"
$pythonExe = Join-Path $PSScriptRoot "venv\Scripts\python.exe"

Set-Location $serviceDir
& $pythonExe -m uvicorn main:app --host 127.0.0.1 --port 8002 --reload
