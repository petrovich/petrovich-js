"use strict";

(function(){

    // Predefined proper values
    var predef = {
        genders: ['male', 'female', 'androgynous'],
        nametypes: ['first', 'last', 'middle'],
        cases: ['nominative', 'genitive', 'dative', 'accusative', 'instrumental', 'prepositional']
    };

    // Validates that gender and case are members of predef
    // No Array.indexOf owing to IE8
    function validate(gender, gcase) {
        function contains(x, arr) {
            for (var i in arr) { if (arr[i] === x) return true; }
            return false;
        }
        if (!contains(predef.genders, gender))
            throw new Error('Invalid gender: ' + gender);
        if (!contains(predef.cases, gcase))
            throw new Error('Invalid case: ' + gcase);
    }

    // First use method:
    // var person = { gender: 'female', first: 'Маша' };
    // petrovich(person, 'dative');
    var petrovich = function(person, gcase) {
        validate(person.gender, gcase);
    };

    // Second use method:
    // Build dynamically methods chain like petrovich.male.first.dative(name)
    // Isolate scope to reduce polluting scope with temp variables
    (function() {
        for (var i in predef.genders) {
            var gender = predef.genders[i];
            if (!petrovich[gender]) petrovich[gender] = {};
            for (var k in predef.nametypes) {
                var nametype = predef.nametypes[k];
                if (!petrovich[gender][nametype]) petrovich[gender][nametype] = {};
                for (var l in predef.cases) {
                    var gcase = predef.cases[l];
                    // The flower on the mountain peak:
                    petrovich[gender][nametype][gcase] =
                        (function(gender, nametype, gcase){
                            return function(name) {
                                inflect(gender, name, gcase, nametype+'name');
                            };
                        })(gender, nametype, gcase);
                }
            }
        }
    })();

    // Export for NodeJS or browser
    if (module && module.exports) module.exports = kuzmich;
    else if (window) window.kuzmich = kuzmich;


    /*function inflect (gender, name, gcase, nametype) {
        var nametype_rulesets = rules[nametype];
        var i = 0;
        
    }*/

})();