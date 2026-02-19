#!/bin/bash
set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "  OpenCode Remote Config - Setup"
echo "========================================"
echo

# ----------------------------------------
# 1. Validar prerequisitos
# ----------------------------------------
echo "Verificando prerequisitos..."

if ! command -v git &> /dev/null; then
    echo -e "${RED}[ERROR] git no esta instalado.${NC}"
    echo "        macOS: brew install git"
    echo "        Linux: sudo apt install git"
    exit 1
fi
echo -e "  ${GREEN}[OK]${NC} git"

PKG_MANAGER=""
if command -v bun &> /dev/null; then
    PKG_MANAGER="bun"
elif command -v npm &> /dev/null; then
    PKG_MANAGER="npm"
else
    echo -e "${RED}[ERROR] Se requiere npm o bun instalado.${NC}"
    echo "        Node.js (incluye npm): https://nodejs.org"
    echo "        Bun: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi
echo -e "  ${GREEN}[OK]${NC} $PKG_MANAGER"
echo

# ----------------------------------------
# 2. Crear directorios
# ----------------------------------------
if [ ! -d ".opencode/node_modules" ]; then
    mkdir -p ".opencode/node_modules"
    echo "[+] Creado .opencode/node_modules"
fi

# ----------------------------------------
# 3. Clonar plugin
# ----------------------------------------
if [ ! -d ".opencode/node_modules/opencode-remote-config" ]; then
    echo "Clonando plugin desde Bitbucket..."
    if ! git clone --depth 1 https://bitbucket.org/softrestaurant-team/opencode-remote-config.git ".opencode/node_modules/opencode-remote-config"; then
        echo -e "${RED}[ERROR] Fallo al clonar el repositorio.${NC}"
        echo "        Verifica tu conexion a internet y acceso a Bitbucket."
        exit 1
    fi
    echo "[+] Plugin clonado"

    # Eliminar .git del plugin para evitar repos anidados
    if [ -d ".opencode/node_modules/opencode-remote-config/.git" ]; then
        rm -rf ".opencode/node_modules/opencode-remote-config/.git"
        echo "[+] Removido .git del plugin"
    fi
else
    echo "[=] Plugin ya instalado, omitiendo clonacion"
fi

# ----------------------------------------
# 4. Instalar dependencias del plugin
# ----------------------------------------
echo
echo "Instalando dependencias del plugin ($PKG_MANAGER)..."
pushd ".opencode/node_modules/opencode-remote-config" > /dev/null
if [ "$PKG_MANAGER" = "bun" ]; then
    bun install
else
    npm install
fi
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}[WARN] No se pudieron instalar las dependencias automaticamente.${NC}"
    echo "       Ejecuta manualmente:"
    echo "       cd .opencode/node_modules/opencode-remote-config && $PKG_MANAGER install"
fi
popd > /dev/null
echo "[+] Dependencias instaladas"

# ----------------------------------------
# 5. Crear opencode.json
# ----------------------------------------
if [ ! -f ".opencode/opencode.json" ]; then
    cat > ".opencode/opencode.json" << 'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["./node_modules/opencode-remote-config"]
}
EOF
    echo "[+] Creado .opencode/opencode.json"
else
    echo "[=] opencode.json ya existe, omitiendo"
fi

# ----------------------------------------
# 6. Preguntar URL del repo de skills
# ----------------------------------------
echo
echo "Configuracion del repositorio de skills:"
echo "  (Deja en blanco para configurar despues editando .opencode/remote-config.json)"
echo
read -p "URL del repositorio de skills: " SKILLS_URL

if [ -z "$SKILLS_URL" ]; then
    SKILLS_URL="https://bitbucket.org/your-org/your-skills-repo.git"
    echo -e "${YELLOW}[!] Usando URL de ejemplo. Edita .opencode/remote-config.json antes de usar OpenCode.${NC}"
fi

# ----------------------------------------
# 7. Crear remote-config.json
# ----------------------------------------
if [ ! -f ".opencode/remote-config.json" ]; then
    cat > ".opencode/remote-config.json" << EOF
{
  "repositories": [
    {
      "url": "$SKILLS_URL",
      "ref": "main"
    }
  ],
  "installMethod": "copy",
  "logLevel": "info"
}
EOF
    echo "[+] Creado .opencode/remote-config.json"
else
    echo "[=] remote-config.json ya existe, omitiendo"
fi

# ----------------------------------------
# 8. Agregar .opencode a .gitignore
# ----------------------------------------
if [ -f ".gitignore" ]; then
    if ! grep -qx ".opencode" ".gitignore" 2>/dev/null; then
        echo ".opencode" >> ".gitignore"
        echo "[+] Agregado .opencode a .gitignore"
    else
        echo "[=] .opencode ya esta en .gitignore"
    fi
else
    echo ".opencode" > ".gitignore"
    echo "[+] Creado .gitignore con .opencode"
fi

# ----------------------------------------
# Resumen final
# ----------------------------------------
echo
echo "========================================"
echo "  Setup completado exitosamente!"
echo "========================================"
echo
echo "Archivos creados:"
echo "  .opencode/opencode.json        (configuracion del plugin)"
echo "  .opencode/remote-config.json   (repositorios de skills)"
echo
echo "Siguientes pasos:"
echo "  1. Edita .opencode/remote-config.json con la URL de tu repo de skills"
echo "  2. Ejecuta: opencode"
echo
