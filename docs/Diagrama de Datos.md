# Diagrama de Datos

> Nota: Quest4Quill no usa una base de datos relacional. La persistencia actual vive en `localStorage`, asi que este diagrama representa el modelo logico de datos.

## Como verlo

- En VS Code, abre este archivo y usa la vista previa de Markdown.
- En GitHub, los bloques Mermaid se renderizan de forma nativa.
- Si tu editor no muestra Mermaid, puedes pegar el contenido en un visor compatible.

```mermaid
erDiagram
  WORLD ||--o{ STORY : contains
  WORLD ||--o{ NOTE : contains
  WORLD ||--o{ CHARACTER : contains
  WORLD ||--o{ ORGANIZATION : contains
  WORLD ||--o{ REGION : contains
  WORLD ||--o{ LOCATION : contains
  WORLD ||--o{ ITEM : contains

  STORY ||--o{ CHAPTER : has
  STORY ||--o{ NOTE : groups

  CHARACTER ||--o{ CHARACTER_RELATION : source
  CHARACTER ||--o{ ITEM : holds
  CHARACTER ||--o{ ORGANIZATION : leads
  CHARACTER ||--o{ ORGANIZATION : belongs_to
  CHARACTER ||--o{ REGION : resides_in

  ORGANIZATION ||--o{ ORGANIZATION : subsidiaries
  ORGANIZATION ||--o{ REGION : linked_to

  REGION ||--o{ REGION : parent_child
  REGION ||--o{ LOCATION : includes
  REGION ||--o{ ITEM : stores

  LOCATION ||--o{ ITEM : stores

  WORLD {
    string id PK
    string name
    number createdAt
    number updatedAt
  }

  STORY {
    string id PK
    string title
    number order
    number createdAt
    number updatedAt
  }

  CHAPTER {
    string id PK
    string title
    string summary
    string content
    number order
    number createdAt
    number updatedAt
  }

  NOTE {
    string id PK
    string title
    string content
    string storyId FK
    number order
    number createdAt
    number updatedAt
  }

  CHARACTER {
    string id PK
    string firstName
    string lastName
    string title
    string alias
    string type
    string status
    number order
    number createdAt
    number updatedAt
  }

  CHARACTER_RELATION {
    string id PK
    string targetId FK
    string type
    string note
    number createdAt
    number updatedAt
  }

  ORGANIZATION {
    string id PK
    string name
    string notes
    number personnel
    number order
    number createdAt
    number updatedAt
  }

  REGION {
    string id PK
    string name
    string type
    string notes
    number order
    number createdAt
    number updatedAt
  }

  LOCATION {
    string id PK
    string name
    string notes
    number order
    number createdAt
    number updatedAt
  }

  ITEM {
    string id PK
    string name
    string type
    string description
    string locationType
    string locationId
    string holderId FK
    number order
    number createdAt
    number updatedAt
  }
```

## Lectura rapida

- Este diagrama muestra como se conectan los datos dentro del almacen local.
- Si quieres, este mismo contenido se puede convertir despues a SVG o PNG para insertarlo en la app o en el README.
