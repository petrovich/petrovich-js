
module.exports = function(grunt) {

	grunt.initConfig({

		pkg: grunt.file.readJSON('package.json'),

		rulesMinified: function() {
			return grunt.file.read('dist/rules.json');
		},

		uglify: {
			options: {
				compress: true
			},
			petrovich: {
				src: 'dist/petrovich.js',
				dest: 'dist/petrovich.min.js'
			}
		},

		replace: {
			rules: {
				src: 'petrovich.js',
				dest: 'dist/petrovich.js',
				replacements: [{
					from: 'null; // grunt: replace rules',
					to: "<%= rulesMinified %>"
				}]
			}
		}

	});

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-text-replace');

	grunt.registerTask(
		'minify:rules',
		'Minify rules.json',
		function() {
	        var rules = JSON.stringify(grunt.file.readJSON('rules.json'));
	        grunt.file.write('dist/rules.json', rules);
		}
	);

	grunt.registerTask(
		'build',
		'Build distributive',
		['minify:rules', 'replace:rules', 'uglify:petrovich']
	);

};