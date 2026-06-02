# Quest4Quill - Instrucciones del Proyecto

Aplicación Electron con TypeScript para crear un ejecutable de Windows.

## Estado del Proyecto ✅

- [x] Crear estructura del proyecto
- [x] Instalar dependencias
- [x] Compilar/verificar
- [x] Crear tareas
- [x] Lanzar proyecto

## 🎯 Cómo Usar el Proyecto

### Ejecutar la Aplicación
```bash
npm start
```
Compila TypeScript y lanza la app automáticamente con DevTools abierto.

### Crear Ejecutable
```bash
npm run build:dev  # Rápido (para testing)
npm run build      # Versión final
```

### Tareas en VS Code
Presiona `Ctrl+Shift+B` para ver tareas disponibles:
- Start Electron App (dev) - Tarea predeterminada
- Compile TypeScript
- Build Executable (Windows)
- Build Executable (Dev Mode)

## 📂 Estructura del Proyecto

```
Quest4Quill/
├── src/
│   ├── main/               # Proceso principal Electron
│   │   └── index.ts
│   ├── preload/            # Script de preload (seguridad)
│   │   └── index.ts
│   └── renderer/           # Interfaz de usuario
│       ├── index.html
│       ├── style.css
│       └── app.js
├── dist/                   # Archivos compilados y EXE
├── node_modules/           # Dependencias (no editar)
├── .vscode/
│   └── tasks.json          # Tareas de VS Code
├── .github/
│   └── copilot-instructions.md  # Este archivo
├── package.json            # Dependencias y scripts
├── tsconfig.json           # Config TypeScript
└── README.md               # Documentación completa
```

## 🔧 Scripts npm Disponibles

```bash
npm start           # Ejecutar en desarrollo
npm run build:ts    # Compilar solo TypeScript
npm run build:dev   # Crear EXE rápido
npm run build       # Crear EXE final
npm run copy:assets # Copiar archivos estáticos
npm install         # Instalar dependencias
```

## ✨ Características

- ✏️ Editor de texto funcional
- 📊 Contador de palabras y caracteres en tiempo real
- 💾 Guardado automático en localStorage
- 🎨 Interfaz moderna con gradientes
- 🔧 DevTools automático en desarrollo

## 📝 Notas Importantes

- Siempre usa `npm start` para probar cambios
- Los ejecutables se guardan en `dist/`
- Edita los archivos en `src/`, no en `dist/`
- TypeScript se compila automáticamente al ejecutar scripts
- Los archivos estáticos (HTML, CSS) se copian automáticamente

## 🚀 Próximas Mejoras Posibles

1. Exportación a PDF/Word
2. Sistema de temas
3. Sincronización en la nube
4. Compilación para macOS/Linux
5. Plugin system
6. Búsqueda y reemplazo avanzado

