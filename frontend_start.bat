@echo off
echo Starting Frontend Server...
cd frontend
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install
)
npm run dev
