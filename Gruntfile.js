/*global module */

var libraries = ['react', 'react-dom', 'jquery', 'lodash', 'd3', 'c3', 'openlayers', 'jszip'];
var libraries_colon = libraries.map(function (d) { return d + ":"});

module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        ts: {
            default: {
                tsconfig: true
            }
        },
        babel: {
            options: {
                babelrc: ".babelrc"
            },
            dist: {
               files: [{
                   "expand": true,
                   "cwd": "outts/",
                   "src": ["**/*.jsx", "**/*.js"],
                   "dest": "lib/",
                   "ext": ".js"
               }]
           }
        },
        browserify: {
            // default options for browserify
            options: {
                browserifyOptions: {
                    plugin: [['minifyify']]
                },
                transform: ["babelify"],
                external: libraries,
                watch: true
            },
            distlibs: {
                src: ['src/'],
                dest: 'dist/libs.js',
                options: {
                    alias: libraries_colon,
                    external: null,
                    transform: null,
                    browserifyOptions: {
                        debug: true,
                        plugin: [['minifyify']]
                    }
                },
            },
            devlibs: {
                src: ['src/'],
                dest: 'dist/libs.js',
                options: {
                    alias: libraries_colon,
                    external: null,
                    transform: null,
                    browserifyOptions: {
                        debug: true,
                    }
                }
            },
            // this generates a minified ouput of the app without the libs
            dist: {
                options: {
                    browserifyOptions: {
                        debug: false,
                        plugin: [['minifyify', {map: false}]],
                        extensions: ['.jsx']
                    }
                },
                files: [{'dist/index.js': 'lib/index.js'}/*, {'dist/test.min.js': 'src/test.js'}*/]
            },
            // generates a non minified output without the libs but with source maps
            dev: {
                options: {
                    browserifyOptions: {
                        debug: true,
                        plugin: [],
                        extensions: ['.jsx']
                    }
                },
                files: [{'dist/index.js': 'lib/index.js'}]
            },
			test: {
				dev: {
	                options: {
	                    browserifyOptions: {
	                        debug: true,
	                        plugin: [],
	                        extensions: ['.jsx']
	                    }
	                },
	                files: [{'dist/multipleView.js': 'src/multipleView.js'}]
	            }
			}
        },
        copy: {
            index_html: {expand: true, flatten: true, cwd: 'src/', src: 'index.html', dest: 'dist/'},
            weave_html: {expand: true, flatten: true, cwd: 'src/', src: 'weave.html', dest: 'dist/'},
            css: {expand: true, flatten: true, cwd: 'src/', src: 'css/*.css', dest: 'dist/'},
            img: {expand: true, flatten: true, cwd: 'src/', src: 'img/*.*', dest: 'dist/img'},
            fonts: {expand: true, flatten: true, cwd: 'src/', src: 'css/fonts/*.ttf', dest: 'dist/fonts'},
            olcss: {expand: true, flatten: true, cwd: 'node_modules/openlayers/css', src: 'ol.css', dest: 'dist/'},
            fontawesomecss: {expand: true, flatten: true, cwd: 'node_modules/font-awesome/css', src: 'font-awesome.css', dest: 'dist/css/'},
            fontawesomefont: {expand: true, flatten: true, cwd: 'node_modules/font-awesome/fonts', src: '*', dest: 'dist/fonts/'},
	        semantic: {expand: true, cwd: 'src/semantic', src: '**', dest: 'dist/semantic/'},
            weavesessions: {expand: true, flatten: true, cwd: 'weave_sessions', src: "*", dest: "dist/"},
            projdb: {expand: true, flatten: true, cwd: 'src/', src: 'ProjDatabase.zip', dest: "dist/"},
            core: {expand: true, cwd: "WeaveASJS/bin/js-release/", src: "*.*", dest: "dist/core"},
            weave_dts: {expand: true, cwd: "WeaveASJS/typings/", src: "weavejs-core.d.ts", dest: "typings/weave/"}

        },
        clean: {
            outtsref: ["outtsref"],
            outts: ["outts"],
            lib: ["lib"],
            dist: ["dist/*.js", "dist/*.css", "dist/*.html"]
        },
        exec: {
            weave_asjs: {
                command: 'npm run compile-as && npm run compile-dts',
                stdout: true,
                maxBuffer: 1000000
            }
        }
    });

    grunt.loadNpmTasks('grunt-ts');
    grunt.loadNpmTasks('grunt-babel');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-minifyify');
    grunt.registerTask('distcopy', ['copy:index_html', 'copy:weave_html', 'copy:css', 'copy:img', 'copy:fonts','copy:olcss', 'copy:fontawesomecss', 'copy:fontawesomefont', 'copy:semantic', 'copy:projdb', 'copy:core']);
    grunt.registerTask('devlibs', ['browserify:devlibs']);
    grunt.registerTask('distlibs', ['browserify:distlibs']);
    grunt.registerTask('weave_asjs', ['exec:weave_asjs', 'copy:weave_dts']);
    grunt.registerTask('default', ['weave_asjs','ts', 'babel', 'browserify:dev', 'distcopy']);
    grunt.registerTask('all', ['clean', 'weave_asjs', 'ts', 'babel', 'distlibs', 'distcopy']);
    grunt.registerTask('distall', ['clean', 'ts', 'babel', 'browserify:dist', 'browserify:distlibs', 'distcopy']);
};
