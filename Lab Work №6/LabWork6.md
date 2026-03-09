# Лабораторная работа №6  
**Тема:** Использование шаблонов проектирования <br>
**Проект:** *Mental Maps*  
**Цель работы:** Получить опыт применения шаблонов проектирования при написании кода программной системы.

## I. Порождающие шаблоны

### 1. Singleton

**Название:** Singleton (Одиночка)

**Общее назначение:**  
Шаблон Singleton гарантирует, что у класса существует только один экземпляр, и предоставляет глобальную точку доступа к этому экземпляру.

**Назначение в проекте:**  
В проекте *Mental Maps* шаблон Singleton используется для организации единого объекта подключения к базе данных PostgreSQL.  
Серверная часть приложения не должна создавать новый объект подключения при каждом запросе, поскольку это привело бы к избыточным соединениям и усложнило бы управление ресурсами. Вместо этого используется один общий экземпляр класса `Database`, через который выполняются все запросы к БД.

**Практическая польза для проекта:**
- уменьшается количество лишних подключений к БД;
- доступ к данным централизуется;
- упрощается сопровождение backend-части.

**UML-диаграмма:**  
 ![](singleton.png)

**Фрагмент программного кода:**  

```js
 const { Pool } = require("pg");

class Database {
  static instance = null;

  constructor() {
    if (Database.instance) {
      return Database.instance;
    }

    this.pool = new Pool({
      host: process.env.DB_HOST || "db",
      port: parseInt(process.env.DB_PORT || "5432", 10),
      user: process.env.DB_USER || "mental",
      password: process.env.DB_PASSWORD || "mental",
      database: process.env.DB_NAME || "mental_maps"
    });

    Database.instance = this;
  }

  static getInstance() {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async query(sql, params = []) {
    return this.pool.query(sql, params);
  }
}

module.exports = { Database };
```

**Вывод:**  
Использование Singleton в проекте *Mental Maps* позволяет реализовать единую точку доступа к базе данных и сделать архитектуру серверной части более устойчивой и предсказуемой.

---

### 2. Factory Method

**Название:** Factory Method (Фабричный метод)

**Общее назначение:**  
Шаблон Factory Method определяет интерфейс для создания объектов, но позволяет подклассам решать, какой именно объект должен быть создан.

**Назначение в проекте:**  
В проекте *Mental Maps* Factory Method используется для создания различных типов элементов карты.  
Элемент карты может быть представлен в разных формах, например:
- точка интереса (`PointElement`);
- заметка (`NoteElement`);
- маршрут (`RouteElement`).

При добавлении элемента через серверный endpoint `POST /maps/:mapId/elements` backend получает тип элемента из запроса и должен создать соответствующий объект.  
Если создавать такие объекты напрямую в роуте, код станет громоздким и плохо расширяемым. Использование фабричного метода позволяет вынести логику создания элементов в отдельные классы-фабрики.

**Практическая польза для проекта:**
- уменьшается связность кода;
- логика создания объектов выносится из маршрутов;
- упрощается добавление новых типов элементов карты.

**UML-диаграмма:**  
 ![](factory_method.png)

**Фрагмент программного кода:**  
```js
class MapElement {
  constructor(mapId, type, x, y, content = "", style = {}) {
    this.mapId = mapId;
    this.type = type;
    this.x = x;
    this.y = y;
    this.content = content;
    this.style = style;
  }
}

class PointElement extends MapElement {
  constructor(mapId, x, y, content = "", style = {}) {
    super(mapId, "point", x, y, content, style);
  }
}

class NoteElement extends MapElement {
  constructor(mapId, x, y, content = "", style = {}) {
    super(mapId, "note", x, y, content, style);
  }
}

class RouteElement extends MapElement {
  constructor(mapId, startX, startY, endX, endY, content = "", style = {}) {
    super(
      mapId,
      "route",
      startX,
      startY,
      content,
      {
        ...style,
        endX,
        endY
      }
    );
  }
}

class ElementFactory {
  createElement(_payload) {
    throw new Error("Метод createElement должен быть переопределён");
  }
}

class PointElementFactory extends ElementFactory {
  createElement(payload) {
    return new PointElement(
      payload.mapId,
      payload.x,
      payload.y,
      payload.content,
      payload.style
    );
  }
}

class NoteElementFactory extends ElementFactory {
  createElement(payload) {
    return new NoteElement(
      payload.mapId,
      payload.x,
      payload.y,
      payload.content,
      payload.style
    );
  }
}

class RouteElementFactory extends ElementFactory {
  createElement(payload) {
    return new RouteElement(
      payload.mapId,
      payload.startX,
      payload.startY,
      payload.endX,
      payload.endY,
      payload.content,
      payload.style
    );
  }
}

module.exports = {
  PointElementFactory,
  NoteElementFactory,
  RouteElementFactory
};
```

**Вывод:**  
Factory Method делает код создания элементов карты более структурированным и расширяемым, что особенно важно для дальнейшего развития проекта.

---

### 3. Builder

**Название:** Builder (Строитель)

**Общее назначение:**  
Шаблон Builder позволяет пошагово создавать сложный объект, отделяя процесс его конструирования от итогового представления.

**Назначение в проекте:**  
В проекте *Mental Maps* шаблон Builder используется для построения расширенного ответа по карте.  
Например, при обращении к endpoint `GET /maps/:mapId` сервер может возвращать не только основные данные карты, но и:
- список элементов карты;
- сведения о правах доступа текущего пользователя;
- дополнительные метаданные.

Такой объект формируется постепенно, поэтому Builder позволяет сделать код более понятным и избежать перегруженного контроллера.

**Практическая польза для проекта:**
- упрощается формирование сложного JSON-ответа;
- контроллеры становятся чище;
- структура ответа собирается по шагам и легче расширяется.

**UML-диаграмма:**  
 ![](builder.png)

**Фрагмент программного кода:**  
```js
class DetailedMapResponseBuilder {
  constructor() {
    this.response = {};
  }

  setMapData(map) {
    this.response.mapId = map.map_id;
    this.response.ownerId = map.owner_id;
    this.response.title = map.title;
    this.response.description = map.description;
    this.response.visibility = map.visibility;
    this.response.createdAt = map.created_at;
    this.response.updatedAt = map.updated_at;
    return this;
  }

  setElements(elements) {
    this.response.elements = elements.map(el => ({
      elementId: el.element_id,
      type: el.type,
      x: el.x,
      y: el.y,
      content: el.content
    }));
    return this;
  }

  setPermissions(user, map) {
    this.response.permissions = {
      canEdit: user.role === "moderator" || user.id === map.owner_id,
      canDelete: user.role === "moderator" || user.id === map.owner_id
    };
    return this;
  }

  build() {
    return this.response;
  }
}

class MapResponseDirector {
  constructor(builder) {
    this.builder = builder;
  }

  construct(map, elements, user) {
    return this.builder
      .setMapData(map)
      .setElements(elements)
      .setPermissions(user, map)
      .build();
  }
}

module.exports = { DetailedMapResponseBuilder, MapResponseDirector };
```

**Вывод:**  
Шаблон Builder позволяет аккуратно формировать составной ответ сервера и делает код backend-логики более читаемым и поддерживаемым.

---

### Общий вывод по порождающим шаблонам

В проекте *Mental Maps* были применены три порождающих шаблона GoF:

- **Singleton** — для единого доступа к базе данных;
- **Factory Method** — для создания различных типов элементов карты;
- **Builder** — для пошагового построения сложного ответа по карте.

Использование этих шаблонов улучшает структуру серверного кода, уменьшает связность между компонентами и делает проект более удобным для дальнейшего развития.
