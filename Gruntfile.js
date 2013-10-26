
module.exports = function(grunt) {

	grunt.initConfig({

		pkg: grunt.file.readJSON('package.json'),

		ugilfy: {
			options: {
				compress: true
			},
			minify: {
				expand: true,
				cwd: 'dist/',
				src: 'petrovich*.min.js',
				dest: './'
			}
		}		

	});

	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	grunt.registerTask(
		'translate-rules',
		'Translates rules.yml to rules.json',
		function() {
			require('js-yaml');
			require('fs').writeFileSync(
				'./dist/rules.json',
				JSON.stringify(require('./rules.yml'))
			);
		});
};