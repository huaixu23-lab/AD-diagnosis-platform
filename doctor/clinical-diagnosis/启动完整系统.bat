@echo off
cd /d %~dp0
python -m uvicorn backend.app:app --reload --port 8000
pause
