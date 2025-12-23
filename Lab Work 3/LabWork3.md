# Лабораторная работа №3  
**Тема:** Использование принципов проектирования на уровне методов и классов  
**Проект:** мобильное приложение «Mental Maps»

---

## 1. Цель работы

Цель лабораторной работы — показать, как выбранный вариант использования реализуется на уровне архитектуры и кода с учётом принципов **KISS, YAGNI, DRY, SOLID**, а также оценить применимость (или отказ) от дополнительных принципов разработки: **BDUF, SoC, MVP, PoC**.

---

## 2. Выбранный вариант использования

### UC-03: Создание ментальной карты с элементами и медиа (и сохранение в облаке)

**Участники:** Пользователь (основной), Backend (Firebase) как внешняя интеграция.

**Сценарий (кратко):**
1. Пользователь открывает экран создания новой карты.
2. Вводит название и описание.
3. Добавляет элементы карты (например: точка, область, заметка), настраивает параметры элемента (координаты, размер, цвет, текст).
4. Прикрепляет медиа (фото/видео) к одному или нескольким элементам.
5. Нажимает «Сохранить».
6. Приложение сохраняет карту и элементы в хранилище данных, загружает медиа в файловое хранилище и отправляет события аналитики.
7. Пользователь получает подтверждение успешного сохранения.

**Результат выполнения UC:** созданная карта хранится в облаке и доступна пользователю при следующем входе/синхронизации.

---

## 3. Диаграммы C4: контейнеров и компонентов

### 3.1. Диаграмма контейнеров (C4 Container Diagram)

**Что показывает:**  
Разбиение системы «Mental Maps» на крупные части (контейнеры) и связи между ними.

**Основные элементы:**
- **Mobile App (React Native)** — клиентское приложение на устройстве.  
  Отвечает за пользовательский интерфейс, создание/редактирование карты, работу с локальными черновиками и синхронизацию.
- **Backend (Firebase)** — облачная платформа.  
  Обеспечивает аутентификацию, хранение данных карт, хранение медиа и сбор аналитики.

**Связь контейнеров:**  
Клиентское приложение обращается к Firebase для:
- аутентификации пользователя;
- чтения/записи данных карт и элементов;
- загрузки/получения медиа;
- отправки событий аналитики.

![Диаграмма контейнеров](d1.PNG)
---

### 3.2. Диаграмма компонентов (C4 Component Diagram)

> В рамках ЛР3 достаточно представить диаграмму компонентов для одного контейнера (базово) и ещё одну диаграмму компонентов для другого контейнера (повышенная сложность).

#### A) Диаграмма компонентов контейнера **Mobile App (React Native)**

**Что показывает:**  
Какие внутренние компоненты приложения участвуют в реализации UC-03 и как они взаимодействуют.

**Пример состава компонентов:**
- **AppShell & Navigation** — старт приложения, навигация по экранам, глобальные состояния.
- **Auth Screen** — вход/регистрация (нужно для доступа к данным пользователя).
- **Map Editor Screen** — основной экран UC-03: создание/редактирование карты и элементов.
- **Draft Store (Local Storage)** — хранение черновиков карты и элементов локально (офлайн/кэш).
- **Media Upload Client** — загрузка медиа и получение ссылки/идентификатора.
- **Map API Client** — сохранение карты и элементов в облако.
- **Analytics Client** — отправка событий (например, «карта сохранена»).

**Ключевая идея:**  
UI-компоненты не делают напрямую сложные операции сохранения — они делегируют работу специализированным модулям (хранилище/сетевой клиент/загрузка медиа). Это облегчает поддержку и делает код ближе к принципам SoC и SOLID.

![Диаграмма компонентов](d2.png)

#### B) Диаграмма компонентов контейнера **Backend (Firebase)** (повышенная сложность)

**Что показывает:**  
Какие логические компоненты backend отвечают за разные аспекты UC-03.

**Пример состава компонентов:**
- **Authentication Component** — проверка токена, роль пользователя, доступ.
- **Maps/Data Component (Firestore)** — хранение карт, элементов, маршрутов и связанных данных.
- **Media Storage Component (Storage)** — хранение файлов и метаданных медиа.
- **Analytics Component** — сбор событий аналитики.

**Ключевая идея:**  
Backend разделён по зонам ответственности: отдельно авторизация, отдельно данные, отдельно медиа и отдельно аналитика.

![Диаграмма компонентов контейнера Backend](d3.PNG)

---

## 4. Диаграмма последовательностей (UC-03)

**Что показывает:**  
Пошаговое взаимодействие компонентов (из C4-диаграмм) в рамках сценария UC-03.

**Смысл диаграммы для UC-03:**
- Пользователь работает в **Map Editor Screen**.
- Черновики (элементы/описания) сохраняются локально через **Draft Store**.
- Медиа загружается через **Media Upload Client**, который взаимодействует с backend-хранилищем.
- Сохранение карты инициируется через **Map API Client**, который проверяет авторизацию и записывает данные карты в хранилище.
- После успешного сохранения отправляется событие через **Analytics Client / Analytics Component**.

![Диаграмма последовательностей](d4.png)

---

## 5. Модель БД (UML диаграмма классов)

**Что показывает:**  
Структуру данных приложения на уровне сущностей и связей между ними.

**Сущности (минимум 5):**
- **User** — пользователь системы (включая роль: пользователь/модератор).
- **Map** — ментальная карта (название, описание, владелец, публичность).
- **Element** — элемент карты (координаты, тип, контент, стиль).
- **Media** — медиафайл (URL/путь, тип, привязка к карте и/или элементу).
- **Route** — маршрут (начальная/конечная точки, описание).
- **Report** — жалоба на публичную карту (для сценариев модерации).

**Логика связей:**
- У одного пользователя может быть много карт.
- Карта содержит элементы и маршруты.
- Медиа может быть привязано к карте целиком или к конкретному элементу.
- На карту могут поступать жалобы от пользователей, которые обрабатываются модератором.

![Модель БД](d5.png)

---

## 6. Принципы KISS, YAGNI, DRY, SOLID — как учтены в реализации (пояснение без кода)

### 1. Клиентский код (React Native / TypeScript)

#### 1.1. Общий HTTP-клиент (DRY, KISS, DIP)

```ts
// httpClient.ts
export interface HttpClient {
  get<T>(url: string): Promise<T>;
  post<T>(url: string, body: unknown): Promise<T>;
}

export class FetchHttpClient implements HttpClient {
  constructor(private readonly baseUrl: string) {}

  async get<T>(url: string): Promise<T> {
    const response = await fetch(this.baseUrl + url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json() as Promise<T>;
  }

  async post<T>(url: string, body: unknown): Promise<T> {
    const response = await fetch(this.baseUrl + url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json() as Promise<T>;
  }
}
```

* **KISS:** минимум логики – только базовые операции `get`/`post`, ничего лишнего.
* **DRY:** единая реализация обработки ошибок и JSON, вместо дублирования кода в каждом экране.
* **SOLID – DIP:** остальной код зависит от абстракции `HttpClient`, а не от `fetch`.

#### 1.2. API Handler для карт (SRP, YAGNI)

```ts
// mapApi.ts
export interface MapPayload {
  title: string;
  description: string;
  elements: Array<{
    content: string;
    type: "point" | "area" | "note";
    x: number;
    y: number;
    color: string;
    size: number;
    mediaUrl?: string;
  }>;
}

export interface CreatedMapResponse {
  id: string;
}

export class MapApi {
  constructor(private readonly http: HttpClient) {}

  createMap(payload: MapPayload): Promise<CreatedMapResponse> {
    return this.http.post<CreatedMapResponse>("/maps", payload);
  }
}
```

* **SRP (SOLID):** `MapApi` отвечает только за взаимодействие с backend по поводу карт.
* **YAGNI:** реализован только `createMap`, без сложных фильтров/поиска, которые пока не нужны.
* **KISS:** структура данных проста, нет лишних вложенностей.

#### 1.3. Использование в редакторе карты (SoC, DRY)

```ts
// useSaveMap.ts – React hook
import { useState } from "react";

export function useSaveMap(mapApi: MapApi) {
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveMap(payload: MapPayload) {
    setSaving(true);
    setError(null);
    try {
      await mapApi.createMap(payload);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return { saveMap, isSaving, error };
}
```

* **DRY:** логика сохранения/ошибок вынесена в hook, может переиспользоваться несколькими экранами.
* **Separation of Concerns (SoC):** UI-компоненты отвечают за отображение, hook – за бизнес-логику сохранения.

---

### 2. Серверный код (Node.js / TypeScript, условно – Cloud Functions)

#### 2.1. Модели домена (KISS)

```ts
// domain/map.ts
export interface Map {
  id: string;
  userId: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MapElement {
  id: string;
  mapId: string;
  content: string;
  type: "point" | "area" | "note";
  x: number;
  y: number;
  color: string;
  size: number;
  createdAt: Date;
  mediaUrl?: string;
}
```

* **KISS:** простые интерфейсы без лишних методов и наследования – только данные.

#### 2.2. Репозитории (SRP, DIP, DRY)

```ts
// repositories/mapRepository.ts
export interface MapRepository {
  createMap(
    map: Omit<Map, "id" | "createdAt" | "updatedAt">,
    elements: Omit<MapElement, "id" | "createdAt">[]
  ): Promise<string>;
}
```

```ts
// repositories/firestoreMapRepository.ts
import { firestore } from "./firebase";

export class FirestoreMapRepository implements MapRepository {
  async createMap(map, elements): Promise<string> {
    const batch = firestore.batch();
    const mapRef = firestore.collection("maps").doc();

    batch.set(mapRef, {
      userId: map.userId,
      title: map.title,
      description: map.description,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    elements.forEach(el => {
      const elRef = mapRef.collection("elements").doc();
      batch.set(elRef, {
        ...el,
        createdAt: new Date(),
      });
    });

    await batch.commit();
    return mapRef.id;
  }
}
```

* **SRP:** класс отвечает только за запись данных в Firestore.
* **DRY:** единая точка доступа к коллекциям `maps` и `elements`.
* **DIP:** остальной код зависит от интерфейса `MapRepository`, а не от конкретной реализации Firestore.

#### 2.3. Сервис приложения (SOLID – SRP, OCP)

```ts
// services/mapService.ts
export class MapService {
  constructor(private readonly repo: MapRepository) {}

  async createMapForUser(
    userId: string,
    payload: MapPayload
  ): Promise<string> {
    // простая валидация (KISS)
    if (!payload.title.trim()) {
      throw new Error("Map title is required");
    }

    const map = {
      userId,
      title: payload.title,
      description: payload.description ?? "",
    };

    const elements = payload.elements.map(e => ({
      mapId: "", // заполнится репозиторием
      content: e.content,
      type: e.type,
      x: e.x,
      y: e.y,
      color: e.color,
      size: e.size,
      mediaUrl: e.mediaUrl,
    }));

    return this.repo.createMap(map, elements);
  }
}
```

* **SRP:** сервис занимается бизнес-логикой (валидация, подготовка данных), не зная деталей БД.
* **OCP:** при добавлении, например, логирования или авто-маршрутов можно расширять сервис, не меняя интерфейс `MapRepository`.
* **KISS:** логика создания карты понятна и не перегружена.

#### 2.4. HTTP-обработчик (KISS, SoC)

```ts
// handlers/createMapHandler.ts
import { Request, Response } from "express";

export function createMapHandler(mapService: MapService) {
  return async (req: Request, res: Response) => {
    try {
      const userId = req.user.id; // предположим, что auth-мидлварь уже отработала
      const id = await mapService.createMapForUser(userId, req.body);
      res.status(201).json({ id });
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  };
}
```

* **KISS:** обработчик делает только две вещи – извлекает `userId` и вызывает сервис.
* **SoC:** HTTP-слой отделён от бизнес-логики (вся логика в `MapService`).

---

### Как именно учтены принципы

* **KISS (Keep It Simple, Stupid):**

  * Простые интерфейсы доменных сущностей (`Map`, `MapElement`).
  * Небольшие классы/функции с чёткой задачей (`MapApi.createMap`, `MapService.createMapForUser`, `createMapHandler`).

* **YAGNI (You Aren’t Gonna Need It):**

  * В `MapApi` реализован только метод `createMap` – без сложных фильтров, версий карт и т.п., пока нет таких требований.
  * В `MapService` нет сложных сценариев версионирования/ветвления карты – добавим только, если это появится в постановке.

* **DRY (Don’t Repeat Yourself):**

  * Общий `HttpClient` инкапсулирует работу с `fetch`, вместо повторения кода по всем экранам.
  * `MapRepository` и его реализация в одном месте описывают, как писать данные в Firestore.

* **SOLID:**

  * **SRP:** `MapApi` только вызывает backend, `MapService` только реализует бизнес-логику, `FirestoreMapRepository` только пишет в БД.
  * **OCP:** можно добавить новые типы элементов или валидацию, расширяя код сервисов, не меняя интерфейсы.
  * **LSP/ISP:** интерфейсы небольшие (`HttpClient`, `MapRepository`), реализациям легко следовать.
  * **DIP:** зависимости идут через абстракции (`MapRepository`, `HttpClient`), а не через конкретные классы.
```
```


## 7. Повышенная сложность: принципы разработки (обоснование применимости/отказа)

### 7.1. BDUF — Big Design Up Front («масштабное проектирование прежде всего»)

**Суть:**  
перед разработкой детально проектировать систему целиком (архитектура, данные, интерфейсы, сценарии).

**Применимость к проекту Mental Maps:** **частично применимо**.

**Почему частично:**
- Полезно заранее продумать архитектуру (C4) и модель данных, чтобы не «перепридумывать» базу на ходу.
- Но проект развивается итеративно: требования могут уточняться (например, новые варианты обмена картами, режимы приватности). Если проектировать всё “до конца” заранее — можно потратить время на неактуальные решения.

**Вывод:**  
используется «умеренный BDUF»: проектируются ключевые части (контейнеры, компоненты, данные), но детали развиваются итеративно.

---

### 7.2. SoC — Separation of Concerns (принцип разделения ответственности)

**Суть:**  
каждый модуль системы отвечает за свою область задач и не смешивает разные ответственности.

**Применимость:** **полностью применимо**.

**Как проявляется в проекте:**
- UI отделён от сетевого слоя и от локального хранения.
- Загрузка медиа выделена в отдельный компонент.
- На backend ответственность разделена: auth / данные / медиа / аналитика.

**Вывод:**  
SoC делает систему устойчивой к изменениям и облегчает поддержку.

---

### 7.3. MVP — Minimum Viable Product (минимально жизнеспособный продукт)

**Суть:**  
сначала сделать минимальный полезный функционал, чтобы проверить ценность продукта и собрать обратную связь.

**Применимость:** **полностью применимо**.

**Как проявляется в проекте:**
- MVP для Mental Maps: создание карты, добавление элементов, прикрепление медиа, сохранение и просмотр.
- Сложные функции (рекомендации, расширенная модерация, экспорт во множество форматов) не обязательны для первой версии.

**Вывод:**  
подход MVP ускоряет разработку и помогает раньше проверить, нужна ли пользователям основная идея приложения.

---

### 7.4. PoC — Proof of Concept (доказательство концепции)

**Суть:**  
быстро проверить, что критичная техническая идея реально работает.

**Применимость:** **применимо точечно**.

**Что стоит проверять PoC в Mental Maps:**
- производительность редактирования карты на мобильном (рисование/перетаскивание элементов);
- корректная загрузка медиа и устойчивость при плохом интернете;
- синхронизация черновиков и работа офлайн.

**Вывод:**  
PoC оправдан для технически рискованных частей, чтобы заранее убедиться, что выбранные технологии подходят.

