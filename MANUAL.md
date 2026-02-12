# OpenCode Remote Config - Manual de Instalacion

Plugin para sincronizar skills, agents, commands e instructions desde repositorios Git remotos.

## Tabla de Contenidos

- [Requisitos](#requisitos)
- [Instalacion Rapida (Recomendada)](#instalacion-rapida-recomendada)
- [Instalacion Manual](#instalacion-manual)
- [Verificar Instalacion](#verificar-instalacion)
- [Configuracion](#configuracion)
- [Comandos del Plugin](#comandos-del-plugin)
- [Desinstalacion](#desinstalacion)
- [Troubleshooting](#troubleshooting)

---

## Requisitos

- [Bun](https://bun.sh/) >= 1.0.0 o [Node.js](https://nodejs.org/) >= 18
- [OpenCode](https://opencode.ai/) instalado
- Git (para clonar repositorios remotos)

---

## Instalacion Rapida (Recomendada)

Ejecuta el script de setup en la raiz de tu proyecto:

```bash
# Opcion 1: Ejecutar directamente
bunx --bun https://bitbucket.org/softrestaurant-team/opencode-remote-config/raw/main/dist/setup.js

# Opcion 2: Instalar globalmente primero
bun add -g git+https://bitbucket.org/softrestaurant-team/opencode-remote-config.git
opencode-remote-config-setup
```

El script automaticamente:
1. Crea la carpeta `.opencode` si no existe
2. Agrega el plugin a `.opencode/package.json`
3. Crea un `remote-config.json` de ejemplo
4. Agrega el plugin a `opencode.json`
5. Ejecuta `bun install`

**Despues de ejecutar el setup:**
1. Edita `.opencode/remote-config.json` con tus repositorios
2. Inicia OpenCode

---

## Instalacion Manual

Si prefieres instalar manualmente, sigue estos pasos:

### Paso 1: Crear estructura de carpetas

```bash
mkdir .opencode
cd .opencode
```

### Paso 2: Crear package.json

Crea `.opencode/package.json`:

```json
{
  "dependencies": {
    "opencode-remote-config": "git+https://bitbucket.org/softrestaurant-team/opencode-remote-config.git"
  }
}
```

### Paso 3: Instalar dependencias

```bash
bun install
# o
npm install
```

### Paso 4: Crear opencode.json

Crea `.opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-remote-config"]
}
```

### Paso 5: Crear remote-config.json

Crea `.opencode/remote-config.json`:

```json
{
  "repositories": [
    {
      "url": "https://bitbucket.org/tu-org/tu-repo-skills.git",
      "ref": "main"
    }
  ],
  "installMethod": "copy",
  "logLevel": "info"
}
```

### Paso 6: Iniciar OpenCode

```bash
opencode
```

---

## Verificar Instalacion

### 1. Verificar en package.json

```bash
# Windows
type .opencode\package.json | findstr "opencode-remote-config"

# Linux/macOS
cat .opencode/package.json | grep "opencode-remote-config"
```

Deberia mostrar algo como:
```json
"opencode-remote-config": "git+https://bitbucket.org/softrestaurant-team/opencode-remote-config.git"
```

### 2. Verificar en node_modules

```bash
# Windows
type .opencode\node_modules\opencode-remote-config\package.json | findstr "version"

# Linux/macOS
cat .opencode/node_modules/opencode-remote-config/package.json | grep "version"
```

Deberia mostrar: `"version": "0.5.0"` o superior.

### 3. Verificar logs del plugin

Despues de ejecutar OpenCode, revisa el log:

```bash
# Windows
type %USERPROFILE%\.cache\opencode\remote-config\plugin.log

# Linux/macOS
cat ~/.cache/opencode/remote-config/plugin.log
```

---

## Configuracion

### Configuracion por Proyecto

Crea el archivo `.opencode/remote-config.json` en la raiz de tu proyecto:

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

Luego registra el plugin en `.opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-remote-config"]
}
```

**Nota:** La clave es `"plugin"` (singular), no `"plugins"`.

### Configuracion Global

La configuracion global aplica a todos los proyectos donde no exista configuracion local.

**Windows:**
```
%USERPROFILE%\.config\opencode\remote-config.json
```

**Linux/macOS:**
```
~/.config/opencode/remote-config.json
```

Ejemplo de configuracion global:

```json
{
  "repositories": [
    {
      "url": "https://bitbucket.org/tu-org/skills.git",
      "ref": "main"
    },
    {
      "url": "git@bitbucket.org:tu-org/shared-agents.git",
      "ref": "main",
      "agents": "*",
      "skills": { "exclude": ["deprecated-skill"] }
    }
  ],
  "installMethod": "copy",
  "logLevel": "info"
}
```

### Opciones de Configuracion

| Opcion | Tipo | Default | Descripcion |
|--------|------|---------|-------------|
| `repositories` | array | `[]` | Lista de repositorios a sincronizar |
| `installMethod` | `"link"` \| `"copy"` | `"copy"` (Windows) / `"link"` (otros) | Metodo de instalacion |
| `logLevel` | `"error"` \| `"warn"` \| `"info"` \| `"debug"` | `"info"` | Nivel de detalle en logs |

### Opciones por Repositorio

| Opcion | Tipo | Default | Descripcion |
|--------|------|---------|-------------|
| `url` | string | requerido | URL del repositorio (HTTPS o SSH) |
| `ref` | string | branch default | Branch, tag o commit a usar |
| `skills` | `"*"` \| `{include: [...]}` \| `{exclude: [...]}` | `"*"` | Filtro de skills |
| `agents` | `"*"` \| `{include: [...]}` \| `{exclude: [...]}` | `"*"` | Filtro de agents |
| `commands` | `"*"` \| `{include: [...]}` \| `{exclude: [...]}` | `"*"` | Filtro de commands |
| `plugins` | `"*"` \| `{include: [...]}` \| `{exclude: [...]}` | `"*"` | Filtro de plugins |
| `instructions` | `"*"` \| `{include: [...]}` \| `{exclude: [...]}` | `"*"` | Filtro de instructions |

### Ejemplos de Filtros

```json
{
  "repositories": [
    {
      "url": "https://example.com/repo.git",
      "skills": "*",
      "agents": { "include": ["code-reviewer", "tester"] },
      "commands": { "exclude": ["deprecated-cmd"] }
    }
  ]
}
```

---

## Comandos del Plugin

El plugin registra comandos que puedes usar dentro de OpenCode:

| Comando | Descripcion |
|---------|-------------|
| `/remote-sync` | Fuerza re-sincronizacion de todos los repositorios (borra cache y re-descarga) |
| `/remote-clear` | Limpia el cache sin re-sincronizar (re-descarga al reiniciar OpenCode) |
| `/remote-status` | Muestra estado del plugin y sesion actual |

### Uso

Dentro de OpenCode, escribe:

```
/remote-sync
```

Para forzar que el plugin descargue de nuevo todos los repositorios.

---

## Desinstalacion

### Desinstalar del proyecto

```bash
cd .opencode
bun remove opencode-remote-config
```

### Desinstalar global

```bash
bun remove -g opencode-remote-config
```

### Limpiar archivos de configuracion

```bash
# Windows - Configuracion local
rmdir /s /q .opencode

# Windows - Configuracion global
rmdir /s /q %USERPROFILE%\.config\opencode

# Windows - Cache y logs
rmdir /s /q %USERPROFILE%\.cache\opencode\remote-config

# Linux/macOS - Configuracion local
rm -rf .opencode

# Linux/macOS - Configuracion global
rm -rf ~/.config/opencode

# Linux/macOS - Cache y logs
rm -rf ~/.cache/opencode/remote-config
```

### Limpiar skills instalados

Los skills se instalan en `_plugins/` dentro de tu proyecto:

```bash
# Windows
rmdir /s /q _plugins

# Linux/macOS
rm -rf _plugins
```

---

## Troubleshooting

### El plugin no carga

1. Verifica que el plugin este en `.opencode/opencode.json`:
   ```json
   { "plugin": ["opencode-remote-config"] }
   ```
   **Nota:** Es `"plugin"` (singular), no `"plugins"`.

2. Verifica que el plugin este instalado:
   ```bash
   type .opencode\node_modules\opencode-remote-config\package.json
   ```

3. Verifica que existe `remote-config.json` en `.opencode/`

4. Revisa los logs:
   ```bash
   type %USERPROFILE%\.cache\opencode\remote-config\plugin.log
   ```

### Error "BunInstallFailedError"

OpenCode no puede encontrar el plugin. Asegurate de:

1. Tener el plugin en `.opencode/package.json`:
   ```json
   {
     "dependencies": {
       "opencode-remote-config": "git+https://bitbucket.org/softrestaurant-team/opencode-remote-config.git"
     }
   }
   ```

2. Ejecutar `bun install` o `npm install` en la carpeta `.opencode`

### Error de permisos en Windows (EPERM)

El plugin usa `copy` por defecto en Windows. Si ves errores EPERM con symlinks:

```json
{
  "installMethod": "copy"
}
```

### Los skills no se sincronizan

1. Verifica la URL del repositorio
2. Verifica que tienes acceso al repositorio (credenciales Git)
3. Usa `logLevel: "debug"` para ver detalles:
   ```json
   { "logLevel": "debug" }
   ```

### Conflicto con skills locales

Si existe un skill local con el mismo nombre, el plugin lo omite. Revisa el log para ver skills omitidos:

```
[WARN] Conflict: 'skill-name' exists locally, skipping
```

### Forzar re-descarga de repositorios

Usa el comando `/remote-sync` dentro de OpenCode, o manualmente:

```bash
# Windows
rmdir /s /q %USERPROFILE%\.cache\opencode\remote-config\repos

# Linux/macOS
rm -rf ~/.cache/opencode/remote-config/repos
```

Luego reinicia OpenCode.

---

## Estructura de un Repositorio de Skills

```
mi-repo/
  skill/
    mi-skill/
      SKILL.md
      prompt.md
  agent/
    code-reviewer.md
  command/
    deploy.md
  plugin/
    notify.ts
  manifest.json
```

### manifest.json (opcional)

```json
{
  "instructions": ["README.md", "docs/setup.md"]
}
```

---

## Soporte

Para reportar problemas o sugerencias:
https://bitbucket.org/softrestaurant-team/opencode-remote-config/issues
