@echo off
echo Starting Backend Server...
cd backend
if not exist "venv" (
    echo Virtual environment not found. Please create it and install requirements.
    pause
    exit /b
)
call venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
