# opencode-remote-config

Plugin de OpenCode para sincronizar skills, agents, commands e instructions desde repositorios Git remotos.

## Caracteristicas

- Sincroniza skills, agents, commands y plugins desde repositorios Git
- Soporte para Windows y Unix/Linux/macOS
- Sistema de logging detallado
- Filtros para importar solo lo que necesitas
- Comandos para re-sincronizar sin reiniciar

## Instalacion Rapida

```bash
# 1. Instalar globalmente
bun add -g git+https://bitbucket.org/softrestaurant-team/opencode-remote-config.git

# 2. Ejecutar setup en tu proyecto (Windows)
bun C:\Users\TU_USUARIO\.bun\install\global\node_modules\opencode-remote-config\dist\setup.js
```

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

## Documentacion

- **[MANUAL.md](./MANUAL.md)** - Guia completa de instalacion y configuracion
- **[SKILLS.md](./SKILLS.md)** - Como crear y estructurar repositorios de skills

## Comandos

| Comando | Descripcion |
|---------|-------------|
| `/remote-sync` | Re-descarga todos los repositorios |
| `/remote-clear` | Limpia cache |
| `/remote-status` | Muestra estado |

## Licencia

MIT
