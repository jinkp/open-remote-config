@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   OpenCode Remote Config - Setup
echo ========================================
echo.

:: ----------------------------------------
:: 1. Validar prerequisitos
:: ----------------------------------------
echo Verificando prerequisitos...

where git >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] git no esta instalado.
    echo         Descarga: https://git-scm.com/download/win
    exit /b 1
)
echo   [OK] git

set "PKG_MANAGER="
where bun >nul 2>&1
if not errorlevel 1 set "PKG_MANAGER=bun"

if "%PKG_MANAGER%"=="" (
    where npm >nul 2>&1
    if not errorlevel 1 set "PKG_MANAGER=npm"
)

if "%PKG_MANAGER%"=="" (
    echo.
    echo [ERROR] Se requiere npm o bun instalado.
    echo         Node.js ^(incluye npm^): https://nodejs.org
    echo         Bun: powershell -c "irm bun.sh/install.ps1 | iex"
    exit /b 1
)
echo   [OK] %PKG_MANAGER%
echo.

:: ----------------------------------------
:: 2. Crear directorios
:: ----------------------------------------
if not exist ".opencode\node_modules" (
    mkdir ".opencode\node_modules"
    echo [+] Creado .opencode\node_modules
)

:: ----------------------------------------
:: 3. Clonar plugin
:: ----------------------------------------
if not exist ".opencode\node_modules\opencode-remote-config" (
    echo Clonando plugin desde Bitbucket...
    git clone --depth 1 https://bitbucket.org/softrestaurant-team/opencode-remote-config.git ".opencode\node_modules\opencode-remote-config"
    if errorlevel 1 (
        echo.
        echo [ERROR] Fallo al clonar el repositorio.
        echo         Verifica tu conexion a internet y acceso a Bitbucket.
        exit /b 1
    )
    echo [+] Plugin clonado

    :: Eliminar .git del plugin para evitar repos anidados
    if exist ".opencode\node_modules\opencode-remote-config\.git" (
        rmdir /s /q ".opencode\node_modules\opencode-remote-config\.git"
        echo [+] Removido .git del plugin
    )
) else (
    echo [=] Plugin ya instalado, omitiendo clonacion
)

:: ----------------------------------------
:: 4. Instalar dependencias del plugin
:: ----------------------------------------
echo.
echo Instalando dependencias del plugin ^(%PKG_MANAGER%^)...
pushd ".opencode\node_modules\opencode-remote-config"
if "%PKG_MANAGER%"=="bun" (
    bun install
) else (
    npm install
)
if errorlevel 1 (
    echo.
    echo [WARN] No se pudieron instalar las dependencias automaticamente.
    echo        Ejecuta manualmente:
    echo        cd .opencode\node_modules\opencode-remote-config ^&^& %PKG_MANAGER% install
)
popd
echo [+] Dependencias instaladas

:: ----------------------------------------
:: 5. Crear opencode.json
:: ----------------------------------------
if not exist ".opencode\opencode.json" (
    (
        echo {
        echo   "$schema": "https://opencode.ai/config.json",
        echo   "plugin": ["./node_modules/opencode-remote-config"]
        echo }
    ) > ".opencode\opencode.json"
    echo [+] Creado .opencode\opencode.json
) else (
    echo [=] opencode.json ya existe, omitiendo
)

:: ----------------------------------------
:: 6. Preguntar URL del repo de skills
:: ----------------------------------------
echo.
echo Configuracion del repositorio de skills:
echo   ^(Deja en blanco para configurar despues editando .opencode\remote-config.json^)
echo.
set "SKILLS_URL="
set /p "SKILLS_URL=URL del repositorio de skills: "

if "%SKILLS_URL%"=="" (
    set "SKILLS_URL=https://bitbucket.org/your-org/your-skills-repo.git"
    echo [!] Usando URL de ejemplo. Edita .opencode\remote-config.json antes de usar OpenCode.
)

:: ----------------------------------------
:: 7. Crear remote-config.json
:: ----------------------------------------
if not exist ".opencode\remote-config.json" (
    (
        echo {
        echo   "repositories": [
        echo     {
        echo       "url": "%SKILLS_URL%",
        echo       "ref": "main"
        echo     }
        echo   ],
        echo   "installMethod": "copy",
        echo   "logLevel": "info"
        echo }
    ) > ".opencode\remote-config.json"
    echo [+] Creado .opencode\remote-config.json
) else (
    echo [=] remote-config.json ya existe, omitiendo
)

:: ----------------------------------------
:: 8. Agregar .opencode a .gitignore
:: ----------------------------------------
if exist ".gitignore" (
    findstr /x /c:".opencode" ".gitignore" >nul 2>&1
    if errorlevel 1 (
        echo .opencode >> ".gitignore"
        echo [+] Agregado .opencode a .gitignore
    ) else (
        echo [=] .opencode ya esta en .gitignore
    )
) else (
    echo .opencode > ".gitignore"
    echo [+] Creado .gitignore con .opencode
)

:: ----------------------------------------
:: Resumen final
:: ----------------------------------------
echo.
echo ========================================
echo   Setup completado exitosamente!
echo ========================================
echo.
echo Archivos creados:
echo   .opencode\opencode.json        (configuracion del plugin)
echo   .opencode\remote-config.json   (repositorios de skills)
echo.
echo Siguientes pasos:
echo   1. Edita .opencode\remote-config.json con la URL de tu repo de skills
echo   2. Ejecuta: opencode
echo.

endlocal
