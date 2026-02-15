# OpenCode Remote Config - Manual de Instalacion

Plugin para sincronizar skills, agents, commands e instructions desde repositorios Git remotos.

## Tabla de Contenidos

- [Requisitos](#requisitos)
- [Metodos de Instalacion](#metodos-de-instalacion)
  - [Metodo 1: Clonar Repositorio (Recomendado)](#metodo-1-clonar-repositorio-recomendado)
  - [Metodo 2: Usando npm](#metodo-2-usando-npm)
  - [Metodo 3: Usando bun](#metodo-3-usando-bun)
- [Verificar Instalacion](#verificar-instalacion)
- [Configuracion](#configuracion)
- [Nombres de Skills](#nombres-de-skills)
- [Comandos del Plugin](#comandos-del-plugin)
- [Desinstalacion](#desinstalacion)
- [Troubleshooting](#troubleshooting)

---

## Requisitos

- [Git](https://git-scm.com/) >= 2.0
- [Bun](https://bun.sh/) >= 1.0.0 o [Node.js](https://nodejs.org/) >= 18
- [OpenCode](https://opencode.ai/) instalado

### Instalacion de Requisitos

**Windows:**
```powershell
# Git
winget install Git.Git

# Bun
powershell -c "irm bun.sh/install.ps1 | iex"

# Reiniciar terminal despues de instalar
```

**Linux/macOS:**
```bash
# Git (macOS)
brew install git

# Git (Ubuntu/Debian)
sudo apt install git

# Bun
curl -fsSL https://bun.sh/install | bash
```

---

## Metodos de Instalacion

Hay 3 metodos de instalacion. **El Metodo 1 es el mas confiable** y funciona en todos los entornos.

### Metodo 1: Clonar Repositorio (Recomendado)

Este metodo evita problemas de cache y dependencias.

```bash
# 1. Ir a la raiz de tu proyecto
cd /ruta/a/tu/proyecto

# 2. Crear estructura y clonar plugin
mkdir -p .opencode/node_modules
git clone --depth 1 https://bitbucket.org/softrestaurant-team/opencode-remote-config.git .opencode/node_modules/opencode-remote-config

# 3. Eliminar carpeta .git del plugin (evita repos anidados)
rm -rf .opencode/node_modules/opencode-remote-config/.git
# Windows CMD: rmdir /s /q .opencode\node_modules\opencode-remote-config\.git

# 4. Instalar dependencias del plugin
cd .opencode/node_modules/opencode-remote-config
bun install
cd ../../..

# 5. Crear opencode.json
cat > .opencode/opencode.json << 'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["./node_modules/opencode-remote-config"]
}
EOF

# 6. Crear remote-config.json (editar segun tus repos)
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

**Para Windows (PowerShell):**
```powershell
# 1-4: Igual que arriba

# 5. Crear opencode.json
@'
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["./node_modules/opencode-remote-config"]
}
'@ | Out-File -Encoding utf8 .opencode\opencode.json

# 6. Crear remote-config.json
@'
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
'@ | Out-File -Encoding utf8 .opencode\remote-config.json

# 7. Agregar al .gitignore
Add-Content .gitignore ".opencode"
```

### Metodo 2: Usando npm

npm funciona de forma confiable para instalacion global.

```bash
# 1. Instalar globalmente con npm
npm install -g git+https://bitbucket.org/softrestaurant-team/opencode-remote-config.git

# 2. Ir a tu proyecto
cd /ruta/a/tu/proyecto

# 3. Ejecutar setup
npx opencode-remote-config-setup

# 4. Agregar .opencode al .gitignore
echo ".opencode" >> .gitignore
```

El script setup automaticamente:
- Crea `.opencode/` si no existe
- Clona el plugin a `.opencode/node_modules/`
- Crea `opencode.json` con la configuracion del plugin
- Crea `remote-config.json` de ejemplo
- Instala dependencias del plugin

### Metodo 3: Usando bun

> **Advertencia:** Este metodo puede fallar con error "DependencyLoop" debido a un bug en bun al resolver dependencias git. Si falla, usa el Metodo 1 o 2.

```bash
# 1. Limpiar cache de bun (importante)
rm -rf ~/.bun/install/cache

# 2. Instalar globalmente
bun add -g git+https://bitbucket.org/softrestaurant-team/opencode-remote-config.git

# 3. Ir a tu proyecto
cd /ruta/a/tu/proyecto

# 4. Ejecutar setup
# Windows:
bun %USERPROFILE%\.bun\install\global\node_modules\opencode-remote-config\dist\setup.js

# Linux/macOS:
bun ~/.bun/install/global/node_modules/opencode-remote-config/dist/setup.js

# 5. Agregar .opencode al .gitignore
echo ".opencode" >> .gitignore
```

**Si falla con "DependencyLoop":**
```bash
# Limpiar todos los caches
rm -rf ~/.bun/install/cache
rm ~/.bun/install/global/bun.lock

# Intentar de nuevo o usar Metodo 1
```

---

## Verificar Instalacion

### 1. Verificar estructura de archivos

```bash
# Debe existir:
ls .opencode/node_modules/opencode-remote-config/dist/index.js

# Debe contener el plugin:
cat .opencode/opencode.json
# Salida esperada: { "plugin": ["./node_modules/opencode-remote-config"] }
```

### 2. Iniciar OpenCode

```bash
opencode
```

### 3. Verificar logs

```bash
# Windows
type %USERPROFILE%\.cache\opencode\remote-config\plugin.log

# Linux/macOS
cat ~/.cache/opencode/remote-config/plugin.log
```

Deberias ver algo como:
```
[INFO] Plugin initialized
[INFO] Syncing repository: https://bitbucket.org/...
[INFO] Installed 15 skills
```

---

## Configuracion

### Archivo de Configuracion

El plugin lee `.opencode/remote-config.json`:

```json
{
  "repositories": [
    {
      "url": "https://bitbucket.org/tu-org/skills.git",
      "ref": "main",
      "skills": { 
        "include": [
          "developer-code-analyzer",
          "architect-architecture-reviewer"
        ] 
      },
      "agents": {
        "include": ["review-code", "build-backend"]
      }
    }
  ],
  "installMethod": "copy",
  "logLevel": "debug"
}
```

### Opciones Globales

| Opcion | Tipo | Default | Descripcion |
|--------|------|---------|-------------|
| `repositories` | array | `[]` | Lista de repositorios |
| `installMethod` | `"link"` \| `"copy"` | `"copy"` (Windows) | Metodo de instalacion |
| `logLevel` | `"error"` \| `"warn"` \| `"info"` \| `"debug"` | `"info"` | Nivel de logs |

### Opciones por Repositorio

| Opcion | Tipo | Default | Descripcion |
|--------|------|---------|-------------|
| `url` | string | requerido | URL del repositorio Git |
| `ref` | string | default branch | Branch, tag o commit |
| `skills` | `"*"` \| `{include:[...]}` \| `{exclude:[...]}` | `"*"` | Filtro de skills |
| `agents` | `"*"` \| `{include:[...]}` \| `{exclude:[...]}` | `"*"` | Filtro de agents |
| `commands` | `"*"` \| `{include:[...]}` \| `{exclude:[...]}` | `"*"` | Filtro de commands |
| `plugins` | `"*"` \| `{include:[...]}` \| `{exclude:[...]}` | `"*"` | Filtro de plugins |

### Ejemplo: Configuracion Completa

```json
{
  "repositories": [
    {
      "url": "https://bitbucket.org/softrestaurant-team/skills.git",
      "ref": "main",
      "skills": { 
        "include": [
          "product-owner-feature-analizar",
          "product-owner-feature-proponer",
          "developer-operations-feature-implementer",
          "developer-operations-backend-code-generator",
          "developer-operations-netcore-code-reviewer",
          "developer-code-analyzer",
          "architect-architecture-reviewer"
        ]
      },
      "agents": {
        "include": [
          "plan-backend-netcore",
          "build-backend-netcore",
          "review-code",
          "review-code-backend"
        ]
      },
      "plugins": {
        "include": ["agent-logger", "cost-tracker"]
      }
    }
  ],
  "installMethod": "copy",
  "logLevel": "info"
}
```

---

## Nombres de Skills

**Importante:** El plugin convierte la estructura de carpetas a nombres con guiones.

| Estructura de carpetas | Nombre del skill |
|------------------------|------------------|
| `skill/code-review/` | `code-review` |
| `skill/architect/reviewer/` | `architect-reviewer` |
| `skill/product-owner/feature-analizar/` | `product-owner-feature-analizar` |

### En los filtros usa guiones, no slashes:

**Correcto:**
```json
{
  "skills": { "include": ["product-owner-feature-analizar"] }
}
```

**Incorrecto:**
```json
{
  "skills": { "include": ["product-owner/feature-analizar"] }
}
```

### Ver nombres disponibles

Usa `logLevel: "debug"` en `remote-config.json` y revisa el log:

```
[DISCOVER] Found skill: product-owner-feature-analizar
[DISCOVER] Found skill: architect-code-reviewer
[DISCOVER] Found skill: developer-operations-backend-code-generator
```

---

## Comandos del Plugin

Dentro de OpenCode puedes usar estos comandos:

| Comando | Descripcion |
|---------|-------------|
| `/remote-sync` | Fuerza re-descarga de todos los repositorios |
| `/remote-clear` | Limpia cache (re-descarga al reiniciar) |
| `/remote-status` | Muestra estado del plugin y repositorios |

---

## Desinstalacion

### Limpiar del proyecto

```bash
# Linux/macOS
rm -rf .opencode/node_modules/opencode-remote-config

# Windows CMD
rmdir /s /q .opencode\node_modules\opencode-remote-config
```

### Limpiar cache global

```bash
# Linux/macOS
rm -rf ~/.cache/opencode/remote-config

# Windows CMD
rmdir /s /q %USERPROFILE%\.cache\opencode\remote-config
```

### Desinstalar instalacion global

```bash
# Si instalaste con npm
npm uninstall -g opencode-remote-config

# Si instalaste con bun
bun remove -g opencode-remote-config
```

---

## Troubleshooting

### Error: "DependencyLoop" con bun

```
error: Package "opencode-remote-config@..." has a dependency loop
```

**Causa:** Bug en bun al resolver dependencias de paquetes instalados desde repositorios git. Bun lee el historial de commits y detecta dependencias circulares en commits antiguos.

**Soluciones (en orden de preferencia):**

1. **Usar Metodo 1** (clonar repositorio manualmente):
   ```bash
   mkdir -p .opencode/node_modules
   git clone --depth 1 https://bitbucket.org/softrestaurant-team/opencode-remote-config.git .opencode/node_modules/opencode-remote-config
   rm -rf .opencode/node_modules/opencode-remote-config/.git
   cd .opencode/node_modules/opencode-remote-config && bun install
   ```

2. **Usar npm** en lugar de bun:
   ```bash
   npm install -g git+https://bitbucket.org/softrestaurant-team/opencode-remote-config.git
   ```

3. **Limpiar cache de bun** completamente:
   ```bash
   rm -rf ~/.bun/install/cache
   rm ~/.bun/install/global/bun.lock
   bun add -g git+https://bitbucket.org/softrestaurant-team/opencode-remote-config.git
   ```

### Error: "Module not found" al ejecutar setup

```
error: Module not found ".../opencode-remote-config/dist/setup.js"
```

**Causa:** La instalacion global no se completo correctamente o el path es incorrecto.

**Solucion:** 
```bash
# Verificar donde esta instalado
npm root -g
# o
ls ~/.bun/install/global/node_modules/

# Reinstalar
npm uninstall -g opencode-remote-config
npm install -g git+https://bitbucket.org/softrestaurant-team/opencode-remote-config.git
```

### Error: "BunInstallFailedError"

OpenCode no encuentra el plugin.

**Verificar:**
1. Que `opencode.json` use ruta relativa:
   ```json
   { "plugin": ["./node_modules/opencode-remote-config"] }
   ```

2. Que el plugin este instalado:
   ```bash
   ls .opencode/node_modules/opencode-remote-config/dist/index.js
   ```

3. Que las dependencias esten instaladas:
   ```bash
   cd .opencode/node_modules/opencode-remote-config
   bun install
   ```

### Error: "Filtered skills: 27 -> 0"

Los nombres en los filtros no coinciden con los skills reales.

**Solucion:**
1. Usa guiones (`-`), no slashes (`/`)
2. Usa `logLevel: "debug"` para ver los nombres reales:
   ```json
   { "logLevel": "debug" }
   ```
3. Revisa el log para ver nombres exactos

### Error de autenticacion en repositorios privados

```
fatal: Authentication failed
```

**Solucion:**
```bash
# Configurar credential helper
git config --global credential.helper manager

# Verificar acceso manual
git clone https://bitbucket.org/tu-org/skills.git /tmp/test-clone
```

### Skills no aparecen en OpenCode

1. Verificar que `remote-config.json` este configurado correctamente
2. Ejecutar `/remote-sync` dentro de OpenCode
3. Reiniciar OpenCode
4. Revisar logs:
   ```bash
   cat ~/.cache/opencode/remote-config/plugin.log
   ```

### Forzar re-descarga completa

```bash
# Opcion 1: Comando dentro de OpenCode
/remote-sync

# Opcion 2: Borrar cache manualmente
rm -rf ~/.cache/opencode/remote-config/repos
# Luego reiniciar OpenCode

# Opcion 3: Limpiar todo
rm -rf ~/.cache/opencode/remote-config
rm -rf ~/.config/opencode/skill/_plugins
# Luego reiniciar OpenCode
```

---

## Estructura de Archivos

Despues de la instalacion correcta:

```
tu-proyecto/
├── .opencode/
│   ├── node_modules/
│   │   └── opencode-remote-config/    # Plugin instalado
│   │       ├── dist/                   # Codigo compilado
│   │       ├── node_modules/           # Dependencias del plugin
│   │       └── package.json
│   ├── opencode.json                   # plugin: ["./node_modules/..."]
│   ├── remote-config.json              # Configuracion de repos
│   └── package.json                    # (opcional)
├── .gitignore                          # Debe incluir .opencode
└── ... (tu codigo)
```

**Cache global (compartido entre proyectos):**
```
~/.cache/opencode/remote-config/
├── repos/                              # Repositorios clonados
│   └── skills/                         # Ejemplo
└── plugin.log                          # Logs del plugin

~/.config/opencode/skill/_plugins/      # Skills instalados
└── skills/                             # Nombre del repo
    ├── developer-code-analyzer/
    ├── architect-architecture-reviewer/
    └── ...
```

---

## Links

- [README.md](./README.md) - Guia rapida
- [SKILLS.md](./SKILLS.md) - Como crear repositorios de skills
- [Repositorio](https://bitbucket.org/softrestaurant-team/opencode-remote-config)
