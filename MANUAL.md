# OpenCode Remote Config - Manual de Instalacion

Plugin para sincronizar skills, agents, commands e instructions desde repositorios Git remotos.

## Tabla de Contenidos

- [Requisitos](#requisitos)
- [Instalacion con Script](#instalacion-con-script)
- [Instalacion Manual](#instalacion-manual)
- [Verificar Instalacion](#verificar-instalacion)
- [Configuracion](#configuracion)
- [Nombres de Skills](#nombres-de-skills)
- [Comandos del Plugin](#comandos-del-plugin)
- [Desinstalacion](#desinstalacion)
- [Troubleshooting](#troubleshooting)

---

## Requisitos

- [Bun](https://bun.sh/) >= 1.0.0
- [OpenCode](https://opencode.ai/) instalado
- Git (para clonar repositorios remotos)

---

## Instalacion con Script

### Paso 1: Instalar el plugin globalmente

```bash
bun add -g git+https://bitbucket.org/softrestaurant-team/opencode-remote-config.git
```

### Paso 2: Ejecutar el setup en tu proyecto

**Windows:**
```bash
bun C:\Users\TU_USUARIO\.bun\install\global\node_modules\opencode-remote-config\dist\setup.js
```

**Linux/macOS:**
```bash
bun ~/.bun/install/global/node_modules/opencode-remote-config/dist/setup.js
```

El script automaticamente:
1. Crea `.opencode/` si no existe
2. Clona el plugin a `.opencode/node_modules/` (sin `.git`)
3. Crea `opencode.json` con `"plugin": ["./node_modules/opencode-remote-config"]`
4. Crea `remote-config.json` de ejemplo
5. Instala dependencias del plugin

### Paso 3: Configurar repositorios

Edita `.opencode/remote-config.json`:

```json
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
```

### Paso 4: Iniciar OpenCode

```bash
opencode
```

---

## Instalacion Manual

Si prefieres instalar sin el script:

### Paso 1: Crear estructura

```bash
mkdir -p .opencode/node_modules
cd .opencode/node_modules
git clone --depth 1 https://bitbucket.org/softrestaurant-team/opencode-remote-config.git opencode-remote-config
```

### Paso 2: Remover .git (evita repos anidados)

```bash
# Windows
rmdir /s /q opencode-remote-config\.git

# Linux/macOS
rm -rf opencode-remote-config/.git
```

### Paso 3: Instalar dependencias del plugin

```bash
cd opencode-remote-config
bun install
cd ../..
```

### Paso 4: Crear opencode.json

Crea `.opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["./node_modules/opencode-remote-config"]
}
```

**Nota:** Usar ruta relativa `./node_modules/...` es importante.

### Paso 5: Crear remote-config.json

Crea `.opencode/remote-config.json`:

```json
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
```

---

## Verificar Instalacion

### 1. Verificar estructura

```bash
# Windows
dir .opencode\node_modules\opencode-remote-config

# Linux/macOS
ls .opencode/node_modules/opencode-remote-config
```

### 2. Verificar logs

Despues de iniciar OpenCode:

```bash
# Windows
type %USERPROFILE%\.cache\opencode\remote-config\plugin.log

# Linux/macOS
cat ~/.cache/opencode/remote-config/plugin.log
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
      "skills": { "include": ["product-owner-feature-analizar"] }
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
| `url` | string | requerido | URL del repositorio |
| `ref` | string | default branch | Branch, tag o commit |
| `skills` | `"*"` \| `{include:[...]}` \| `{exclude:[...]}` | `"*"` | Filtro de skills |
| `agents` | `"*"` \| `{include:[...]}` \| `{exclude:[...]}` | `"*"` | Filtro de agents |
| `commands` | `"*"` \| `{include:[...]}` \| `{exclude:[...]}` | `"*"` | Filtro de commands |

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

Usa `logLevel: "debug"` y revisa el log:

```
[DISCOVER] Found skill: product-owner-feature-analizar
[DISCOVER] Found skill: architect-code-reviewer
```

---

## Comandos del Plugin

Dentro de OpenCode:

| Comando | Descripcion |
|---------|-------------|
| `/remote-sync` | Fuerza re-descarga de todos los repositorios |
| `/remote-clear` | Limpia cache (re-descarga al reiniciar) |
| `/remote-status` | Muestra estado del plugin |

---

## Desinstalacion

### Limpiar del proyecto

```bash
# Windows
rmdir /s /q .opencode\node_modules\opencode-remote-config
rmdir /s /q _plugins

# Linux/macOS
rm -rf .opencode/node_modules/opencode-remote-config
rm -rf _plugins
```

### Limpiar cache global

```bash
# Windows
rmdir /s /q %USERPROFILE%\.cache\opencode\remote-config

# Linux/macOS
rm -rf ~/.cache/opencode/remote-config
```

### Desinstalar global

```bash
bun remove -g opencode-remote-config
```

---

## Troubleshooting

### Error: "BunInstallFailedError"

OpenCode no encuentra el plugin. Verifica:

1. Que `opencode.json` use ruta relativa:
   ```json
   { "plugin": ["./node_modules/opencode-remote-config"] }
   ```

2. Que el plugin este instalado en `.opencode/node_modules/`

### Error: "Filtered skills: 27 -> 0"

Los nombres de los filtros no coinciden. Recuerda:
- Usa guiones (`-`), no slashes (`/`)
- Usa `logLevel: "debug"` para ver los nombres reales

### El plugin no carga

1. Verifica la ruta en `opencode.json`
2. Verifica que exista `.opencode/remote-config.json`
3. Revisa el log para errores

### Forzar re-descarga

```bash
# Opcion 1: Comando dentro de OpenCode
/remote-sync

# Opcion 2: Borrar cache manualmente
# Windows
rmdir /s /q %USERPROFILE%\.cache\opencode\remote-config\repos

# Linux/macOS
rm -rf ~/.cache/opencode/remote-config/repos
```

---

## Estructura de Archivos

Despues de la instalacion:

```
tu-proyecto/
├── .opencode/
│   ├── node_modules/
│   │   └── opencode-remote-config/    # Plugin (sin .git)
│   ├── opencode.json                   # plugin: ["./node_modules/..."]
│   └── remote-config.json              # Tus repositorios
├── _plugins/                           # Skills instalados (creado por el plugin)
│   └── nombre-repo/
│       └── nombre-skill/
└── ... (tu codigo)
```

---

## Links

- [SKILLS.md](./SKILLS.md) - Como crear repositorios de skills
- [Repositorio](https://bitbucket.org/softrestaurant-team/opencode-remote-config)
