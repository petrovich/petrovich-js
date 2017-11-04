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
        } else {
            result.gender = petrovich.detect_gender(person);
            if(!result.gender || result.gender == 'androgynous')
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

    petrovich.detect_gender = function (fio) {
        if (typeof(fio) === 'string') {
            fio = {
                first: undefined,
                last: undefined,
                middle: fio
            };
        }

        var middle_result = find_gender_global(fio.middle, gender_rules.middlename);
        if (middle_result != 'androgynous')
            return middle_result;

        var other_parts = ['last', 'first'].map(function (item) {
            return find_gender_global(fio[item], gender_rules[item + 'name'])
        }).filter(function (item) {
            return item != 'androgynous'
        });

        if (other_parts.length == 0 || (other_parts.length == 2 && other_parts[0] != other_parts[1]))
            return 'androgynous'
        return other_parts[0];
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
    }

    //Matches word for rule sample
    function match_sample(match_whole_word, name, sample) {
        var test = match_whole_word ? name :
            name.substr(name.length - sample.length);
        return test === sample;
    }

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
                if (match_sample(match_whole_word, name, rule.test[j]))  return rule;
            }
        }
        return false;
    }

    //finds gender for name part
    function find_gender_global(name, ruleset) {
        if (!name)
            return 'androgynous'
        if (ruleset.exceptions) {
            var gender = find_gender_local(
                name, ruleset.exceptions, true);
            if (gender) return gender;
        }
        return find_gender_local(
                name, ruleset.suffixes, false) || 'androgynous';
    }

    //finds gender for name part for exceptions or suffixes
    function find_gender_local(name, rules, match_whole_word) {
        var res = Object.keys(rules).filter(function (gender, index) {
            var array = rules[gender];
            return array.some(function (sample) {
                return match_sample(match_whole_word, name, sample);
            })
        });
        if (res.length != 1)
            return null;
        else
            return res[0];
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
        "gender": "male",
        "test": [
          "иной",
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
        "gender": "female",
        "test": [
          "ова",
          "ева",
          "на",
          "ёва"
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
          "обей"
        ],
        "mods": [
          "--ья",
          "--ью",
          "--ья",
          "--ьем",
          "--ье"
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
          "нец",
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
          "гой",
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
          "ив",
          "шток"
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
          "ый",
          "кий",
          "хий"
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
          "иец",
          "еец"
        ],
        "mods": [
          "--йца",
          "--йцу",
          "--йца",
          "--йцом",
          "--йце"
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
          "ун",
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
          "агидель",
          "жизель",
          "нинель",
          "рашель",
          "рахиль"
        ],
        "mods": [
          "-и",
          "-и",
          ".",
          "ю",
          "-и"
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
        "gender": "male",
        "test": [
          "уа",
          "иа"
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
          "ъ",
          "иа",
          "ль"
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
        "gender": "male",
        "test": [
          "ша",
          "ча",
          "жа"
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
          "ка",
          "га",
          "ха"
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
          "ей",
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
          "ш",
          "ж"
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
    "exceptions": [
      {
        "gender": "androgynous",
        "test": [
          "борух"
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
      }
    ],
    "suffixes": [
      {
        "gender": "male",
        "test": [
          "мич",
          "ьич",
          "кич"
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
    var gender_rules_from_lson = 
{
  "gender": {
    "lastname": {
      "exceptions": {
        "androgynous": [
          "бова",
          "регин",
          "дарвин",
          "пэйлин",
          "грин",
          "цин",
          "шенгелая"
        ]
      },
      "suffixes": {
        "female": [
          "ова",
          "ая",
          "ына",
          "ина",
          "ева",
          "ска",
          "ёва"
        ],
        "male": [
          "кий",
          "ов",
          "ын",
          "ев",
          "ин",
          "ёв",
          "хий",
          "ний",
          "ый",
          "ой"
        ]
      }
    },
    "firstname": {
      "exceptions": {
        "androgynous": [
          "сева",
          "иона",
          "муса",
          "саша",
          "алвард",
          "валери",
          "кири",
          "анри",
          "ким",
          "райхон",
          "закия",
          "захария",
          "женя"
        ],
        "male": [
          "абиба",
          "савва",
          "лёва",
          "вова",
          "ага",
          "ахмедага",
          "алиага",
          "амирага",
          "агга",
          "серега",
          "фейга",
          "гога",
          "алиада",
          "муктада",
          "абида",
          "алда",
          "маджуда",
          "нурлыхуда",
          "гиа",
          "элиа",
          "гарсиа",
          "вавила",
          "гавриила",
          "генка",
          "лука",
          "дима",
          "зосима",
          "тима",
          "фима",
          "фома",
          "кузьма",
          "жора",
          "миша",
          "ермила",
          "данила",
          "гаврила",
          "абдалла",
          "аталла",
          "абдилла",
          "атилла",
          "кайролла",
          "абулла",
          "абула",
          "свитлана",
          "бена",
          "гена",
          "агелина",
          "джанна",
          "кришна",
          "степа",
          "дра",
          "назера",
          "валера",
          "эстера",
          "двойра",
          "калистра",
          "заратустра",
          "юра",
          "иса",
          "аиса",
          "халиса",
          "холиса",
          "валенса",
          "мусса",
          "ата",
          "паата",
          "алета",
          "никита",
          "мота",
          "шота",
          "фаста",
          "коста",
          "маритта",
          "малюта",
          "васюта",
          "вафа",
          "мустафа",
          "ганифа",
          "лев",
          "яков",
          "шелли",
          "константин",
          "марсель",
          "рамиль",
          "эмиль",
          "бактыгуль",
          "даниэль",
          "игорь",
          "арминэ",
          "изя",
          "кузя",
          "гия",
          "мазия",
          "кирикия",
          "ркия",
          "еркия",
          "эркия",
          "гулия",
          "аксания",
          "закария",
          "зекерия",
          "гарсия",
          "шендля",
          "филя",
          "вилля",
          "толя",
          "ваня",
          "саня",
          "загиря",
          "боря",
          "цайся",
          "вася",
          "ося",
          "петя",
          "витя",
          "митя",
          "костя",
          "алья",
          "илья",
          "ларья"
        ],
        "female": [
          "судаба",
          "сураба",
          "любава",
          "джанлука",
          "варвара",
          "наташа",
          "зайнаб",
          "любов",
          "сольвейг",
          "шакед",
          "аннаид",
          "ингрид",
          "синди",
          "аллаберди",
          "сандали",
          "лали",
          "натали",
          "гулькай",
          "алтынай",
          "гюнай",
          "гюльчитай",
          "нурангиз",
          "лиз",
          "элиз",
          "ботагоз",
          "юлдуз",
          "диляфруз",
          "габи",
          "сажи",
          "фанни",
          "мери",
          "элдари",
          "эльдари",
          "хилари",
          "хиллари",
          "аннемари",
          "розмари",
          "товсари",
          "ансари",
          "одри",
          "тери",
          "ири",
          "катри",
          "мэри",
          "сатаней",
          "ефтений",
          "верунчик",
          "гюзел",
          "этел",
          "рэйчел",
          "джил",
          "мерил",
          "нинелл",
          "бурул",
          "ахлам",
          "майрам",
          "махаррам",
          "мириам",
          "дилярам",
          "асем",
          "мерьем",
          "мирьем",
          "эркаим",
          "гулаим",
          "айгерим",
          "марьям",
          "мирьям",
          "эван",
          "гульжиган",
          "айдан",
          "айжан",
          "вивиан",
          "гульжиан",
          "лилиан",
          "мариан",
          "саиман",
          "джоан",
          "чулпан",
          "лоран",
          "моран",
          "джохан",
          "гульшан",
          "аделин",
          "жаклин",
          "карин",
          "каролин",
          "каталин",
          "катрин",
          "керстин",
          "кэтрин",
          "мэрилин",
          "рузалин",
          "хелин",
          "цеткин",
          "ширин",
          "элисон",
          "дурсун",
          "кристин",
          "гульжиян",
          "марьян",
          "ренато",
          "зейнеп",
          "санабар",
          "дильбар",
          "гулизар",
          "гульзар",
          "пилар",
          "дагмар",
          "элинар",
          "нилуфар",
          "анхар",
          "гаухар",
          "естер",
          "эстер",
          "дженнифер",
          "линор",
          "элинор",
          "элеонор",
          "айнур",
          "гульнур",
          "шамсинур",
          "элнур",
          "ильсияр",
          "нигяр",
          "сигитас",
          "агнес",
          "анес",
          "долорес",
          "инес",
          "анаис",
          "таис",
          "эллис",
          "элис",
          "кларис",
          "амнерис",
          "айрис",
          "дорис",
          "беатрис",
          "грейс",
          "грэйс",
          "ботагос",
          "маргос",
          "джулианс",
          "арус",
          "диляфрус",
          "саодат",
          "зулхижат",
          "хамат",
          "патимат",
          "хатимат",
          "альжанат",
          "маймунат",
          "гульшат",
          "биргит",
          "рут",
          "иргаш",
          "айнаш",
          "агнеш",
          "зауреш",
          "тэрбиш",
          "ануш",
          "азгануш",
          "гаруш",
          "николь",
          "адась",
          "афиля",
          "тафиля",
          "фаня",
          "аня"
        ]
      },
      "suffixes": {
        "androgynous": [
          "улла"
        ],
        "male": [
          "аба",
          "б",
          "ав",
          "ев",
          "ов",
          "г",
          "д",
          "ж",
          "з",
          "би",
          "ди",
          "жи",
          "али",
          "ри",
          "ай",
          "ей",
          "ий",
          "ой",
          "ый",
          "к",
          "л",
          "ам",
          "ем",
          "им",
          "ом",
          "ум",
          "ым",
          "ям",
          "ан",
          "бен",
          "вен",
          "ген",
          "ден",
          "ин",
          "сейн",
          "он",
          "ун",
          "ян",
          "ио",
          "ло",
          "ро",
          "то",
          "шо",
          "п",
          "ар",
          "др",
          "ер",
          "ир",
          "ор",
          "тр",
          "ур",
          "ыр",
          "яр",
          "ас",
          "ес",
          "ис",
          "йс",
          "кс",
          "мс",
          "ос",
          "нс",
          "рс",
          "ус",
          "юс",
          "яс",
          "ат",
          "мет",
          "кт",
          "нт",
          "рт",
          "ст",
          "ут",
          "ф",
          "х",
          "ш",
          "ы",
          "сь",
          "емеля",
          "коля"
        ],
        "female": [
          "иба",
          "люба",
          "лава",
          "ева",
          "га",
          "да",
          "еа",
          "иза",
          "иа",
          "ика",
          "нка",
          "ска",
          "ела",
          "ила",
          "лла",
          "эла",
          "има",
          "на",
          "ра",
          "са",
          "та",
          "фа",
          "елли",
          "еса",
          "сса",
          "гуль",
          "нуэль",
          "гюль",
          "нэ",
          "ая",
          "ея",
          "ия",
          "йя",
          "ля",
          "мя",
          "оя",
          "ря",
          "ся",
          "вья",
          "лья",
          "мья",
          "нья",
          "рья",
          "сья",
          "тья",
          "фья",
          "зя"
        ]
      }
    },
    "middlename": {
      "suffixes": {
        "female": [
          "на",
          "кызы",
          "гызы"
        ],
        "male": [
          "ич",
          "оглы",
          "улы",
          "уулу"
        ]
      }
    }
  }
};
    var gender_rules = gender_rules_from_lson.gender;
})();