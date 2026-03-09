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

## II. Структурные шаблоны

### 1. Adapter

**Название:** Adapter (Адаптер)

**Общее назначение:**  
Шаблон Adapter используется для преобразования одного интерфейса в другой, ожидаемый клиентом.  
Он позволяет совместить классы и структуры данных, которые изначально несовместимы по формату.

**Назначение в проекте:**  
В проекте *Mental Maps* шаблон Adapter используется для преобразования строк, возвращаемых из PostgreSQL, в объекты API-ответа.  
База данных возвращает поля в формате `snake_case` (`map_id`, `owner_id`, `created_at`), а клиентская часть и REST API используют формат `camelCase` (`mapId`, `ownerId`, `createdAt`).

Сейчас это преобразование частично выполняется прямо в маршрутах `maps.js` и `reports.js`, что перегружает код контроллеров.  
Использование адаптера позволяет вынести преобразование в отдельный слой.

**Назначение согласно реализуемому функционалу:**  
Adapter используется:
- при возврате карты (`GET /maps/:mapId`);
- при возврате списка карт (`GET /maps`);
- при возврате элементов карты (`GET /maps/:mapId/elements`);
- при возврате жалоб (`GET /reports`).

**UML-диаграмма:**  
 ![](structural_adapter.png)

**Фрагмент программного кода:**  
```js
class MapResponseAdapter {
  adapt(row) {
    return {
      mapId: row.map_id,
      ownerId: row.owner_id,
      title: row.title,
      description: row.description,
      visibility: row.visibility,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

class ElementResponseAdapter {
  adapt(row) {
    return {
      elementId: row.element_id,
      mapId: row.map_id,
      type: row.type,
      x: row.x,
      y: row.y,
      content: row.content,
      style: row.style,
      createdAt: row.created_at
    };
  }
}

class ReportResponseAdapter {
  adapt(row) {
    return {
      reportId: row.report_id,
      mapId: row.map_id,
      authorId: row.author_id,
      reason: row.reason,
      comment: row.comment,
      status: row.status,
      createdAt: row.created_at
    };
  }
}

module.exports = {
  MapResponseAdapter,
  ElementResponseAdapter,
  ReportResponseAdapter
};
```

**Вывод:**  
Adapter позволяет отделить формат хранения данных в БД от формата, используемого в API, и делает код маршрутов чище и понятнее.

---

### 2. Facade

**Название:** Facade (Фасад)

**Общее назначение:**  
Шаблон Facade предоставляет единый упрощённый интерфейс к набору подсистем.  
Он скрывает внутреннюю сложность и уменьшает количество прямых зависимостей.

**Назначение в проекте:**  
В проекте *Mental Maps* шаблон Facade используется для объединения нескольких операций, необходимых для работы с картой.  
Например, для получения полной информации о карте необходимо:
- получить саму карту из таблицы `maps`;
- получить связанные элементы из таблицы `elements`;
- преобразовать данные в API-ответ;
- при необходимости проверить права пользователя.

Если выполнять всё это прямо в роуте, код становится перегруженным.  
Фасад выносит эту логику в отдельный класс `MapsFacade`.

**Назначение согласно реализуемому функционалу:**  
Facade подходит для операций:
- `GET /maps/:mapId` — получение карты вместе с элементами;
- `POST /maps/:mapId/elements` — добавление элемента и обновление карты;
- `GET /maps` — получение списка карт пользователя.

**UML-диаграмма:**  
 ![](structural_facade.png)

**Фрагмент программного кода:**  
```js
const { query } = require("../db");
const {
  MapResponseAdapter,
  ElementResponseAdapter
} = require("../adapters/ResponseAdapters");

class MapsFacade {
  constructor() {
    this.mapAdapter = new MapResponseAdapter();
    this.elementAdapter = new ElementResponseAdapter();
  }

  async getDetailedMap(mapId) {
    const mapRes = await query(
      `SELECT map_id, owner_id, title, description, visibility, created_at, updated_at
       FROM maps WHERE map_id = $1`,
      [mapId]
    );

    if (!mapRes.rows.length) {
      return null;
    }

    const elementRes = await query(
      `SELECT element_id, map_id, type, x, y, content, style, created_at
       FROM elements WHERE map_id = $1
       ORDER BY created_at ASC`,
      [mapId]
    );

    return {
      ...this.mapAdapter.adapt(mapRes.rows[0]),
      elements: elementRes.rows.map(row => this.elementAdapter.adapt(row))
    };
  }

  async getUserMaps(ownerId, visibility) {
    let sql = `SELECT map_id, owner_id, title, description, visibility, created_at, updated_at
               FROM maps WHERE owner_id = $1`;
    const params = [ownerId];

    if (visibility === "private" || visibility === "public") {
      sql += ` AND visibility = $2`;
      params.push(visibility);
    }

    sql += ` ORDER BY updated_at DESC`;

    const res = await query(sql, params);
    return res.rows.map(row => this.mapAdapter.adapt(row));
  }
}

module.exports = { MapsFacade };.
```

**Вывод:**  
Facade упрощает работу маршрутов и скрывает сложную координацию между адаптерами, запросами к БД и логикой формирования ответа.

---

### 3. Proxy

**Название:** Proxy (Заместитель)

**Общее назначение:**  
Шаблон Proxy предоставляет объект-заместитель, который контролирует доступ к другому объекту.  
Он может использоваться для защиты, кеширования, ленивой инициализации, логирования и других дополнительных задач.

**Назначение в проекте:**  
В проекте *Mental Maps* шаблон Proxy используется для контроля доступа к картам и элементам карты.  
Перед тем как вернуть карту или разрешить изменение, необходимо проверить:
- существует ли карта;
- публичная она или приватная;
- является ли текущий пользователь владельцем;
- является ли пользователь модератором.

Сейчас такая логика частично находится прямо в `maps.js` в функциях `canRead` и `canWrite`.  
С использованием Proxy проверка доступа выносится в отдельный объект `AuthorizedMapsProxy`, который оборачивает сервис работы с картами.

**Назначение согласно реализуемому функционалу:**  
Proxy используется при:
- `GET /maps/:mapId`;
- `GET /maps/:mapId/elements`;
- `POST /maps/:mapId/elements`.

**UML-диаграмма:**  
![](structural_proxy.png)


**Фрагмент программного кода MapsService:**  
```js
const { query } = require("../db");

class MapsService {
  async getMap(mapId) {
    const res = await query(
      `SELECT map_id, owner_id, title, description, visibility, created_at, updated_at
       FROM maps WHERE map_id = $1`,
      [mapId]
    );
    return res.rows[0] || null;
  }

  async getElements(mapId) {
    const res = await query(
      `SELECT element_id, map_id, type, x, y, content, style, created_at
       FROM elements WHERE map_id = $1
       ORDER BY created_at ASC`,
      [mapId]
    );
    return res.rows;
  }
}

module.exports = { MapsService };
```

**Фрагмент программного кода AuthorizedMapsProxy:**  
```js
const { httpError } = require("../utils/errors");

class AuthorizedMapsProxy {
  constructor(service) {
    this.service = service;
  }

  canRead(user, map) {
    if (map.visibility === "public") return true;
    if (user.role === "moderator") return true;
    return map.owner_id === user.id;
  }

  async getMap(mapId, user) {
    const map = await this.service.getMap(mapId);
    if (!map) throw httpError(404, "NOT_FOUND", "Карта не найдена");

    if (!this.canRead(user, map)) {
      throw httpError(403, "FORBIDDEN", "Недостаточно прав для просмотра карты");
    }

    return map;
  }

  async getElements(mapId, user) {
    const map = await this.getMap(mapId, user);
    return this.service.getElements(map.map_id);
  }
}

module.exports = { AuthorizedMapsProxy };
```

**Вывод:**  
Proxy позволяет вынести контроль доступа из маршрутов и централизовать проверку прав пользователя.

---

### 4. Decorator

**Название:** Decorator (Декоратор)

**Общее назначение:**  
Шаблон Decorator позволяет динамически добавлять объекту новую функциональность, не изменяя его исходный класс.

**Назначение в проекте:**  
В проекте *Mental Maps* шаблон Decorator используется для добавления логирования к сервису работы с картами.  
Это позволяет фиксировать вызовы методов, время выполнения и параметры операций, не изменяя код основного сервиса.

Такой подход полезен для серверной части, поскольку:
- не изменяет основную бизнес-логику;
- позволяет подключать и отключать дополнительное поведение;
- хорошо сочетается с Proxy и сервисным слоем.

**Назначение согласно реализуемому функционалу:**  
Decorator может использоваться для логирования операций:
- получения карты;
- получения элементов карты;
- создания элементов;
- получения списка карт.

**UML-диаграмма:**  
![](structural_decorator.png)

**Фрагмент программного кода:** 
```js
class MapsServiceDecorator {
  constructor(service) {
    this.service = service;
  }

  async getMap(mapId, user) {
    return this.service.getMap(mapId, user);
  }

  async getElements(mapId, user) {
    return this.service.getElements(mapId, user);
  }
}

class LoggingMapsServiceDecorator extends MapsServiceDecorator {
  async getMap(mapId, user) {
    console.log(`[MapsService] getMap start: mapId=${mapId}, user=${user.id}`);
    const result = await super.getMap(mapId, user);
    console.log(`[MapsService] getMap end: mapId=${mapId}`);
    return result;
  }

  async getElements(mapId, user) {
    console.log(`[MapsService] getElements start: mapId=${mapId}, user=${user.id}`);
    const result = await super.getElements(mapId, user);
    console.log(`[MapsService] getElements end: mapId=${mapId}, count=${result.length}`);
    return result;
  }
}

module.exports = { MapsServiceDecorator, LoggingMapsServiceDecorator };
```

**Вывод:**  
Decorator позволяет расширять функциональность сервиса без изменения его основного кода, что соответствует принципу открытости/закрытости.

---
