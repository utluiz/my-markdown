module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt);
	
  // Project configuration.
  grunt.initConfig({
	pkg: grunt.file.readJSON('package.json'),
	
	uglify: {
		options: {
			compress: {
				global_defs: {
					"WP_MARKDOWN_SCRIPT_DEBUG": false
				},
				dead_code: true
      			},
			banner: '/*! <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd HH:MM") %> */\n'
		},
		build: {
			files: [{
				expand: true,     // Enable dynamic expansion.
				src: ['js/**/*.js', '!js/**/*.min.js' ],
				ext: '.min.js',   // Dest filepaths will have this extension.
			}]
		}
	},
	
	jshint: {
		options: {
			globals: {
				"WP_MARKDOWN_SCRIPT_DEBUG": false,
			},
			reporter: require('jshint-stylish'),
			'-W020': true, //Read only - error when assigning WP_MARKDOWN_SCRIPT_DEBUG a value.
		},
		all: ['js/**/*.js', '!js/**/*.min.js', '!js/pagedown/*', '!**/prettify.js' ],
  	},
  	
	wp_readme_to_markdown: {
		convert:{
			files: {
				'readme.md': 'readme.txt'
			},
		},
	},
	
	phpunit: {
		classes: {
			dir: 'tests/php/'
		},
		options: {
			bin: 'vendor/bin/phpunit',
			bootstrap: 'tests/php/phpunit.php',
			colors: true
		}
	},
	
	clean: {
		//Clean up build folder
		main: ['build/my-markdown']
	},

	copy: {
		// Copy the plugin to a versioned release directory
		main: {
			src:  [
				'**',
				'!*~',
				'!node_modules/**',
				'!build/**',
				'!.git/**','!.gitignore','!.gitmodules',
				'!tests/**',
				'!vendor/**',
				'!Gruntfile.js','!package.json',
				'!composer.lock','!composer.phar','!composer.json',
				'!CONTRIBUTING.md'
			],
			dest: 'build/my-markdown/'
		},
	}
	
});

//Tasks
grunt.registerTask( 'test', [ 'phpunit', 'jshint' ] );
grunt.registerTask( 'build', [ 'test', 'uglify', 'clean', 'copy' ] );
grunt.registerTask( 'deploy', [ 'checkbranch:master', 'checkrepo:deploy',  'test', 'wp_readme_to_markdown', 'clean', 'copy', 'wp_deploy' ] );

grunt.registerTask('readme', ['wp_readme_to_markdown']);
};
