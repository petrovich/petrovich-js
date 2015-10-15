"use strict";

(function () {

    // Predefined values
    var predef = {
        genders: ['male', 'female', 'androgynous'],
        nametypes: ['first', 'middle', 'last'],
        cases: ['nominative', 'genitive', 'dative', 'accusative', 'instrumental', 'prepositional']
    };

    // Auxiliary function: no Array.indexOf owing to IE8
    function contains(arr, x) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] === x) return true;
        }
        return false;
    }

    // First use means:
    // var person = { gender: 'female', first: 'Маша' };
    // petrovich(person, 'dative');
    var petrovich = function (person, gcase) {
        var result = {};
        // gender detection
        if (person.gender != null) {
            if (!contains(predef.genders, person.gender))
                throw new Error('Invalid gender: ' + person.gender);
            result.gender = person.gender;
        } else if (person.middle != null) {
            result.gender = petrovich.detect_gender(person.middle);
        } else {
            throw new Error('Unknown gender');
        }
        if (!contains(predef.cases, gcase))
            throw new Error('Invalid case: ' + gcase);
        // look over possible names of properties, inflect them and add to result object
        for (var i = 0; i < predef.nametypes.length; i++) {
            var nametype = predef.nametypes[i];
            if (person[nametype] != null) {
                result[nametype] =
                    inflect(result.gender, person[nametype], gcase, nametype + 'name');
            }
        }
        return result;
    };

    petrovich.detect_gender = function (middle) {
        var ending = middle.toLowerCase().substr(middle.length - 2);
        if (ending === 'ич') return 'male';
        else if (ending === 'на') return 'female';
        else return 'androgynous';
    };

    // Second use means:
    // Build dynamically methods chain like petrovich.male.first.dative(name)
    // Isolate scope to reduce polluting scope with temp variables
    (function () {
        for (var i = 0; i < predef.genders.length; i++) {
            var gender = predef.genders[i];

            if (!petrovich[gender]) petrovich[gender] = {};

            for (var j = 0; j < predef.nametypes.length; j++) {
                var nametype = predef.nametypes[j];
                if (!petrovich[gender][nametype])
                    petrovich[gender][nametype] = {};

                for (var k = 0; k < predef.cases.length; k++) {
                    var gcase = predef.cases[k];
                    // The flower on the mountain peak:
                    petrovich[gender][nametype][gcase] =
                        (function (gender, nametype, gcase) {
                            return function (name) {
                                return inflect(gender, name, gcase, nametype + 'name');
                            };
                        })(gender, nametype, gcase);
                }
            }
        }
    })();


    // Export for NodeJS or browser
    if (typeof module !== "undefined" && module.exports) module.exports = petrovich;
    else if (window) window.petrovich = petrovich;
    else throw new Error("Unknown environment");


    // Key private method, used by all public methods
    function inflect(gender, name, gcase, nametype) {
        var nametype_rulesets = rules[nametype],
            parts = name.split('-'),
            result = [];
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i], first_word = i === 0 && parts.size > 1,
                rule = find_rule_global(gender, part,
                    nametype_rulesets, {first_word: first_word});
            if (rule) result.push(apply_rule(part, gcase, rule));
            else result.push(part);
        }
        return result.join('-');
    }


    // Find groups of rules in exceptions or suffixes of given nametype
    function find_rule_global(gender, name, nametype_rulesets, features) {
        if (!features) features = {};
        var tags = [];
        for (var key in features) {
            if (features.hasOwnProperty(key)) tags.push(key);
        }
        if (nametype_rulesets.exceptions) {
            var rule = find_rule_local(
                gender, name, nametype_rulesets.exceptions, true, tags);
            if (rule) return rule;
        }
        return find_rule_local(
            gender, name, nametype_rulesets.suffixes, false, tags);
    };


    // Local search in rulesets of exceptions or suffixes
    function find_rule_local(gender, name, ruleset, match_whole_word, tags) {
        for (var i = 0; i < ruleset.length; i++) {
            var rule = ruleset[i];
            if (rule.tags) {
                var common_tags = [];
                for (var j = 0; j < rule.tags.length; j++) {
                    var tag = rule.tags[j];
                    if (!contains(tags, tag)) common_tags.push(tag);
                }
                if (!common_tags.length) continue;
            }
            if (rule.gender !== 'androgynous' && gender !== rule.gender)
                continue;

            name = name.toLowerCase();
            for (var j = 0; j < rule.test.length; j++) {
                var sample = rule.test[j];
                var test = match_whole_word ? name :
                    name.substr(name.length - sample.length);
                if (test === sample) return rule;
            }
        }
        return false;
    }


    // Apply found rule to given name
    // Move error throwing from this function to API method
    function apply_rule(name, gcase, rule) {
        var mod;
        if (gcase === 'nominative') mod = '.';
        else {
            for (var i = 0; i < predef.cases.length; i++) {
                if (gcase === predef.cases[i]) {
                    mod = rule.mods[i - 1];
                    break;
                }

            }
        }

        for (var i = 0; i < mod.length; i++) {
            var chr = mod[i];
            switch (chr) {
                case '.':
                    break;
                case '-':
                    name = name.substr(0, name.length - 1);
                    break;
                default:
                    name += chr;
            }
        }
        return name;
    }


    var rules = 
{
  "lastname": {
    "exceptions": [
      {
        "gender": "androgynous",
        "test": [
          "бонч",
          "абдул",
          "белиц",
          "гасан",
          "дюссар",
          "дюмон",
          "книппер",
          "корвин",
          "ван",
          "шолом",
          "тер",
          "призван",
          "мелик",
          "вар",
          "фон"
        ],
        "mods": [
          ".",
          ".",
          ".",
          ".",
          "."
        ],
        "tags": [
          "first_word"
        ]
      },
      {
        "gender": "androgynous",
        "test": [
          "дюма",
          "тома",
          "дега",
          "люка",
          "ферма",
          "гамарра",
          "петипа",
          "шандра",
          "скаля",
          "каруана"
        ],
        "mods": [
          ".",
          ".",
          ".",
          ".",
          "."
        ]
      },
      {
        "gender": "androgynous",
        "test": [
          "гусь",
          "ремень",
          "камень",
          "онук",
          "богода",
          "нечипас",
          "долгопалец",
          "маненок",
          "рева",
          "кива"
        ],
        "mods": [
          ".",
          ".",
          ".",
          ".",
          "."
        ]
      },
      {
        "gender": "androgynous",
        "test": [
          "вий",
          "сой",
          "цой",
          "хой"
        ],
        "mods": [
          "-я",
          "-ю",
          "-я",
          "-ем",
          "-е"
        ]
      },
      {
        "gender": "androgynous",
        "test": [
          "я"
        ],
        "mods": [
          ".",
          ".",
          ".",
          ".",
          "."
        ]
      }
    ],
    "suffixes": [
      {
        "gender": "female",
        "test": [
          "б",
          "в",
          "г",
          "д",
          "ж",
          "з",
          "й",
          "к",
          "л",
          "м",
          "н",
          "п",
          "р",
          "с",
          "т",
          "ф",
          "х",
          "ц",
          "ч",
          "ш",
          "щ",
          "ъ",
          "ь"
        ],
        "mods": [
          ".",
          ".",
          ".",
          ".",
          "."
        ]
      },
      {
        "gender": "androgynous",
        "test": [
          "гава",
          "орота"
        ],
        "mods": [
          ".",
          ".",
          ".",
          ".",
          "."
        ]
      },
      {
        "gender": "female",
        "test": [
          "ска",
          "цка"
        ],
        "mods": [
          "-ой",
          "-ой",
          "-ую",
          "-ой",
          "-ой"
        ]
      },
      {
        "gender": "female",
        "test": [
          "цкая",
          "ская",
          "ная",
          "ая"
        ],
        "mods": [
          "--ой",
          "--ой",
          "--ую",
          "--ой",
          "--ой"
        ]
      },
      {
        "gender": "female",
        "test": [
          "яя"
        ],
        "mods": [
          "--ей",
          "--ей",
          "--юю",
          "--ей",
          "--ей"
        ]
      },
      {
        "gender": "female",
        "test": [
          "на"
        ],
        "mods": [
          "-ой",
          "-ой",
          "-у",
          "-ой",
          "-ой"
        ]
      },
      {
        "gender": "male",
        "test": [
          "иной"
        ],
        "mods": [
          "-я",
          "-ю",
          "-я",
          "-ем",
          "-е"
        ]
      },
      {
        "gender": "male",
        "test": [
          "уй"
        ],
        "mods": [
          "-я",
          "-ю",
          "-я",
          "-ем",
          "-е"
        ]
      },
      {
        "gender": "androgynous",
        "test": [
          "ца"
        ],
        "mods": [
          "-ы",
          "-е",
          "-у",
          "-ей",
          "-е"
        ]
      },
      {
        "gender": "male",
        "test": [
          "рих"
        ],
        "mods": [
          "а",
          "у",
          "а",
          "ом",
          "е"
        ]
      },
      {
        "gender": "androgynous",
        "test": [
          "ия"
        ],
        "mods": [
          ".",
          ".",
          ".",
          ".",
          "."
        ]
      },
      {
        "gender": "androgynous",
        "test": [
          "иа",
          "аа",
          "оа",
          "уа",
          "ыа",
          "еа",
          "юа",
          "эа"
        ],
        "mods": [
          ".",
          ".",
          ".",
          ".",
          "."
        ]
      },
      {
        "gender": "male",
        "test": [
          "их",
          "ых"
        ],
        "mods": [
          ".",
          ".",
          ".",
          ".",
          "."
        ]
      },
      {
        "gender": "androgynous",
        "test": [
          "о",
          "е",
          "э",
          "и",
          "ы",
          "у",
          "ю"
        ],
        "mods": [
          ".",
          ".",
          ".",
          ".",
          "."
        ]
      },
      {
        "gender": "female",
        "test": [
          "ова",
          "ева"
        ],
        "mods": [
          "-ой",
          "-ой",
          "-у",
          "-ой",
          "-ой"
        ]
      },
      {
        "gender": "androgynous",
        "test": [
          "га",
          "ка",
          "ха",
          "ча",
          "ща",
          "жа",
          "ша"
        ],
        "mods": [
          "-и",
          "-е",
          "-у",
          "-ой",
          "-е"
        ]
      },
      {
        "gender": "androgynous",
        "test": [
          "а"
        ],
        "mods": [
          "-ы",
          "-е",
          "-у",
          "-ой",
          "-е"
        ]
      },
      {
        "gender": "male",
        "test": [
          "ь"
        ],
        "mods": [
          "-я",
          "-ю",
          "-я",
          "-ем",
          "-е"
        ]
      },
      {
        "gender": "androgynous",
        "test": [
          "ия"
        ],
        "mods": [
          "-и",
          "-и",
          "-ю",
          "-ей",
          "-и"
        ]
      },
      {
        "gender": "androgynous",
        "test": [
          "я"
        ],
        "mods": [
          "-и",
          "-е",
          "-ю",
          "-ей",
          "-е"
        ]
      },
      {
        "gender": "male",
        "test": [
          "ей"
        ],
        "mods": [
          "-я",
          "-ю",
          "-я",
          "-ем",
          "-е"
        ]
      },
      {
        "gender": "male",
        "test": [
          "ян",
          "ан",
          "йн"
        ],
        "mods": [
          "а",
          "у",
          "а",
          "ом",
          "е"
        ]
      },
      {
        "gender": "male",
        "test": [
          "ынец",
          "обец"
        ],
        "mods": [
          "--ца",
          "--цу",
          "--ца",
          "--цем",
          "--це"
        ]
      },
      {
        "gender": "male",
        "test": [
          "онец",
          "овец"
        ],
        "mods": [
          "--ца",
          "--цу",
          "--ца",
          "--цом",
          "--це"
        ]
      },
      {
        "gender": "male",
        "test": [
          "ай"
        ],
        "mods": [
          "-я",
          "-ю",
          "-я",
          "-ем",
          "-е"
        ]
      },
      {
        "gender": "male",
        "test": [
          "кой"
        ],
        "mods": [
          "-го",
          "-му",
          "-го",
          "--им",
          "-м"
        ]
      },
      {
        "gender": "male",
        "test": [
          "гой"
        ],
        "mods": [
          "-го",
          "-му",
          "-го",
          "--им",
          "-м"
        ]
      },
      {
        "gender": "male",
        "test": [
          "ой"
        ],
        "mods": [
          "-го",
          "-му",
          "-го",
          "--ым",
          "-м"
        ]
      },
      {
        "gender": "male",
        "test": [
          "ах",
          "ив"
        ],
        "mods": [
          "а",
          "у",
          "а",
          "ом",
          "е"
        ]
      },
      {
        "gender": "male",
        "test": [
          "ший",
          "щий",
          "жий",
          "ний"
        ],
        "mods": [
          "--его",
          "--ему",
          "--его",
          "-м",
          "--ем"
        ]
      },
      {
        "gender": "male",
        "test": [
          "ый"
        ],
        "mods": [
          "--ого",
          "--ому",
          "--ого",
          "-м",
          "--ом"
        ]
      },
      {
        "gender": "male",
        "test": [
          "кий"
        ],
        "mods": [
          "--ого",
          "--ому",
          "--ого",
          "-м",
          "--ом"
        ]
      },
      {
        "gender": "male",
        "test": [
          "ий"
        ],
        "mods": [
          "-я",
          "-ю",
          "-я",
          "-ем",
          "-и"
        ]
      },
      {
        "gender": "male",
        "test": [
          "ок"
        ],
        "mods": [
          "--ка",
          "--ку",
          "--ка",
          "--ком",
          "--ке"
        ]
      },
      {
        "gender": "male",
        "test": [
          "ец"
        ],
        "mods": [
          "--ца",
          "--цу",
          "--ца",
          "--цом",
          "--це"
        ]
      },
      {
        "gender": "male",
        "test": [
          "ц",
          "ч",
          "ш",
          "щ"
        ],
        "mods": [
          "а",
          "у",
          "а",
          "ем",
          "е"
        ]
      },
      {
        "gender": "male",
        "test": [
          "ен",
          "нн",
          "он",
          "ун"
        ],
        "mods": [
          "а",
          "у",
          "а",
          "ом",
          "е"
        ]
      },
      {
        "gender": "male",
        "test": [
          "в",
          "н"
        ],
        "mods": [
          "а",
          "у",
          "а",
          "ым",
          "е"
        ]
      },
      {
        "gender": "male",
        "test": [
          "б",
          "г",
          "д",
          "ж",
          "з",
          "к",
          "л",
          "м",
          "п",
          "р",
          "с",
          "т",
          "ф",
          "х"
        ],
        "mods": [
          "а",
          "у",
          "а",
          "ом",
          "е"
        ]
      }
    ]
  },
  "firstname": {
    "exceptions": [
      {
        "gender": "male",
        "test": [
          "лев"
        ],
        "mods": [
          "--ьва",
          "--ьву",
          "--ьва",
          "--ьвом",
          "--ьве"
        ]
      },
      {
        "gender": "male",
        "test": [
          "пётр"
        ],
        "mods": [
          "---етра",
          "---етру",
          "---етра",
          "---етром",
          "---етре"
        ]
      },
      {
        "gender": "male",
        "test": [
          "павел"
        ],
        "mods": [
          "--ла",
          "--лу",
          "--ла",
          "--лом",
          "--ле"
        ]
      },
      {
        "gender": "male",
        "test": [
          "яша"
        ],
        "mods": [
          "-и",
          "-е",
          "-у",
          "-ей",
          "-е"
        ]
      },
      {
        "gender": "male",
        "test": [
          "шота"
        ],
        "mods": [
          ".",
          ".",
          ".",
          ".",
          "."
        ]
      },
      {
        "gender": "female",
        "test": [
          "рашель",
          "нинель",
          "николь",
          "габриэль",
          "даниэль"
        ],
        "mods": [
          ".",
          ".",
          ".",
          ".",
          "."
        ]
      }
    ],
    "suffixes": [
      {
        "gender": "androgynous",
        "test": [
          "е",
          "ё",
          "и",
          "о",
          "у",
          "ы",
          "э",
          "ю"
        ],
        "mods": [
          ".",
          ".",
          ".",
          ".",
          "."
        ]
      },
      {
        "gender": "female",
        "test": [
          "б",
          "в",
          "г",
          "д",
          "ж",
          "з",
          "й",
          "к",
          "л",
          "м",
          "н",
          "п",
          "р",
          "с",
          "т",
          "ф",
          "х",
          "ц",
          "ч",
          "ш",
          "щ",
          "ъ"
        ],
        "mods": [
          ".",
          ".",
          ".",
          ".",
          "."
        ]
      },
      {
        "gender": "female",
        "test": [
          "ь"
        ],
        "mods": [
          "-и",
          "-и",
          ".",
          "ю",
          "-и"
        ]
      },
      {
        "gender": "male",
        "test": [
          "ь"
        ],
        "mods": [
          "-я",
          "-ю",
          "-я",
          "-ем",
          "-е"
        ]
      },
      {
        "gender": "androgynous",
        "test": [
          "га",
          "ка",
          "ха",
          "ча",
          "ща",
          "жа"
        ],
        "mods": [
          "-и",
          "-е",
          "-у",
          "-ой",
          "-е"
        ]
      },
      {
        "gender": "female",
        "test": [
          "ша"
        ],
        "mods": [
          "-и",
          "-е",
          "-у",
          "-ей",
          "-е"
        ]
      },
      {
        "gender": "androgynous",
        "test": [
          "а"
        ],
        "mods": [
          "-ы",
          "-е",
          "-у",
          "-ой",
          "-е"
        ]
      },
      {
        "gender": "female",
        "test": [
          "ия"
        ],
        "mods": [
          "-и",
          "-и",
          "-ю",
          "-ей",
          "-и"
        ]
      },
      {
        "gender": "female",
        "test": [
          "а"
        ],
        "mods": [
          "-ы",
          "-е",
          "-у",
          "-ой",
          "-е"
        ]
      },
      {
        "gender": "female",
        "test": [
          "я"
        ],
        "mods": [
          "-и",
          "-е",
          "-ю",
          "-ей",
          "-е"
        ]
      },
      {
        "gender": "male",
        "test": [
          "ия"
        ],
        "mods": [
          "-и",
          "-и",
          "-ю",
          "-ей",
          "-и"
        ]
      },
      {
        "gender": "male",
        "test": [
          "я"
        ],
        "mods": [
          "-и",
          "-е",
          "-ю",
          "-ей",
          "-е"
        ]
      },
      {
        "gender": "male",
        "test": [
          "ей"
        ],
        "mods": [
          "-я",
          "-ю",
          "-я",
          "-ем",
          "-е"
        ]
      },
      {
        "gender": "male",
        "test": [
          "ий"
        ],
        "mods": [
          "-я",
          "-ю",
          "-я",
          "-ем",
          "-и"
        ]
      },
      {
        "gender": "male",
        "test": [
          "й"
        ],
        "mods": [
          "-я",
          "-ю",
          "-я",
          "-ем",
          "-е"
        ]
      },
      {
        "gender": "male",
        "test": [
          "б",
          "в",
          "г",
          "д",
          "ж",
          "з",
          "к",
          "л",
          "м",
          "н",
          "п",
          "р",
          "с",
          "т",
          "ф",
          "х",
          "ц",
          "ч"
        ],
        "mods": [
          "а",
          "у",
          "а",
          "ом",
          "е"
        ]
      },
      {
        "gender": "androgynous",
        "test": [
          "ния",
          "рия",
          "вия"
        ],
        "mods": [
          "-и",
          "-и",
          "-ю",
          "-ем",
          "-ем"
        ]
      }
    ]
  },
  "middlename": {
    "suffixes": [
      {
        "gender": "male",
        "test": [
          "ич"
        ],
        "mods": [
          "а",
          "у",
          "а",
          "ем",
          "е"
        ]
      },
      {
        "gender": "female",
        "test": [
          "на"
        ],
        "mods": [
          "-ы",
          "-е",
          "-у",
          "-ой",
          "-е"
        ]
      }
    ]
  }
};

})();