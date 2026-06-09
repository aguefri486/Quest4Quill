# Guia de Instalacion

## Requisitos

Antes de empezar, necesitas:
- Windows con soporte para Electron.
- Node.js 20 o superior.
- npm, que normalmente viene incluido con Node.js.

## Instalacion del proyecto

1. Abre una terminal en la raiz del proyecto.
2. Instala las dependencias:

```bash
npm install
```

3. Espera a que termine la instalacion. No cierres la terminal mientras se descargan los paquetes.

## Ejecutar en desarrollo

Para abrir la aplicacion en modo desarrollo:

```bash
npm start
```

Este comando:
- compila TypeScript
- copia los recursos de la interfaz a `dist/`
- lanza Electron con el proyecto cargado

## Generar compilaciones

### Build de prueba

```bash
npm run build:dev
```

Genera una version portable para probar la aplicacion sin crear el instalador final.

### Build final

```bash
npm run build
```

Genera el paquete final para Windows segun la configuracion del proyecto.

## Problemas frecuentes

### `npm` no se reconoce

Instala Node.js desde la web oficial y vuelve a abrir la terminal.

### La aplicacion no abre o muestra errores de archivos

Vuelve a ejecutar:

```bash
npm start
```

Si solo necesitas copiar los archivos del renderer:

```bash
npm run copy:assets
```

### La compilacion falla

Comprueba que:
- estas usando Node.js 20 o superior
- ejecutaste `npm install`
- no faltan archivos en `src/`

## Recomendacion

Si vas a editar el proyecto con frecuencia, usa `npm start` durante el desarrollo y deja `npm run build` solo para generar la version final.
