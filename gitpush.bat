@echo off
setlocal

rem --- MovieMania git helper: add + commit + push ---

rem 1. Stage everything (new, modified, and deleted)
git add .

rem 2. Ask for a commit message
set /p MSG="Commit message: "
if "%MSG%"=="" set MSG=auto commit

rem 3. Commit
git commit -m "%MSG%"

rem 4. Push to remote main
git push origin main

if errorlevel 1 (
    echo.
    echo [ERROR] A step failed. Check the output above.
    pause
    exit /b 1
)

echo.
echo Done - added, committed, and pushed.
pause
