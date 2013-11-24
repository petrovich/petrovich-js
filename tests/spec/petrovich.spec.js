var p = require('../../dist/petrovich.js');


describe('Petrovich', function() {

    
    describe('methods chain', function() {

        it('inflects common first names', function() {
            expect(p.male.first.nominative('Геннадий')).toBe('Геннадий');
            expect(p.female.first.genitive('Мария')).toBe('Марии');
            expect(p.male.first.dative('Василий')).toBe('Василию');
            expect(p.female.first.accusative('Ксюша')).toBe('Ксюшу');
            expect(p.male.first.instrumental('Паша')).toBe('Пашой');
            expect(p.female.first.prepositional('Елена')).toBe('Елене');
        });

        it('inflects common middle names', function() {
            expect(p.male.middle.nominative('Геннадиевич')).toBe('Геннадиевич');
            expect(p.female.middle.genitive('Геннадиевна')).toBe('Геннадиевны');
            expect(p.male.middle.dative('Васильевич')).toBe('Васильевичу');
            expect(p.female.middle.accusative('Васильевна')).toBe('Васильевну');
            expect(p.male.middle.instrumental('Павлович')).toBe('Павловичем');
            expect(p.female.middle.prepositional('Павловна')).toBe('Павловне');
        });

        it('inflects common last names', function() {
            expect(p.male.last.nominative('Пушкин')).toBe('Пушкин');
            expect(p.female.last.genitive('Цветаева')).toBe('Цветаевой');
            expect(p.male.last.dative('Толстой')).toBe('Толстому');
            expect(p.female.last.accusative('Ахматова')).toBe('Ахматову');
            expect(p.male.last.instrumental('Лермонтов')).toBe('Лермонтовым');
            expect(p.female.last.prepositional('Баркова')).toBe('Барковой');
        });

    });



    describe('object conversion', function() {
        
        it('takes an person-object with gender and first name as "first" or "firstname" property', function() {
            expect(p({gender: 'male', first: 'Александр'}, 'dative'))
                .toEqual({gender: 'male', first: 'Александру'});

            expect(p({gender: 'male', firstname: 'Александр'}, 'dative'))
                .toEqual({gender: 'male', first: 'Александру'});
        });

        
        it('takes an person-object with gender and middle name as "middle" or "middlename" property', function() {
            expect(p({gender: 'male', middle: 'Сергеевич'}, 'dative'))
                .toEqual({gender: 'male', middle: 'Сергеевичу'});

            expect(p({gender: 'male', middlename: 'Сергеевич'}, 'dative'))
                .toEqual({gender: 'male', middle: 'Сергеевичу'});
        });

        
        it('takes an person-object with gender and last name as "last" or "lastname" property', function() {
            expect(p({gender: 'male', last: 'Пушкин'}, 'dative'))
                .toEqual({gender: 'male', last: 'Пушкину'});

            expect(p({gender: 'male', lastname: 'Пушкин'}, 'dative'))
                .toEqual({gender: 'male', last: 'Пушкину'});
        });

        
        it('accepts any combination of properties "first", "middle" and "last"', function() {
            expect(p({gender: 'male', first: 'Александр', last: 'Пушкин'}, 'dative'))
                .toEqual({gender: 'male', first: 'Александру', last: 'Пушкину'});

            expect(p({gender: 'male', first: 'Александр', middle: 'Сергеевич'}, 'dative'))
                .toEqual({gender: 'male', first: 'Александру', middle: 'Сергеевичу'});

            expect(p({gender: 'male', last: 'Пушкин', middle: 'Сергеевич'}, 'dative'))
                .toEqual({gender: 'male', last: 'Пушкину', middle: 'Сергеевичу'});

            expect(p({gender: 'male', last: 'Пушкин', first: 'Александр', middle: 'Сергеевич'}, 'dative'))
                .toEqual({gender: 'male', last: 'Пушкину', first: 'Александру', middle: 'Сергеевичу'});
        });

        
        it('doesn\'t modify given object, but creates a copy', function() {
            expect(p({gender: 'male', last: 'Пушкин'}, 'dative'))
                .toEqual({gender: 'male', last: 'Пушкину'});
            expect(p({gender: 'male', last: 'Пушкин'}, 'dative'))
                .not.toBe({gender: 'male', last: 'Пушкину'});
        });

    });


    describe('gender detection', function() {

        it('is represented as petrovich.detect_gender method', function() {
            expect(p.detect_gender('Иванович')).toBe('male');
            expect(p.detect_gender('Ильинична')).toBe('female');
            expect(p.detect_gender('Блаблабла')).toBe('androgynous');
        });

        xit('allows to omit gender property if middle name is provided', function() {

        });
    });

});