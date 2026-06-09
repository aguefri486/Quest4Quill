# Quest4Quill

Quest4Quill es una aplicacion de escritorio con Electron para construir y organizar mundos narrativos. La app centraliza personajes, relaciones, historias, notas, lugares, organizaciones y objetos en una sola biblioteca local.

## Documentacion

- [Manual de Usuario](docs/Manual%20de%20Usuario.md)
- [Guia de Instalacion](docs/Guia%20de%20Instalacion.md)
- [Documentacion Tecnica](docs/Documentacion%20Tecnica.md)
- [Diagrama de Clases](docs/Diagrama%20de%20Clases.md)
- [Diagrama de Datos](docs/Diagrama%20de%20Datos.md)

## Resumen

La aplicacion se organiza en dos niveles:

1. Una biblioteca inicial donde se crean y abren mundos.
2. Una vista de mundo con secciones especializadas cargadas dentro de un `iframe`.

Dentro de cada mundo puedes trabajar con:
- historias
- notas
- relaciones
- personajes
- organizaciones
- regiones
- ubicaciones
- objetos

## Inicio rapido

Requisitos:
- Node.js 20 o superior
- npm

Instalacion:

```bash
npm install
```

Ejecucion en desarrollo:

```bash
npm start
```

## Atajos y comportamiento de ventana

- `F11` alterna la aplicacion entre ventana normal y pantalla completa borderless.
- `Esc` sale de algunos modos expansivos dentro de la interfaz, como la vista ampliada de Relaciones.
- La barra lateral de un mundo puede plegarse para ganar espacio de trabajo.

## Scripts utiles

- `npm start` compila TypeScript, copia los recursos del renderer y abre Electron.
- `npm run build:ts` compila solo TypeScript.
- `npm run copy:assets` copia los archivos de interfaz a `dist/`.
- `npm run build:dev` genera una build portable de prueba.
- `npm run build` genera el ejecutable de Windows en `dist/`.
- `npm run pack` genera la aplicacion empaquetada en modo directorio.
- `npm run dist` genera el instalador o paquete final.

## Funcionalidades destacadas

- Biblioteca de mundos con creacion y apertura directa.
- Importacion y exportacion de mundos individuales o de toda la biblioteca en JSON.
- Vista principal de cada mundo con barra lateral de secciones.
- Edicion de personajes con relacion entre personas, objetos y lugares.
- Mapa de relaciones con zoom, desplazamiento, modo expandido y nodos arrastrables.
- Guardado local de la informacion para seguir trabajando entre sesiones.

## Estructura general

```text
Quest4Quill/
|-- src/
|   |-- main/        Proceso principal de Electron
|   |-- preload/     Puente de seguridad entre procesos
|   `-- renderer/    Interfaz de usuario
|-- dist/            Salida compilada
|-- docs/            Documentacion del proyecto
|-- package.json
|-- README.md
`-- tsconfig.json
```

## Flujo de trabajo recomendado

1. Ejecuta `npm install` una sola vez.
2. Usa `npm start` mientras desarrollas.
3. Revisa el manual de usuario si quieres repasar la experiencia completa.
4. Consulta la documentacion tecnica si vas a tocar la arquitectura o el renderer.

## Notas de desarrollo

- Los datos se guardan localmente en el entorno de Electron.
- Si cambias HTML, CSS o JavaScript del renderer, recuerda que el contenido se copia a `dist/` en el flujo de arranque y build.
- Si tocas el proceso principal, revisa la documentacion tecnica para mantener alineada la ventana y sus atajos.
- El build de Windows actual no usa firmado de codigo, asi que Windows puede mostrar advertencias de seguridad al abrirlo por primera vez.
