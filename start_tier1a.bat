@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "PORT=8765"
set "URL=http://127.0.0.1:%PORT%/"
set "PY_EXE="

if exist "..\..\.venv\Scripts\python.exe" set "PY_EXE=..\..\.venv\Scripts\python.exe"
if not "%PY_EXE%"=="" goto :launch

if exist "%LOCALAPPDATA%\Python\bin\python.exe" set "PY_EXE=%LOCALAPPDATA%\Python\bin\python.exe"
if not "%PY_EXE%"=="" goto :launch

python -V >nul 2>&1
if not errorlevel 1 set "PY_EXE=python"
if not "%PY_EXE%"=="" goto :launch

py -V >nul 2>&1
if not errorlevel 1 set "PY_EXE=py"
if not "%PY_EXE%"=="" goto :launch

echo [ERROR] Python executable was not found.
echo Checked ..\..\.venv\Scripts\python.exe, python, and py on PATH.
pause
exit /b 1

:launch
echo ============================================================
echo Laos Real-Time Hydromet Monitor - Tier 1A Zero-Key Launcher
echo Serving: %CD%
echo URL:     %URL%
echo Python:  %PY_EXE%
echo Press Ctrl+C in this window to stop the local server.
echo ============================================================
start "" "%URL%"
"%PY_EXE%" -m http.server %PORT% --bind 127.0.0.1
if errorlevel 1 pause
