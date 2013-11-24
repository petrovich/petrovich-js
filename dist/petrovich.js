"use strict";

(function(){

    // Predefined values
    var predef = {
        genders: ['male', 'female', 'androgynous'],
        nametypes: ['first', 'middle', 'last'],
        cases: ['nominative', 'genitive', 'dative', 'accusative', 'instrumental', 'prepositional']
    };

    // Auxiliary function, used by validate() and find_rule_local()
    function contains(arr, x) {
        for (var i in arr) { if (arr[i] === x) return true; }
        return false;
    }

    // Validates that gender and case are members of predef
    // No Array.indexOf owing to IE8
    function validate(gender, gcase) {
        if (!contains(predef.genders, gender))
            throw new Error('Invalid gender: ' + gender);
        if (!contains(predef.cases, gcase))
            throw new Error('Invalid case: ' + gcase);
    }

    // First use means:
    // var person = { gender: 'female', first: 'Маша' };
    // petrovich(person, 'dative');
    var petrovich = function(person, gcase) {
        validate(person.gender, gcase);
        var result = { gender: person.gender };
        for (var i in predef.nametypes) {
            var nametype = predef.nametypes[i];
            if (person[nametype] !== null) {
                result[nametype] =
                    inflect(person.gender, person[nametype], gcase, nametype+'name');
            }
        }
        return result;
    };

    // Second use means:
    // Build dynamically methods chain like petrovich.male.first.dative(name)
    // Isolate scope to reduce polluting scope with temp variables
    (function() {
        for (var i in predef.genders) {
            var gender = predef.genders[i];
            if (!petrovich[gender]) petrovich[gender] = {};
            for (var k in predef.nametypes) {
                var nametype = predef.nametypes[k];
                if (!petrovich[gender][nametype])
                    petrovich[gender][nametype] = {};
                for (var l in predef.cases) {
                    var gcase = predef.cases[l];
                    // The flower on the mountain peak:
                    petrovich[gender][nametype][gcase] =
                        (function(gender, nametype, gcase){
                            return function(name) {
                                return inflect(gender, name, gcase, nametype+'name');
                            };
                        })(gender, nametype, gcase);
                }
            }
        }
    })();

    // Export for NodeJS or browser
    if (module && module.exports) module.exports = petrovich;
    else if (window) window.petrovich = petrovich;




    // Key private method, used by all public methods
    function inflect (gender, name, gcase, nametype) {
        var nametype_rulesets = rules[nametype],
            parts = name.split('-'),
            result = [];
            for (var k in parts) {
                var part = parts[k],
                    first_word = k === 0 && parts.size > 1,
                    rule = find_rule_global(gender, name,
                        nametype_rulesets, {first_word: first_word});
                if (rule) result.push(apply_rule(name, gcase, rule));
                else result.push(name);
            }
            return result.join('-');
    }


    // Find groups of rules in exceptions or suffixes of given nametype
    function find_rule_global(gender, name, nametype_rulesets, features) {
        if (!features) features = {};
        var tags = [];
        for (var key in features) {
            if (features[key]) tags.push(key);
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
        for (var i in ruleset) {
            var rule = ruleset[i];

            if (rule.tags) {
                var common_tags = [];
                for (var k in rule.tags) {
                    var tag = rule.tags[k];
                    if (!contains(tags, tag)) common_tags.push(tag);
                }
                if (!common_tags.length) continue;
            }
            if (rule.gender !== 'androgynous' && gender !== rule.gender)
                continue;

            name = name.toLowerCase();
            for (var k in rule.test) {
                var sample = rule.test[k];
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
        else if (contains(predef.cases, gcase)) {
            for (var i in predef.cases) {
                if (gcase === predef.cases[i]) {
                    mod = rule.mods[i-1];
                    break;
                }
            }
        } else throw new Error('Unknown grammatic case: ' + gcase);
        
        for (var i in mod) {
            var chr = mod[i];
            switch (chr) {
                case '.': break;
                case '-':
                    name = name.substr(0, name.length-1);
                    break;
                default: name += chr;
            }
        }
        return name;
    }


    var rules = {"lastname":{"exceptions":[{"gender":"androgynous","test":["бонч","абдул","белиц","гасан","дюссар","дюмон","книппер","корвин","ван","шолом","тер","призван","мелик","вар","фон"],"mods":[".",".",".",".","."],"tags":["first_word"]},{"gender":"androgynous","test":["дюма","тома","дега","люка","ферма","гамарра","петипа","шандра","скаля","каруана"],"mods":[".",".",".",".","."]},{"gender":"androgynous","test":["гусь","ремень","камень","онук","богода","нечипас","долгопалец","маненок","рева","кива"],"mods":[".",".",".",".","."]},{"gender":"androgynous","test":["вий","сой","цой","хой"],"mods":["-я","-ю","-я","-ем","-е"]},{"gender":"androgynous","test":["я"],"mods":[".",".",".",".","."]}],"suffixes":[{"gender":"female","test":["б","в","г","д","ж","з","й","к","л","м","н","п","р","с","т","ф","х","ц","ч","ш","щ","ъ","ь"],"mods":[".",".",".",".","."]},{"gender":"androgynous","test":["гава","орота"],"mods":[".",".",".",".","."]},{"gender":"female","test":["ска","цка"],"mods":["-ой","-ой","-ую","-ой","-ой"]},{"gender":"female","test":["ая"],"mods":["--ой","--ой","--ую","--ой","--ой"]},{"gender":"female","test":["ская"],"mods":["--ой","--ой","--ую","--ой","--ой"]},{"gender":"female","test":["на"],"mods":["-ой","-ой","-у","-ой","-ой"]},{"gender":"male","test":["иной"],"mods":["-я","-ю","-я","-ем","-е"]},{"gender":"male","test":["уй"],"mods":["-я","-ю","-я","-ем","-е"]},{"gender":"androgynous","test":["ца"],"mods":["-ы","-е","-у","-ей","-е"]},{"gender":"male","test":["рих"],"mods":["а","у","а","ом","е"]},{"gender":"androgynous","test":["ия"],"mods":[".",".",".",".","."]},{"gender":"androgynous","test":["иа","аа","оа","уа","ыа","еа","юа","эа"],"mods":[".",".",".",".","."]},{"gender":"male","test":["их","ых"],"mods":[".",".",".",".","."]},{"gender":"androgynous","test":["о","е","э","и","ы","у","ю"],"mods":[".",".",".",".","."]},{"gender":"female","test":["ова","ева"],"mods":["-ой","-ой","-у","-ой","-ой"]},{"gender":"androgynous","test":["га","ка","ха","ча","ща","жа"],"mods":["-и","-е","-у","-ой","-е"]},{"gender":"androgynous","test":["ца"],"mods":["-и","-е","-у","-ей","-е"]},{"gender":"androgynous","test":["а"],"mods":["-ы","-е","-у","-ой","-е"]},{"gender":"male","test":["ь"],"mods":["-я","-ю","-я","-ем","-е"]},{"gender":"androgynous","test":["ия"],"mods":["-и","-и","-ю","-ей","-и"]},{"gender":"androgynous","test":["я"],"mods":["-и","-е","-ю","-ей","-е"]},{"gender":"male","test":["ей"],"mods":["-я","-ю","-я","-ем","-е"]},{"gender":"male","test":["ян","ан","йн"],"mods":["а","у","а","ом","е"]},{"gender":"male","test":["ынец","обец"],"mods":["--ца","--цу","--ца","--цем","--це"]},{"gender":"male","test":["онец","овец"],"mods":["--ца","--цу","--ца","--цом","--це"]},{"gender":"male","test":["ай"],"mods":["-я","-ю","-я","-ем","-е"]},{"gender":"male","test":["гой","кой"],"mods":["-го","-му","-го","--им","-м"]},{"gender":"male","test":["ой"],"mods":["-го","-му","-го","--ым","-м"]},{"gender":"male","test":["ах","ив"],"mods":["а","у","а","ом","е"]},{"gender":"male","test":["ший","щий","жий","ний"],"mods":["--его","--ему","--его","-м","--ем"]},{"gender":"male","test":["кий","ый"],"mods":["--ого","--ому","--ого","-м","--ом"]},{"gender":"male","test":["ий"],"mods":["-я","-ю","-я","-ем","-и"]},{"gender":"male","test":["ок"],"mods":["--ка","--ку","--ка","--ком","--ке"]},{"gender":"male","test":["ец"],"mods":["--ца","--цу","--ца","--цом","--це"]},{"gender":"male","test":["ц","ч","ш","щ"],"mods":["а","у","а","ем","е"]},{"gender":"male","test":["ен","нн","он","ун"],"mods":["а","у","а","ом","е"]},{"gender":"male","test":["в","н"],"mods":["а","у","а","ым","е"]},{"gender":"male","test":["б","г","д","ж","з","к","л","м","п","р","с","т","ф","х"],"mods":["а","у","а","ом","е"]}]},"firstname":{"exceptions":[{"gender":"male","test":["лев"],"mods":["--ьва","--ьву","--ьва","--ьвом","--ьве"]},{"gender":"male","test":["пётр"],"mods":["---етра","---етру","---етра","---етром","---етре"]},{"gender":"male","test":["павел"],"mods":["--ла","--лу","--ла","--лом","--ле"]},{"gender":"male","test":["яша"],"mods":["-и","-е","-у","-ей","-е"]},{"gender":"male","test":["шота"],"mods":[".",".",".",".","."]},{"gender":"female","test":["рашель","нинель","николь","габриэль","даниэль"],"mods":[".",".",".",".","."]}],"suffixes":[{"gender":"androgynous","test":["е","ё","и","о","у","ы","э","ю"],"mods":[".",".",".",".","."]},{"gender":"female","test":["б","в","г","д","ж","з","й","к","л","м","н","п","р","с","т","ф","х","ц","ч","ш","щ","ъ"],"mods":[".",".",".",".","."]},{"gender":"female","test":["ь"],"mods":["-и","-и",".","ю","-и"]},{"gender":"male","test":["ь"],"mods":["-я","-ю","-я","-ем","-е"]},{"gender":"androgynous","test":["га","ка","ха","ча","ща","жа"],"mods":["-и","-е","-у","-ой","-е"]},{"gender":"female","test":["ша"],"mods":["-и","-е","-у","-ей","-е"]},{"gender":"androgynous","test":["а"],"mods":["-ы","-е","-у","-ой","-е"]},{"gender":"female","test":["ия"],"mods":["-и","-и","-ю","-ей","-и"]},{"gender":"female","test":["я"],"mods":["-и","-е","-ю","-ей","-е"]},{"gender":"male","test":["ей"],"mods":["-я","-ю","-я","-ем","-е"]},{"gender":"male","test":["ий"],"mods":["-я","-ю","-я","-ем","-и"]},{"gender":"male","test":["й"],"mods":["-я","-ю","-я","-ем","-е"]},{"gender":"male","test":["б","в","г","д","ж","з","к","л","м","н","п","р","с","т","ф","х","ц","ч"],"mods":["а","у","а","ом","е"]}]},"middlename":{"suffixes":[{"gender":"male","test":["ич"],"mods":["а","у","а","ем","е"]},{"gender":"female","test":["на"],"mods":["-ы","-е","-у","-ой","-е"]}]}}

})();