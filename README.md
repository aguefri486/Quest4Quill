# Quest4Quill

Una aplicación de escritura moderna construida con Electron y TypeScript.

## 🚀 Primeros Pasos

### Requisitos
- Node.js 20+ (instalado automáticamente)
- npm

### Instalación

```bash
npm install
```

### Ejecutar la Aplicación

**Modo desarrollo (lo más fácil):**
```bash
npm start
```

Esto compilará el código TypeScript y lanzará la aplicación automáticamente.

### Tareas Disponibles en VS Code

En VS Code, puedes usar las tareas predefinidas (Ctrl+Shift+B o Terminal > Run Task):
- **Start Electron App (dev)** - Ejecuta la app en modo desarrollo (tarea predeterminada)
- **Compile TypeScript** - Solo compila los archivos TypeScript
- **Build Executable (Windows)** - Crea el ejecutable final (.exe)
- **Build Executable (Dev Mode)** - Build rápido sin empaquetamiento

## 🎯 Crear el Ejecutable

### Build Rápido (Desarrollo):
```bash
npm run build:dev
```
Genera el ejecutable portable sin optimizaciones. Útil para testear.

### Build Final (Producción):
```bash
npm run build
```
Crea el instalador oficial (.exe) completamente empaquetado.

**Los ejecutables se generan en la carpeta `dist/`**

## 📁 Estructura del Proyecto

```
Quest4Quill/
├── src/
│   ├── main/           # Proceso principal (Electron)
│   │   └── index.ts
│   ├── preload/        # Script de preload (seguridad)
│   │   └── index.ts
│   └── renderer/       # Interfaz de usuario
│       ├── index.html
│       ├── style.css
│       └── app.js
├── dist/               # Código compilado
├── .vscode/
│   └── tasks.json      # Tareas de VS Code
├── package.json        # Dependencias y scripts
├── tsconfig.json       # Configuración TypeScript
└── README.md
```

## ✨ Características Actuales

- ✏️ Editor de texto simple y funcional
- 📊 Contador automático de palabras y caracteres
- 💾 Guardado automático en localStorage
- 🎨 Interfaz moderna con gradientes
- 🌙 DevTools abierto automáticamente en desarrollo
- 📱 Diseño responsive

## 📦 Scripts npm

- `npm start` - Ejecuta la app (compila + lanza Electron)
- `npm run build:ts` - Compila TypeScript a JavaScript
- `npm run copy:assets` - Copia archivos estáticos (HTML, CSS)
- `npm run build:dev` - Crea executable rápido
- `npm run build` - Crea executable final

## 🔧 Configuración

### Cambiar Información de la App

Edita `package.json`:
- `"productName"` - Nombre visible de la aplicación
- `"version"` - Versión de la app
- `"appId"` en build - ID único para Windows

### Cambiar Dimensiones de la Ventana

Edita `src/main/index.ts` en `createWindow()`:
```typescript
mainWindow = new BrowserWindow({
  width: 1200,  // Ancho
  height: 800,  // Alto
  // ...
});
```

## 🐛 Troubleshooting

### "ERR_FILE_NOT_FOUND" al ejecutar
Ejecuta: `npm run copy:assets` para copiar archivos HTML/CSS

### npm no está disponible
Instala Node.js desde https://nodejs.org/

### Errores de GPU en la consola
Son normales en Electron. No afectan el funcionamiento de la app.

## 📝 Próximos Pasos

- [ ] Añadir exportación a archivos (.txt, .pdf)
- [ ] Historial de cambios
- [ ] Temas personalizables
- [ ] Sincronización en la nube
- [ ] Build para macOS
- [ ] Build para Linux

---

**¡Lista para desarrollar!** Abre el proyecto en VS Code y comienza a escribir. 🎉
