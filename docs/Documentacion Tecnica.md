# Documentacion Tecnica

## Visión general

Quest4Quill es una aplicacion de escritorio construida con Electron. Su objetivo es ofrecer una interfaz local para estructurar mundos narrativos y navegar entre distintos tipos de informacion sin depender de un backend externo.

La aplicacion se apoya en tres capas principales:

- proceso principal (`src/main`)
- capa de seguridad/preload (`src/preload`)
- renderers HTML/CSS/JS (`src/renderer`)

## Arquitectura

### Proceso principal

El proceso principal crea la ventana Electron, configura el comportamiento general de la aplicacion y gestiona eventos de la ventana.

Archivo principal:
- `src/main/electron/main.ts`

Responsabilidades:
- crear la ventana principal
- cargar la pantalla inicial
- desactivar el menu de aplicacion
- controlar el comportamiento de pantalla completa con `F11`

### Preload

La capa de preload existe para exponer acceso controlado al renderer si en el futuro se necesitan puentes con APIs de Electron o del sistema.

Archivo:
- `src/preload/electron/preload.ts`

### Renderer

La interfaz de usuario se implementa en HTML, CSS y JavaScript dentro de `src/renderer`.

Rutas principales:
- `src/renderer/pages/home`
- `src/renderer/pages/world`
- `src/renderer/pages/world/subpages/*`

## Navegacion

La navegacion se organiza en dos pantallas grandes:

### Biblioteca

La vista de inicio muestra la lista de mundos disponibles y un boton para crear uno nuevo.

### Mundo

La vista de mundo usa una barra lateral para seleccionar secciones y un `iframe` para cargar cada subpagina de forma aislada.

El enrutado interno de la vista de mundo se define en:
- `src/renderer/pages/world/world.js`

## Persistencia

La aplicacion usa `localStorage` del navegador embebido para guardar datos y preferencias de interfaz.

Claves relevantes:
- `quest4quill_worlds`
- `quest4quill_world_sidebar_collapsed`

Ventajas:
- persistencia local simple
- sin servidor
- sin necesidad de autenticacion

Limitaciones:
- los datos dependen del perfil local de Electron
- no existe sincronizacion en la nube

## Modelo de datos

Cada mundo contiene colecciones internas de entidades narrativas. Entre las mas importantes:

- `stories`
- `notes`
- `characters`
- `organizations`
- `regions`
- `locations`
- `items`

El submundo de relaciones reconstruye un grafo a partir de:

- personajes
- objetos
- relaciones entre personajes
- portadores de objetos

## Relación entre pantallas

La app sigue una logica modular:

- la pantalla de inicio decide que mundo abrir
- la vista de mundo decide que seccion cargar
- cada subpagina maneja su propio estado y su propia UI

Esto permite mantener los dominios separados y reducir el acoplamiento entre pantallas.

## Sistema de relaciones

La vista de Relaciones es una de las piezas mas complejas del renderer.

Caracteristicas:
- grafo renderizado con capas absolutas
- aristas en SVG
- nodos con posicion calculada
- zoom con botones y rueda
- desplazamiento del fondo por arrastre
- modo expandido dentro de la propia pagina
- nodos arrastrables con efecto elastico

Archivo principal:
- `src/renderer/pages/world/subpages/relations/relations.js`

Detalles de implementacion:
- el estado del grafo se mantiene en memoria mientras la vista esta abierta
- la posicion de nodos se recalcula con una simulacion de fuerzas
- el arrastre de nodos actua como una fuerza adicional en la simulacion
- el zoom y el pan modifican solo la vista, no la estructura del grafo

## Atajos de ventana

El proceso principal escucha `before-input-event` en la ventana de Electron para alternar el modo pantalla completa cuando el usuario pulsa `F11`.

Comportamiento:
- `F11` activa o desactiva la pantalla completa borderless
- el cambio se produce desde el proceso principal, no desde el renderer
- la barra de menu esta desactivada

## Scripts npm

Scripts definidos en `package.json`:

- `npm start`
- `npm run build:ts`
- `npm run copy:assets`
- `npm run build:dev`
- `npm run build`
- `npm run pack`
- `npm run dist`

### Flujo habitual

1. TypeScript se compila a JavaScript.
2. Los assets del renderer se copian a `dist/`.
3. Electron arranca apuntando al output compilado.

## Estructura de directorios

```text
src/
|-- main/
|   `-- electron/main.ts
|-- preload/
|   `-- electron/preload.ts
`-- renderer/
    |-- pages/
    |   |-- home/
    |   `-- world/
    `-- styles/
```

## Consideraciones tecnicas

- La interfaz depende bastante de `localStorage`, asi que limpiar el almacenamiento local borra mundos y preferencias.
- Los renderers de subpagina se cargan dentro de un `iframe`, por lo que cada modulo tiene su propio HTML, CSS y JS.
- Si se modifica una ruta de subpagina, hay que actualizar el mapa de rutas del archivo `world.js`.
- El modo pantalla completa de la ventana se controla en `main.ts`, mientras que el modo expandido del mapa se controla en el renderer de Relaciones.

## Puntos de entrada utiles

- `src/main/electron/main.ts`
- `src/preload/electron/preload.ts`
- `src/renderer/pages/home/index.html`
- `src/renderer/pages/world/world.html`
- `src/renderer/pages/world/world.js`
