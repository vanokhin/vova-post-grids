# Промпт: усиление безопасности REST endpoint Posts Grid

Нужно доработать WordPress-плагин `vova-posts-grid` в репозитории:

`/Users/vova/Projects/vova-posts-grid`

Цель: ограничить стоимость публичного REST endpoint Posts Grid и исключить вывод данных, которые не должны быть доступны анонимному посетителю.

Работай непосредственно с кодом, внеси изменения, пересобери build-артефакты и выполни доступные проверки. Сохраняй существующий стиль кода и не рефактори несвязанные части.

Основные файлы:

- `includes/class-vovapg-posts-grid.php`
- `src/blocks/posts-grid/view.js`
- `src/blocks/posts-grid/edit.js`
- `src/blocks/posts-grid/config.js`
- `src/blocks/posts-grid/block.json`
- соответствующие `build/blocks/posts-grid/*` после сборки

## Текущие проблемы

1. `/vovapg/v1/posts-grid/render` публичен и принимает произвольные `attributes`.
2. `page` не имеет верхней границы до выполнения `WP_Query`.
3. Массивы `terms`, `includePosts`, `excludePosts`, `posts` не ограничены.
4. `postsPerPage` допускает до 100 карточек.
5. REST args почти не имеют JSON schema.
6. Один endpoint одновременно обслуживает editor preview и frontend pagination.
7. Проверяется `$post_type->public`, но не фактическая публичная доступность post type.
8. Password-protected записи имеют `post_status=publish` и могут попасть в выдачу.
9. Ограничение `page` после `WP_Query` не экономит ресурсы и может возвращать номер страницы, не соответствующий уже выполненному запросу.
10. `RAND` и поиск позволяют создавать дорогие произвольные запросы через публичный endpoint.

## Что не входит в задачу

Не реализовывать:

- подписанное сервером состояние запроса;
- HMAC, nonce для публичной пагинации или state token;
- allowlist meta keys;
- запрет или изменение `meta_query`;
- изменение операторов `LIKE`, `NOT LIKE`, `EXISTS` и остальных meta compare;
- изменение UI и семантики `metaFilter`;
- миграцию существующих meta filters.

`metaFilter` нужно только описать структурно в REST schema для проверки типов и общего ограничения размера payload. Его функциональное поведение менять нельзя.

Важно: поскольку подпись состояния и защита `meta_query` исключены из scope, не утверждай в итоговом отчёте, что публичный endpoint полностью защищён от произвольных дорогих meta-запросов. Это осознанный остаточный риск и отдельная будущая задача.

## 1. Разделить preview и public endpoints

Оставить существующий публичный endpoint:

`POST /vovapg/v1/posts-grid/render`

Он продолжает принимать:

- `attributes`;
- `page`.

Это необходимо для frontend AJAX pagination, поскольку подписанное состояние сейчас не реализуется.

Добавить отдельный endpoint:

`POST /vovapg/v1/posts-grid/preview`

Требования к preview endpoint:

- использоваться только редактором блока;
- `permission_callback` должен проверять `current_user_can( 'edit_posts' )`;
- принимать `attributes`;
- разрешать только `page=1`;
- применять ту же политику публичной видимости записей, что и frontend, чтобы preview не показывал то, что затем нельзя безопасно вывести посетителю;
- возвращать тот же формат ответа: `html`, `page`, `maxNumPages`, `foundPosts`.

Изменить `src/blocks/posts-grid/edit.js`, чтобы editor preview обращался к `/vovapg/v1/posts-grid/preview`.

Не выдавать из preview endpoint какой-либо публично переиспользуемый token или подпись.

Общий код подготовки REST-ответа можно вынести в небольшой private helper, если он действительно используется обоими callbacks. Не создавать лишнюю архитектуру.

## 2. Добавить централизованные лимиты

Добавить в `VOVAPG_Posts_Grid` константы:

- `MAX_PUBLIC_PAGE = 100`;
- `MAX_POSTS_PER_PAGE = 50`;
- `MAX_TERMS = 50`;
- `MAX_SELECTED_POSTS = 100`;
- `MAX_KEYWORD_LENGTH = 100`;
- `MAX_REST_ATTRIBUTES_BYTES = 65536`;
- `MAX_POST_TOKEN_TITLE_LENGTH = 200`.

При необходимости добавить отдельные небольшие лимиты для строк presentation attributes, но не делать систему конфигурирования лимитов.

Использовать одни и те же значения:

- в REST schema;
- в PHP normalization;
- в editor controls;
- во frontend defensive checks.

Не оставлять несогласованные лимиты вроде UI max=100 и PHP max=50.

Изменить максимальное значение Posts per page в editor с 100 на 50.

Изменить frontend skeleton cap со 100 на 50.

## 3. Реализовать REST schema

`attributes` должен быть обязательным объектом. `page` должен быть integer, а не просто значением, пропущенным через `absint`.

Для public route:

- `page.type = integer`;
- `page.default = 1`;
- `page.minimum = 1`;
- `page.maximum = 100`.

Для preview route:

- `page.type = integer`;
- `page.default = 1`;
- `page.minimum = 1`;
- `page.maximum = 1`.

Создать централизованный метод наподобие `get_rest_attributes_schema()`. Не дублировать большую schema для двух endpoints.

Schema должна перечислять существующие top-level attributes из `block.json`, а также:

- `contextPostId`, используемый preview;
- legacy `readMorePaddingY`, если PHP продолжает его поддерживать.

По возможности использовать `additionalProperties => false`, но только после того, как перечислены все реально поддерживаемые и legacy attributes. Не ломать editor preview и существующие сохранённые блоки.

Для `query` описать:

- `queryType`: enum `dynamic`, `specific`;
- `postType`: string с разумным maxLength;
- `taxonomy`: string с разумным maxLength;
- `terms`: array, maxItems=50, items integer minimum=1;
- `keyword`: string, maxLength=100;
- `author`: integer minimum=0;
- `includePosts`: массив выбранных записей, maxItems=100;
- `excludePosts`: массив выбранных записей, maxItems=100;
- `posts`: массив выбранных записей, maxItems=100;
- `postsPerPage`: integer, minimum=1, maximum=50;
- `order`: enum `ASC`, `DESC`;
- `orderby`: существующий allowlist, включая `rand`;
- существующие boolean-поля;
- `dateRange` с существующими mode и датами формата `Y-m-d`;
- `metaFilter` с текущими полями и enum, не изменяя его поведение.

Элемент массива выбранных записей:

- object;
- обязательный `id`;
- `id`: integer minimum=1;
- `subtype`: string с ограничением длины;
- `title`: string maxLength=200;
- запрет неизвестных properties, если это совместимо с текущими данными.

Также ограничить:

- `elements`: максимум 5;
- `metaFields`: разумный максимум, например 20;
- `readMoreLabel`: максимум 100 символов;
- `emptyStateText`: максимум 300 символов;
- прочие строковые presentation attributes разумными maxLength;
- числовые presentation attributes теми же minimum/maximum, что применяются в `normalize_attributes()`.

Дополнительно проверять фактический размер JSON для `attributes`:

```php
strlen( wp_json_encode( $attributes ) ) <= MAX_REST_ATTRIBUTES_BYTES
```

При превышении возвращать `WP_Error` со статусом 413. Не полагаться исключительно на `Content-Length`, потому что заголовок может отсутствовать или быть недостоверным.

REST schema должна отклонять неверный или слишком большой запрос до создания `WP_Query`. Не следует молча превращать большой публичный запрос в допустимый.

## 4. Добавить defense in depth в normalization

REST validation является основной границей публичного endpoint, но normalization также должна безопасно обрабатывать атрибуты сохранённого блока.

В `normalize_query()`:

- ограничивать `postsPerPage` диапазоном 1–50;
- ограничивать keyword 100 символами после sanitization.

В `normalize_ids()`:

- ограничивать количество обрабатываемых исходных элементов;
- применять лимит до `array_map()` и последующих операций;
- для terms использовать максимум 50.

В `normalize_post_selection()`:

- применять `array_slice()` до цикла;
- обрабатывать максимум 100 элементов;
- ограничивать title 200 символами;
- сохранять существующую дедупликацию.

Не проходить циклом по тысячам входных элементов с расчётом на последующее обрезание результата.

Если helper используется с разными лимитами, передавать лимит параметром либо сделать два небольших явно названных helper. Не создавать универсальный validation framework.

## 5. Ограничить page до WP_Query

В `render_content()` hard cap страницы должен применяться до `build_query_args()` и до `new WP_Query()`:

```php
$page = self::clamp_int( $page, 1, self::MAX_PUBLIC_PAGE );
$query_args = self::build_query_args( $settings, $page );
```

На REST-границе значения выше 100 должны отклоняться с 400. Внутренний clamp нужен только как defense in depth для вызовов не через REST.

Удалить существующую логику, которая меняет `$page` после выполнения `WP_Query` на основании `max_num_pages`.

Если запрошенная допустимая страница выше фактического `max_num_pages`, не выполнять второй запрос для последней страницы. Вернуть пустой результат для запрошенной страницы и фактическое `maxNumPages`. Не маскировать исходную страницу другим номером.

Убедиться, что прямой запрос `page=101` не доходит до `WP_Query`.

## 6. Ограничить frontend page

В `src/blocks/posts-grid/view.js`:

- принимать только конечное целое число;
- отклонять page меньше 1 и больше 100;
- это только UX/defense in depth, серверная проверка остаётся обязательной.

Использовать согласованную JS-константу, не разбрасывать magic number по файлу.

## 7. Публичная доступность post type и taxonomy

Заменить проверку `$object->public` на WordPress API фактической публичной видимости:

- для post type использовать `is_post_type_viewable()`;
- для taxonomy использовать `is_taxonomy_viewable()`.

Сохранить проверку существования соответствующего объекта.

Проверить все места, где выбираются или формируются fallback post types. Fallback не должен возвращать CPT, который не является viewable для публичного посетителя.

Не разрешать через specific posts branch обойти проверку публичности post type.

## 8. Исключить password-protected записи на уровне WP_Query

В обе ветки `build_query_args()` — dynamic и specific — добавить:

```php
'has_password' => false,
```

Сохранить:

```php
'post_status' => 'publish',
```

Password-protected записи не должны:

- попадать в карточки;
- учитываться в `foundPosts`;
- влиять на `maxNumPages`;
- раскрывать title, thumbnail, taxonomy, excerpt или reading time.

## 9. Добавить per-post guard

Перед рендерингом карточки добавить defense-in-depth проверку:

- объект является `WP_Post`;
- `post_status === 'publish'`;
- пароль записи пуст;
- `is_post_publicly_viewable( $post )` возвращает true.

Добавить фильтр интеграции, например:

```php
apply_filters(
	'vovapg_can_render_public_post',
	$allowed,
	$post
)
```

Default должен быть безопасным.

Вызвать guard до рендеринга thumbnail, title, metadata, excerpt и reading time.

Не пытаться в рамках этой задачи реализовать интеграции со всеми membership-плагинами. Фильтр нужен как extension point. В итоговом отчёте отметить, что кастомные membership-ограничения должны подключаться через этот фильтр.

Основная фильтрация core-hidden записей должна выполняться в `WP_Query`. Per-post guard не должен быть единственной защитой, поскольку простое пропускание карточки не исправляет `foundPosts` и пагинацию.

## 10. Ограничить RAND и поиск на публичном AJAX endpoint

Editor preview и initial server-side render могут продолжать поддерживать:

- `orderby=rand`;
- непустой keyword.

Но публичный AJAX endpoint не должен выполнять такие произвольно переданные запросы.

Для `/posts-grid/render`:

- отклонять `orderby=rand` до `WP_Query`;
- отклонять непустой `keyword` до `WP_Query`;
- возвращать понятный `WP_Error` со статусом 400.

Для опубликованного блока, настроенного на RAND или keyword search:

- initial server-side render должен продолжать работать;
- AJAX pagination должна автоматически отключаться;
- не выводить активные pagination buttons;
- по возможности не выводить `data-vovapg-rest-url` и полный `data-vovapg-attributes`, если AJAX для блока не используется;
- editor preview должен соответствовать этому поведению.

Сделать небольшой helper наподобие `is_public_ajax_query_allowed( $settings )`.

Не заменять `rand` или keyword молча на другой запрос: это создаст несоответствие между первой и следующими страницами.

Meta filter при определении AJAX safety в рамках этой задачи не учитывать и не изменять.

## 11. Кэш и rate limiting

Не реализовывать DB-backed rate limiter через transients.

Не доверять `X-Forwarded-For` без явно настроенного trusted proxy.

Если добавляется application cache:

- использовать только WordPress Object Cache;
- короткий TTL, например 60 секунд;
- ключ строить из нормализованных attributes и page;
- кэшировать только успешные public render responses;
- не кэшировать ответы editor preview;
- не кэшировать для logged-in requests или запросов с пользовательскими cookies;
- не добавлять обязательную зависимость от persistent object cache.

Если безопасный кэш заметно усложняет изменение или может кэшировать user-specific HTML после WordPress filters, не реализовывать его в этой задаче. Вместо этого добавить короткую заметку в документацию, что production rate limiting следует настраивать на nginx/CDN/WAF.

Не добавлять большой новый security-документ, если достаточно небольшого раздела в существующем README.

## 12. Обратная совместимость

Сохранить:

- существующий публичный URL `/vovapg/v1/posts-grid/render`;
- формат успешного REST-ответа;
- обычную frontend AJAX pagination для безопасных запросов;
- initial SSR;
- editor preview;
- query type dynamic/specific;
- существующую семантику include/exclude/posts;
- существующую семантику `metaFilter`;
- существующий HTML и CSS, кроме необходимых изменений пагинации.

Осознанное изменение:

- `postsPerPage` выше 50 нормализуется до 50;
- сохранённые массивы длиннее лимита обрезаются;
- REST-запросы с превышением лимитов отклоняются;
- RAND и keyword blocks работают только через initial SSR без AJAX pagination;
- password-protected записи полностью исключаются.

## 13. Проверки

В репозитории сейчас нет полноценной PHP WordPress integration test suite. Не создавай ради этой задачи большой тестовый стенд.

Если можно добавить небольшие тесты в существующую инфраструктуру без сложного bootstrap — добавь. В противном случае выполни доступные статические проверки и опиши ручную REST-матрицу.

Обязательно выполнить:

- `php -l includes/class-vovapg-posts-grid.php`;
- `npm run lint:js`;
- `npm run test:unit`;
- `npm run build`;
- `npm run lint:php`, если зависимости установлены;
- `git diff --check`.

После `npm run build` проверить, что обновились нужные build assets и POT только в связи с новыми переводимыми сообщениями.

Не форматировать весь репозиторий.

## 14. Матрица приёмки

Проверить следующие сценарии:

1. Public render с page=1 и обычным query возвращает 200.
2. page=0, отрицательный, дробный, строковый и page=101 отклоняются до WP_Query.
3. Preview route анонимному пользователю возвращает REST permission error.
4. Preview route пользователю с `edit_posts` работает.
5. Editor использует `/preview`, frontend использует `/render`.
6. terms из 51 элемента отклоняется REST schema.
7. includePosts/excludePosts/posts из 101 элемента отклоняются.
8. Сохранённый серверный блок с массивами выше лимита не создаёт неограниченный цикл и нормализуется до лимита.
9. postsPerPage=51 отклоняется в REST, а сохранённый блок нормализуется до 50.
10. Payload attributes больше 64 KiB возвращает 413.
11. `orderby=rand` работает в editor/SSR, но public AJAX получает 400 и frontend не показывает AJAX pagination.
12. Непустой keyword работает в editor/SSR, но public AJAX получает 400 и frontend не показывает AJAX pagination.
13. Обычная date/title pagination продолжает работать.
14. Password-protected publish post не входит в HTML, foundPosts и maxNumPages.
15. Draft/private post не выводится даже при передаче его ID в `posts` или `includePosts`.
16. CPT с `public=true`, но не viewable/publicly_queryable, не принимается.
17. Публичный viewable CPT продолжает работать.
18. Невалидная или непубличная taxonomy не попадает в tax_query.
19. Meta filter сохраняет прежнее поведение без allowlist и без изменения compare.
20. Обычный server render без pagination не содержит ненужных AJAX data attributes, если это реализовано без нарушения текущей разметки.

## 15. Итоговый отчёт

В конце перечисли:

- изменённые файлы;
- введённые лимиты;
- изменения REST routes;
- какие запросы стали SSR-only;
- выполненные команды и их результат;
- оставшиеся риски.

Явно укажи два оставшихся риска:

1. Public endpoint пока принимает неподписанные attributes, поэтому целостность query state не гарантируется.
2. Произвольный `metaFilter`, включая `LIKE`/`NOT LIKE`, пока не ограничен и остаётся отдельной задачей.

Не скрывай эти ограничения и не описывай задачу как полное устранение всех вариантов resource exhaustion.
