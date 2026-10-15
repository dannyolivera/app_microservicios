# Iniciar Microservicio de Catálogo (Puerto 8001)
$serviceDir = Join-Path $PSScriptRoot "catalog_service"
$pythonExe = Join-Path $PSScriptRoot "venv\Scripts\python.exe"

Set-Location $serviceDir
& $pythonExe -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
