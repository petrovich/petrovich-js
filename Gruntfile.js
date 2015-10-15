
module.exports = function(grunt) {

	grunt.initConfig({

		pkg: grunt.file.readJSON('package.json'),

		uglify: {
			options: {
				compress: {}
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
					to: '\n' + grunt.file.read('rules.json') + ';'
				}]
			}
		}

	});

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-text-replace');

	grunt.registerTask(
		'build',
		'Build distributive',
		['replace:rules', 'uglify:petrovich']
	);

};