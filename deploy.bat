@echo off
setlocal
cd /d "%~dp0"

echo === Build ===
call npm run build
if errorlevel 1 goto :fail

echo === Git commit ===
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "%~1"
  if errorlevel 1 goto :fail
) else (
  echo Nothing to commit.
)

echo === Git push ===
git push origin master
if errorlevel 1 goto :fail

echo === Wrangler deploy ===
npx wrangler pages deploy dist --project-name=cargo-flow-admin --branch=main
if errorlevel 1 goto :fail

echo.
echo Done. https://manage.cargoflowafrica.co.za
exit /b 0

:fail
echo.
echo FAILED.
exit /b 1
