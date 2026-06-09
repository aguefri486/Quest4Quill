# Diagrama de Clases

> Nota: Este diagrama representa el modelo de dominio que maneja la interfaz de Quest4Quill.

## Como verlo

- En VS Code, abre este archivo y usa la vista previa de Markdown.
- En GitHub, los bloques Mermaid se renderizan de forma nativa.
- Si tu editor no muestra Mermaid, puedes pegar el contenido en un visor compatible.

```mermaid
classDiagram
direction LR

class World {
  +string id
  +string name
  +Story[] stories
  +Note[] notes
  +Character[] characters
  +Organization[] organizations
  +Region[] regions
  +Location[] locations
  +Item[] items
  +number createdAt
  +number updatedAt
}

class Story {
  +string id
  +string title
  +number order
  +Chapter[] chapters
  +number createdAt
  +number updatedAt
}

class Chapter {
  +string id
  +string title
  +string summary
  +string content
  +number order
  +number createdAt
  +number updatedAt
}

class Note {
  +string id
  +string title
  +string content
  +string? storyId
  +number order
  +number createdAt
  +number updatedAt
}

class Character {
  +string id
  +string firstName
  +string lastName
  +string secondLastName
  +string title
  +string alias
  +string gender
  +number? age
  +string type
  +string status
  +string notes
  +string description
  +string motivations
  +string personality
  +string? birthRegionId
  +string[] residenceRegionIds
  +string[] itemIds
  +Relation[] relations
  +number order
  +number createdAt
  +number updatedAt
}

class Relation {
  +string id
  +string targetId
  +string type
  +string note
  +number createdAt
  +number updatedAt
}

class Organization {
  +string id
  +string name
  +string notes
  +number personnel
  +string[] subsidiaryIds
  +string[] regionIds
  +string[] leaderIds
  +string[] subleaderIds
  +string[] memberIds
  +number order
  +number createdAt
  +number updatedAt
}

class Region {
  +string id
  +string name
  +string type
  +string notes
  +string[] childRegionIds
  +string[] locationIds
  +number order
  +number createdAt
  +number updatedAt
}

class Location {
  +string id
  +string name
  +string notes
  +number order
  +number createdAt
  +number updatedAt
}

class Item {
  +string id
  +string name
  +string type
  +string description
  +string? locationType
  +string? locationId
  +string? holderId
  +number order
  +number createdAt
  +number updatedAt
}

World "1" o-- "*" Story
World "1" o-- "*" Note
World "1" o-- "*" Character
World "1" o-- "*" Organization
World "1" o-- "*" Region
World "1" o-- "*" Location
World "1" o-- "*" Item
Story "1" o-- "*" Chapter
Character "1" o-- "*" Relation
Organization "1" o-- "*" Organization : subsidiaries
Region "1" o-- "*" Region : children
Region "1" o-- "*" Location
Character "1" o-- "*" Item : owns
Item "0..1" --> "0..1" Character : holder
Item "0..1" --> "0..1" Region : located in
Item "0..1" --> "0..1" Location : located in
Note "0..1" --> "1" Story
Relation "1" --> "1" Character : target
```

## Lectura rapida

- El diagrama de clases muestra la forma de los objetos que maneja la interfaz.
- Si quieres, este mismo contenido se puede convertir despues a SVG o PNG para insertarlo en la app o en el README.
