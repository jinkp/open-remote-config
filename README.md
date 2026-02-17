# opencode-remote-config

Plugin de OpenCode para sincronizar skills, agents, commands e instructions desde repositorios Git remotos.

## Caracteristicas

- Sincroniza skills, agents, commands y plugins desde repositorios Git
- Soporte para Windows y Unix/Linux/macOS
- Sistema de logging detallado
- Filtros para importar solo lo que necesitas
- Comandos para re-sincronizar sin reiniciar
- Skills compartidos globalmente entre proyectos

## Prerequisitos

### Windows

1. **Git para Windows**
   - Descargar: https://git-scm.com/download/win
   - Verificar: `git --version`

2. **Node.js + npm** *(opcion recomendada)*
   - Descargar: https://nodejs.org (incluye npm)
   - Verificar:
     ```powershell
     node --version
     npm --version
     ```

3. **Bun** *(alternativa a npm)*
   ```powershell
   powershell -c "irm bun.sh/install.ps1 | iex"
   ```
   - Verificar: `bun --version`
   - Requiere reiniciar la terminal despues de instalar

4. **OpenCode**

   Con npm:
   ```powershell
   npm install -g opencode
   ```

   Con bun:
   ```powershell
   bun add -g opencode
   ```
   - Verificar: `opencode --version`

5. **Cuenta en Bitbucket** (si usas repositorios privados)
   - Crear cuenta: https://bitbucket.org
   - Configurar credenciales Git:
     ```bash
     git config --global credential.helper manager
     ```

### Linux/macOS

1. **Git**
   ```bash
   # macOS
   brew install git
   
   # Ubuntu/Debian
   sudo apt install git
   ```

2. **Node.js + npm** *(opcion recomendada)*
   ```bash
   # macOS
   brew install node

   # Ubuntu/Debian
   sudo apt install nodejs npm
   ```
   - Verificar:
     ```bash
     node --version
     npm --version
     ```

3. **Bun** *(alternativa a npm)*
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```
   - Verificar: `bun --version`

4. **OpenCode**

   Con npm:
   ```bash
   npm install -g opencode
   ```

   Con bun:
   ```bash
   bun add -g opencode
   ```

## El comando setup

`opencode-remote-config-setup` es un script que **automatiza la instalacion del plugin en tu proyecto**. Ejecutalo una vez por proyecto desde la raiz del mismo.

**Que hace el setup automaticamente:**

1. Crea la carpeta `.opencode/` si no existe
2. Clona el plugin desde Bitbucket en `.opencode/node_modules/opencode-remote-config/`
3. Elimina la carpeta `.git` del plugin (evita conflictos de repos anidados)
4. Instala las dependencias del plugin (intenta con `bun`, si falla usa `npm`)
5. Crea `.opencode/remote-config.json` con una configuracion base si no existe
6. Crea o actualiza `.opencode/opencode.json` para registrar el plugin

**Como ejecutarlo** (segun como instalaste el plugin):

```bash
# Si instalaste con npm (global):
npx opencode-remote-config-setup

# Si instalaste con bun (global) en Windows:
bun %USERPROFILE%\.bun\install\global\node_modules\opencode-remote-config\dist\setup.js

# Si instalaste con bun (global) en Linux/macOS:
bun ~/.bun/install/global/node_modules/opencode-remote-config/dist/setup.js
```

**Despues del setup**, solo necesitas editar `.opencode/remote-config.json` para agregar tus repositorios de skills y abrir OpenCode.

> El setup es idempotente: si ya existe la carpeta, los archivos de configuracion o el plugin, los omite sin sobreescribir.

---

## Instalacion

Hay **3 metodos** de instalacion. Usa el que mejor funcione en tu entorno.

### Metodo 1: Clonar repositorio (Recomendado)

Este metodo es el mas confiable y funciona en todos los entornos.

```bash
# 1. Ir a la raiz de tu proyecto
cd /ruta/a/tu/proyecto

# 2. Crear carpeta .opencode y clonar el plugin
mkdir -p .opencode/node_modules
git clone --depth 1 https://bitbucket.org/softrestaurant-team/opencode-remote-config.git .opencode/node_modules/opencode-remote-config

# 3. Eliminar carpeta .git del plugin (evita conflictos de repos anidados)
rm -rf .opencode/node_modules/opencode-remote-config/.git

# 4. Instalar dependencias del plugin
cd .opencode/node_modules/opencode-remote-config
bun install
cd ../../..

# 5. Crear archivo de configuracion
cat > .opencode/opencode.json << 'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["./node_modules/opencode-remote-config"]
}
EOF

# 6. Crear configuracion de repositorios remotos
cat > .opencode/remote-config.json << 'EOF'
{
  "repositories": [
    {
      "url": "https://bitbucket.org/tu-org/skills.git",
      "ref": "main"
    }
  ],
  "installMethod": "copy",
  "logLevel": "info"
}
EOF

# 7. Agregar .opencode al .gitignore
echo ".opencode" >> .gitignore
```

### Metodo 2: Usando npm (global)

```bash
# 1. Instalar globalmente con npm
npm install -g git+https://bitbucket.org/softrestaurant-team/opencode-remote-config.git

# 2. Verificar que el plugin quedo instalado globalmente
npm list -g opencode-remote-config
# Debe mostrar: opencode-remote-config@x.x.x

# Tambien puedes verificar la ubicacion del paquete:
npm root -g
# Windows tipico: C:\Users\<usuario>\AppData\Roaming\npm\node_modules
# Linux/macOS tipico: /usr/local/lib/node_modules

# 3. Ir a tu proyecto y ejecutar setup
cd /ruta/a/tu/proyecto
npx opencode-remote-config-setup

# 4. Agregar .opencode al .gitignore
echo ".opencode" >> .gitignore
```

**Verificacion adicional en Windows (PowerShell):**
```powershell
# Ver todos los paquetes globales instalados con npm
npm list -g --depth=0

# Ver solo opencode-remote-config
npm list -g opencode-remote-config

# Ver ubicacion del binario del setup
where opencode-remote-config-setup
```

**Verificacion adicional en Linux/macOS:**
```bash
# Ver todos los paquetes globales instalados con npm
npm list -g --depth=0

# Ver solo opencode-remote-config
npm list -g opencode-remote-config

# Ver ubicacion del binario del setup
which opencode-remote-config-setup
```

### Metodo 3: Usando bun (global)

> **Nota:** Este metodo puede fallar con error "DependencyLoop" en algunas versiones de bun. Si falla, usa el Metodo 1 o 2.

```bash
# 1. Instalar globalmente con bun
bun add -g git+https://bitbucket.org/softrestaurant-team/opencode-remote-config.git

# 2. Verificar que el plugin quedo instalado globalmente
bun pm ls -g
# Debe mostrar opencode-remote-config en la lista

# Tambien puedes verificar la ubicacion:
# Windows:   %USERPROFILE%\.bun\install\global\node_modules\opencode-remote-config
# Linux/macOS: ~/.bun/install/global/node_modules/opencode-remote-config
```

**Verificacion adicional en Windows (PowerShell):**
```powershell
# Ver paquetes globales de bun
bun pm ls -g

# Verificar que la carpeta del paquete existe
Test-Path "$env:USERPROFILE\.bun\install\global\node_modules\opencode-remote-config"
# Debe retornar: True

# Ver binarios globales disponibles
dir "$env:USERPROFILE\.bun\bin"
```

**Verificacion adicional en Linux/macOS:**
```bash
# Ver paquetes globales de bun
bun pm ls -g

# Verificar que la carpeta del paquete existe
ls ~/.bun/install/global/node_modules/opencode-remote-config

# Ver binarios globales disponibles
ls ~/.bun/bin
```

```bash
# 3. Ejecutar setup en tu proyecto
cd /ruta/a/tu/proyecto

# Windows:
bun %USERPROFILE%\.bun\install\global\node_modules\opencode-remote-config\dist\setup.js

# Linux/macOS:
bun ~/.bun/install/global/node_modules/opencode-remote-config/dist/setup.js

# 4. Agregar .opencode al .gitignore
echo ".opencode" >> .gitignore
```

**Importante:** Agrega `.opencode` a tu `.gitignore` para no subir el plugin y node_modules al repositorio.

## Configuracion Minima

Edita `.opencode/remote-config.json`:

```json
{
  "repositories": [
    {
      "url": "https://bitbucket.org/tu-org/skills.git",
      "ref": "main",
      "skills": {
        "include": ["skill-name-1", "skill-name-2"]
      }
    }
  ],
  "installMethod": "copy",
  "logLevel": "info"
}
```

## Estructura del Proyecto

```
tu-proyecto/
├── .opencode/
│   ├── node_modules/
│   │   └── opencode-remote-config/  (plugin instalado)
│   ├── opencode.json                (registra el plugin)
│   ├── remote-config.json           (configura repositorios)
│   └── package.json                 (dependencias)
├── .gitignore                       (debe incluir .opencode)
└── ... (resto del proyecto)
```

## Como Funciona

```
┌─────────────────────────────────────────────────────────────────┐
│                         Tu Proyecto                              │
│  .opencode/                                                      │
│  ├── node_modules/opencode-remote-config/  (plugin)             │
│  ├── opencode.json                         (registra plugin)    │
│  └── remote-config.json                    (config repos)       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cache (compartido)                            │
│  ~/.cache/opencode/remote-config/                               │
│  ├── repos/                    (repositorios clonados)          │
│  └── plugin.log                (logs)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                Skills Instalados (compartido)                    │
│  ~/.config/opencode/skill/_plugins/                             │
│  └── nombre-repo/                                               │
│      └── nombre-skill/                                          │
│          └── SKILL.md                                           │
└─────────────────────────────────────────────────────────────────┘
```

**Al abrir OpenCode:**
1. Lee configuracion de `.opencode/remote-config.json`
2. Hace `git fetch` en cada repositorio
3. Si hay cambios, actualiza los skills
4. Skills disponibles en todos los proyectos

## Documentacion

- **[MANUAL.md](./MANUAL.md)** - Guia completa de instalacion y configuracion
- **[SKILLS.md](./SKILLS.md)** - Como crear y estructurar repositorios de skills

## Comandos

| Comando | Descripcion |
|---------|-------------|
| `/remote-sync` | Re-descarga todos los repositorios |
| `/remote-clear` | Limpia cache |
| `/remote-status` | Muestra estado |

## Troubleshooting

### Error: "DependencyLoop" con bun

```
error: Package "opencode-remote-config@..." has a dependency loop
```

**Causa:** Bug en bun al resolver dependencias de paquetes git.

**Soluciones:**
1. **Usar Metodo 1** (clonar repositorio manualmente) - Recomendado
2. **Usar npm** en lugar de bun:
   ```bash
   npm install -g git+https://bitbucket.org/softrestaurant-team/opencode-remote-config.git
   ```
3. **Limpiar cache de bun** y reintentar:
   ```bash
   rm -rf ~/.bun/install/cache
   bun add -g git+https://bitbucket.org/softrestaurant-team/opencode-remote-config.git
   ```

### Error: "bun: command not found"

Reinstalar Bun y reiniciar terminal:
```bash
# Windows
powershell -c "irm bun.sh/install.ps1 | iex"

# Linux/macOS
curl -fsSL https://bun.sh/install | bash
```

### Error: "opencode-remote-config-setup: command not found" con npm

En Windows, npm global puede no estar en el PATH por defecto.

**Verificar y corregir el PATH en Windows:**
```powershell
# Ver donde npm instala los binarios globales
npm bin -g
# Tipico: C:\Users\<usuario>\AppData\Roaming\npm

# Agregar al PATH de forma permanente (PowerShell como Administrador):
$npmBin = npm bin -g
[Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";$npmBin", "User")

# Reiniciar la terminal y verificar:
where opencode-remote-config-setup
```

**Alternativa: ejecutar directamente con npx**
```powershell
npx opencode-remote-config-setup
```

### Error: "npm: command not found"

Instalar Node.js (incluye npm):
- **Windows:** https://nodejs.org
- **macOS:** `brew install node`
- **Linux:** `sudo apt install nodejs npm`

### Error: "git: command not found"

Instalar Git:
- **Windows:** https://git-scm.com/download/win
- **macOS:** `brew install git`
- **Linux:** `sudo apt install git`

### Error de autenticacion en repositorios privados

Configurar credential helper:
```bash
git config --global credential.helper manager
```

### Skills no aparecen en OpenCode

1. Verificar que `remote-config.json` tenga la configuracion correcta
2. Usar nombres con guiones en filtros, no slashes:
   - Correcto: `"developer-code-analyzer"`
   - Incorrecto: `"developer/code-analyzer"`
3. Ejecutar `/remote-sync` para forzar sincronizacion
4. Revisar logs en `~/.cache/opencode/remote-config/plugin.log`

## Licencia

MIT
