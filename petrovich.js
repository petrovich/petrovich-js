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


    var rules = null; // grunt: replace rules
    var gender_rules_from_lson = null; // grunt: replace gender_rules
    var gender_rules = gender_rules_from_lson.gender;
})();