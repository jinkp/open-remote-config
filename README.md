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

2. **Bun**
   ```powershell
   powershell -c "irm bun.sh/install.ps1 | iex"
   ```
   - Verificar: `bun --version`
   - Requiere reiniciar la terminal despues de instalar

3. **OpenCode**
   ```bash
   bun add -g opencode
   ```
   - Verificar: `opencode --version`

4. **Cuenta en Bitbucket** (si usas repositorios privados)
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

2. **Bun**
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

3. **OpenCode**
   ```bash
   bun add -g opencode
   ```

## Instalacion Rapida

```bash
# 1. Instalar el plugin globalmente
bun add -g git+https://bitbucket.org/softrestaurant-team/opencode-remote-config.git

# 2. Ejecutar setup en tu proyecto
# Windows:
bun C:\Users\TU_USUARIO\.bun\install\global\node_modules\opencode-remote-config\dist\setup.js

# Linux/macOS:
bun ~/.bun/install/global/node_modules/opencode-remote-config/dist/setup.js

# 3. Agregar .opencode al .gitignore de tu proyecto
echo .opencode >> .gitignore
```

**Importante:** Agrega `.opencode` a tu `.gitignore` para no subir el plugin y node_modules al repositorio.

## Configuracion Minima

Edita `.opencode/remote-config.json`:

```json
{
  "repositories": [
    {
      "url": "https://bitbucket.org/tu-org/skills.git",
      "ref": "main"
    }
  ],
  "installMethod": "copy"
}
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

## Troubleshooting Rapido

| Problema | Solucion |
|----------|----------|
| `bun: command not found` | Reinstalar Bun y reiniciar terminal |
| `git: command not found` | Instalar Git para Windows |
| Error de autenticacion | Configurar credenciales: `git config --global credential.helper manager` |
| Skills no aparecen | Verificar nombres con guiones en filtros, no slashes |

## Licencia

MIT
