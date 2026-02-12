# OpenCode Remote Config - Manual de Instalacion

Plugin para sincronizar skills, agents, commands e instructions desde repositorios Git remotos.

## Tabla de Contenidos

- [Requisitos](#requisitos)
- [Instalacion](#instalacion)
- [Verificar Instalacion](#verificar-instalacion)
- [Configuracion](#configuracion)
- [Desinstalacion](#desinstalacion)
- [Troubleshooting](#troubleshooting)

---

## Requisitos

- [Bun](https://bun.sh/) >= 1.0.0
- [OpenCode](https://opencode.ai/) instalado
- Git (para clonar repositorios remotos)

---

## Instalacion

### Desde Bitbucket (recomendado)

```bash
bun add git+https://joelkeb@bitbucket.org/softrestaurant-team/opencode-remote-config.git
```

### Con version especifica

```bash
# Tag especifico
bun add git+https://joelkeb@bitbucket.org/softrestaurant-team/opencode-remote-config.git#v1.0.0

# Branch especifico
bun add git+https://joelkeb@bitbucket.org/softrestaurant-team/opencode-remote-config.git#main
```

### Instalacion global

```bash
bun add -g git+https://joelkeb@bitbucket.org/softrestaurant-team/opencode-remote-config.git
```

---

## Verificar Instalacion

### 1. Verificar en package.json

```bash
# Windows
type package.json | findstr "opencode-remote-config"

# Linux/macOS
cat package.json | grep "opencode-remote-config"
```

Deberia mostrar algo como:
```json
"opencode-remote-config": "git+https://joelkeb@bitbucket.org/softrestaurant-team/opencode-remote-config.git"
```

### 2. Verificar en node_modules

```bash
# Windows
dir node_modules\opencode-remote-config

# Linux/macOS
ls node_modules/opencode-remote-config
```

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
      "url": "https://joelkeb@bitbucket.org/softrestaurant-team/skills.git",
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
  "plugins": ["opencode-remote-config"]
}
```

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
      "url": "https://joelkeb@bitbucket.org/softrestaurant-team/skills.git",
      "ref": "main"
    },
    {
      "url": "git@bitbucket.org:softrestaurant-team/shared-agents.git",
      "ref": "main",
      "agents": "*",
      "skills": { "exclude": ["deprecated-skill"] }
    }
  ],
  "installMethod": "copy",
  "logLevel": "info"
}
```

Registra el plugin globalmente en `~/.config/opencode/opencode.json`:

```json
{
  "plugins": ["opencode-remote-config"]
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

## Desinstalacion

### Desinstalar del proyecto

```bash
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

1. Verifica que el plugin este en `opencode.json`:
   ```json
   { "plugins": ["opencode-remote-config"] }
   ```

2. Verifica que existe `remote-config.json` en `.opencode/` o `~/.config/opencode/`

3. Revisa los logs:
   ```bash
   type %USERPROFILE%\.cache\opencode\remote-config\plugin.log
   ```

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

### Limpiar cache de repositorios

```bash
# Windows
rmdir /s /q %USERPROFILE%\.cache\opencode\remote-config\repos

# Linux/macOS
rm -rf ~/.cache/opencode/remote-config/repos
```

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
