# Guia de Creacion de Skills

Esta guia explica como estructurar un repositorio de skills para usar con opencode-remote-config.

## Estructura del Repositorio

```
tu-repo-skills/
├── skill/
│   ├── mi-skill/
│   │   └── SKILL.md
│   ├── categoria/
│   │   └── otro-skill/
│   │       └── SKILL.md
│   └── product-owner/
│       └── feature-analizar/
│           └── SKILL.md
├── agent/
│   └── code-reviewer.md
├── command/
│   └── deploy.md
├── plugin/
│   └── notify.ts
└── manifest.json
```

## Nombres de Skills

El plugin convierte la estructura de carpetas a nombres con guiones:

| Estructura de carpetas | Nombre del skill |
|------------------------|------------------|
| `skill/code-review/` | `code-review` |
| `skill/architect/code-reviewer/` | `architect-code-reviewer` |
| `skill/product-owner/feature-analizar/` | `product-owner-feature-analizar` |

**Importante:** Cuando uses filtros en `remote-config.json`, usa guiones (`-`), no slashes (`/`):

```json
{
  "skills": { "include": ["product-owner-feature-analizar"] }
}
```

**NO:**
```json
{
  "skills": { "include": ["product-owner/feature-analizar"] }
}
```

## Formato de SKILL.md

Cada skill debe tener un archivo `SKILL.md` con frontmatter YAML:

```markdown
---
name: mi-skill
description: Descripcion breve del skill
---

# Contenido del Skill

Instrucciones detalladas para el agente...
```

## Formato de Agents

Los agents son archivos markdown en `agent/` o `agents/`:

```markdown
---
description: Agente especializado en revision de codigo
mode: subagent
model: anthropic/claude-sonnet-4-5
temperature: 0.7
---

Eres un experto en revision de codigo. Tu rol es...
```

### Campos disponibles para agents:

| Campo | Descripcion |
|-------|-------------|
| `description` | Descripcion del agente |
| `mode` | `subagent`, `primary`, o `all` |
| `model` | Modelo a usar |
| `temperature` | Temperatura de muestreo |
| `top_p` | Top-p de muestreo |
| `color` | Color hex (ej: `#FF5733`) |
| `tools` | Herramientas habilitadas |

## Formato de Commands

Los commands son archivos markdown en `command/` o `commands/`:

```markdown
---
description: Ejecuta el deploy a produccion
---

Ejecuta el proceso de deploy siguiendo estos pasos:
1. Verificar tests
2. Build del proyecto
3. Deploy a produccion
```

## Formato de Plugins

Los plugins son archivos TypeScript/JavaScript en `plugin/` o `plugins/`:

```typescript
import type { Plugin } from "@opencode-ai/plugin"

export const MiPlugin: Plugin = async (ctx) => {
  return {
    event: async ({ event }) => {
      // Manejar eventos
    }
  }
}

export default MiPlugin
```

**Importante:** Los plugins deben ser auto-contenidos. No usar imports locales como `./utils`.

## manifest.json

Opcional. Define instrucciones adicionales:

```json
{
  "instructions": ["README.md", "docs/guia.md"]
}
```

## Ejemplos de Filtros

### Importar todos los skills:

```json
{
  "repositories": [
    {
      "url": "https://bitbucket.org/tu-org/skills.git"
    }
  ]
}
```

### Importar skills especificos:

```json
{
  "repositories": [
    {
      "url": "https://bitbucket.org/tu-org/skills.git",
      "skills": { "include": ["product-owner-feature-analizar", "architect-code-reviewer"] }
    }
  ]
}
```

### Excluir skills:

```json
{
  "repositories": [
    {
      "url": "https://bitbucket.org/tu-org/skills.git",
      "skills": { "exclude": ["deprecated-skill", "experimental-feature"] }
    }
  ]
}
```

### Solo agents, sin skills:

```json
{
  "repositories": [
    {
      "url": "https://bitbucket.org/tu-org/skills.git",
      "skills": { "include": [] },
      "agents": "*"
    }
  ]
}
```

## Verificar Skills Disponibles

Usa `logLevel: "debug"` en tu configuracion para ver todos los skills detectados:

```json
{
  "repositories": [...],
  "logLevel": "debug"
}
```

Luego revisa el log:

```bash
# Windows
type %USERPROFILE%\.cache\opencode\remote-config\plugin.log

# Linux/macOS
cat ~/.cache/opencode/remote-config/plugin.log
```

Busca lineas como:
```
[DISCOVER] Found skill: product-owner-feature-analizar
```
