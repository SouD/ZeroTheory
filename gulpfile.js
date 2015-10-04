'use strict';

// Load gulp modules
var gulp = require('gulp');
var bower = require('gulp-bower');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');

// Configuration obj
var config = {
  src: {
    path: './src'
  },
  public: {
    path: './public'
  }
};
config.src.sass = config.src.path + '/sass';
config.src.js = config.src.path + '/js';
config.public.css = config.public.path + '/css';
config.public.js = config.public.path + '/js';
config.public.fonts = config.public.path + '/fonts';

// Bower
config.bower = {
  path: './bower_components'
};

gulp.task('bower', function () {
  return bower().pipe(gulp.dest(config.bower.path));
});

// Fonts
config.fonts = {
  files: [
    config.bower.path + '/bootstrap-sass/assets/fonts/bootstrap/**/*',
    config.bower.path + '/font-awesome/fonts/**/*'
  ]
};

gulp.task('fonts', function () {
  return gulp.src(config.fonts.files)
    .pipe(gulp.dest(config.public.fonts));
});

// Sass
config.sass = {
  file: config.src.sass + '/style.scss',
  watch: config.src.sass + '/**/*.scss',
  outputStyle: 'compressed',
  includePaths: [
    config.bower.path + '/bootstrap-sass/assets/stylesheets',
    config.bower.path + '/font-awesome/scss'
  ]
};

gulp.task('sass', function () {
  gulp.src(config.sass.file)
    .pipe(sourcemaps.init())
      .pipe(sass({
        outputStyle: config.sass.outputStyle,
        includePaths: config.sass.includePaths // Make bower stuff available
      }).on('error', sass.logError))
    .pipe(sourcemaps.write('.')) // Write sourcemaps in same dir as style
    .pipe(gulp.dest(config.public.css));
});

gulp.task('sass:watch', function () {
  gulp.watch(config.sass.watch, ['sass']);
});

// Js
config.js = {
  files: config.src.js + '/**/*.js',
  libs: [
    config.bower.path + '/jquery/dist/jquery.min.js',
    config.bower.path + '/bootstrap-sass/assets/javascripts/bootstrap.min.js'
  ],
  file: 'scripts.min.js'
};

gulp.task('scripts', function () {
  return gulp.src(config.js.files)
    .pipe(sourcemaps.init())
      .pipe(uglify())
      .pipe(gulp.src(config.js.libs))
      .pipe(concat(config.js.file))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(config.public.js));
});

gulp.task('scripts:watch', function () {
  gulp.watch(config.js.files, ['scripts']);
});

// Default task
gulp.task('default', ['bower', 'fonts', 'scripts', 'sass']);
