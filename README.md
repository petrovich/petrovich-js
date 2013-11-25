#Petrovich#

Библиотека для склонения падежей русских имен, фамилий и отчеств.

## Установка ##

### Для NodeJS ###
Используйте npm:
```
npm install petrovich
```

### Для браузера ###
Используйте bower:
```
bower install petrovich
```

Или вручную. Ссылка: [petrovich.min.js](https://raw.github.com/petrovich/petrovich-js/master/dist/petrovich.min.js)

## Подключение ##

В браузере:

```html
<script type="text/javascript" src="/path/to/petrovich/dist/petrovich.min.js"></script>
```

В NodeJS:

```JavaScript
var petrovich = require('petrovich');
```

## Использование ##

Петровича можно использовать двумя способами. 

###Первый вариант:

```JavaScript
// создаем объект person, содержащий параметр gender
// и хотя бы один из параметров first, middle и last
var person = {
 gender: 'male',
 first: 'Петр',
 last: 'Чайковский'
};
// вызываем Петровича как функцию, указав падеж:
petrovich(person, 'dative');
// вернет копию объекта:
// {gender: 'male', first: 'Петру', last: 'Чайковскому'}
```

Если указано отчество, можно опустить пол, он определится **автоматически**:

```JavaScript
var person = {
 first: 'Петр',
 middle: 'Ильич',
 last: 'Чайковский'
};
petrovich(person, 'dative');
// вернет:
// {first: 'Петру', middle: 'Ильичу', last: 'Чайковскому', gender: 'male'}
```

###Второй вариант использования:
```JavaScript
// Петрович обладает цепочкой методов вида petrovich[gender][nametype][case]:
petrovich.male.first.genitive('Андрей') // вернет "Андрея"
petrovich.female.last.accusative('Иванова') // вернет "Иванову"
```

## Авто определение пола по отчеству ##
Петрович может определить пол по отчеству, используя простое правило:
- мужские имена заканчиваются на "-ич",
- женские - на "-на",
- все остальное определяется как "androgynous".

```JavaScript
petrovich.detect_gender('Иванович') // вернет 'male'
petrovich.detect_gender('Ильинична') // вернет 'female'
petrovich.detect_gender('Блаблабла') // вернет 'androgynous'
```

## Cписок параметров и их возможных значений ##

Пол может иметь одно из следующих значений:
- male - мужской,
- female - женский,
- androgynous - неопределенный.
 
Типы имени:
- first - имя,
- last - фамилия,
- middle - отчество.

Падежи:
- nominative - именительный (кто? что?)
- genitive - родительный (кого? чего?)
- dative - дательный (кому? чему?)
- accusative - винительный (кого? что?)
- instrumental - творительный (кем? чем?)
- prepositional - предложный (о ком? о чем?)
 

## Разработчику ##

Два ключевых файла проекта:
- petrovich.js - содержит собственно модуль,
- rules.json - содержит правила склонений, которые берутся из [этого репозитория](https://github.com/petrovich/petrovich-rules).

Правила включаются в модуль в процессе сборки (см. ниже).

В проекте используется следующие инструменты:
- Grunt для автоматизации сборки,
- Jasmine для тестирования.

Установка инструментов:

```
sudo npm install -g grunt-cli
sudo npm install -g jasmine-node
```

Клонирование репозитория:

```
git clone https://github.com/petrovich/petrovich-js.git
```

Установка локальных модулей:

```
npm install
```

Тесты находятся в директории ```tests/spec/```. Запуск тестов:

```
jasmine-node tests/spec/
# или просто:
npm test
```

Сборка проекта в директорию dist (включает rules.json в petrovich.js
и создает минифицированную копию последнего)

```
grunt build
```
