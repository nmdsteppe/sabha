const { src, dest, parallel, series, watch } = require('gulp');
const autoprefixer = require('gulp-autoprefixer');
const cleanCSS = require('gulp-clean-css');
const uglify = require('gulp-uglify-es').default;
const del = require('del');
const browserSync = require('browser-sync').create();
const sass = require('gulp-sass');
const svgSprite = require('gulp-svg-sprite');
const fileInclude = require('gulp-file-include');
const sourcemaps = require('gulp-sourcemaps');
const rev = require('gulp-rev');
const revRewrite = require('gulp-rev-rewrite');
const revDel = require('gulp-rev-delete-original');
const htmlmin = require('gulp-htmlmin');
const gulpif = require('gulp-if');
const notify = require('gulp-notify');
const image = require('gulp-image');
const { readFileSync } = require('fs');
const concat = require('gulp-concat');
const webp = require('gulp-webp');
const webphtml = require('gulp-webp-html');
const webpcss = require('gulp-webp-css');
const rename = require('gulp-rename');

let isProd = false; // dev by default

const clean = () => {
	return del(['app/*'])
}

//svg sprite
const svgSprites = () => {
	return src('./src/img/svg/**.svg')
		.pipe(svgSprite({
			mode: {
				stack: {
					sprite: "../sprite.svg" //sprite file name
				}
			},
		}))
		.pipe(dest('./app/img'));
}

const styles = () => {
	return src('./src/scss/**/*.scss')
		.pipe(sourcemaps.init())
		.pipe(sass({
			outputStyle: 'expanded'
		}
		).on('error', notify.onError()))
		.pipe(autoprefixer({
			grid: true,
			overrideBrowserslist: ['last 5 version'],
			cascade: true
		}))
		.pipe(cleanCSS({ format: 'beautify' }))
		.pipe(webpcss())
		.pipe(cleanCSS({
			level: 2
		}))
		.pipe(rename({
			suffix: '.min'
		}))
		.pipe(sourcemaps.write('.'))
		.pipe(dest('./app/css/'))
		.pipe(browserSync.stream());
}

const stylesBackend = () => {
	return src('./src/scss/**/*.scss')
		.pipe(sass().on("error", notify.onError()))
		.pipe(autoprefixer({
			grid: true,
			overrideBrowserslist: ['last 5 version'],
			cascade: true
		}))
		.pipe(dest('./app/css/'))
};

const scripts = () => {
	src('./src/js/vendor/**.js')
		.pipe(concat('vendor.js'))
		.pipe(gulpif(isProd, uglify().on("error", notify.onError())))
		.pipe(dest('./app/js/'))
	return src('./src/js/**/*.js')
		.pipe(gulpif(!isProd, sourcemaps.init()))
		.pipe(concat('main.js'))
		.pipe(gulpif(isProd, uglify().on("error", notify.onError())))
		.pipe(gulpif(!isProd, sourcemaps.write('.')))
		.pipe(
			gulpif(isProd, rename({
				extname: ".min.js"
			})
			))
		.pipe(dest('./app/js'))
		.pipe(browserSync.stream());
}

const scriptsBackend = () => {
	src('./src/js/vendor/**.js')
		.pipe(concat('vendor.js'))
		.pipe(gulpif(isProd, uglify().on("error", notify.onError())))
		.pipe(dest('./app/js/'))
	return src(['./src/js/functions/**.js', './src/js/components/**.js', './src/js/main.js'])
		.pipe(dest('./app/js'))
};

const resources = () => {
	return src('./src/resources/**')
		.pipe(dest('./app'))
}

const images = () => {
	return src(['./src/img/**/*.jpg', './src/img/**/*.jpeg', './src/img/**/*.png'])
		.pipe(webp())
		.pipe(dest('./app/img'))
		.pipe(
			src(['./src/img/*.jpg', './src/img/*.png', './src/img/*.jpeg', './src/img/*.webp', './src/img/*.svg'])
		)
		.pipe(gulpif(isProd, image()))
		.pipe(dest('./app/img'))
};

const htmlInclude = () => {
	return src(['./src/*.html'])
		.pipe(fileInclude({
			prefix: '@',
			basepath: '@file'
		}))
		.pipe(webphtml())
		.pipe(dest('./app'))
		.pipe(browserSync.stream());
}

const watchFiles = () => {
	browserSync.init({
		server: {
			baseDir: "./app"
		},
	});

	watch('./src/scss/**/*.scss', styles);
	watch('./src/js/**/*.js', scripts);
	watch('./src/partials/*.html', htmlInclude);
	watch('./src/*.html', htmlInclude);
	watch('./src/resources/**', resources);
	watch('./src/img/*.{jpg,jpeg,png,svg}', images);
	watch('./src/img/svg/**.svg', svgSprites);
}

const cache = () => {
	return src('app/**/*.{css,js,svg,png,jpg,jpeg,woff2}', {
		base: 'app'
	})
		.pipe(rev())
		.pipe(dest('app'))
		.pipe(revDel())
		.pipe(rev.manifest('rev.json'))
		.pipe(dest('app'));
};

const rewrite = () => {
	const manifest = readFileSync('app/rev.json');

	return src('app/**/*.html')
		.pipe(revRewrite({
			manifest
		}))
		.pipe(dest('app'));
}

const htmlMinify = () => {
	return src('app/**/*.html')
		.pipe(htmlmin({
			collapseWhitespace: true
		}))
		.pipe(webphtml())
		.pipe(dest('app'));
}

const toProd = (done) => {
	isProd = true;
	done();
};

exports.default = series(clean, htmlInclude, scripts, styles, resources, images, svgSprites, watchFiles);

exports.build = series(toProd, clean, htmlInclude, scripts, styles, resources, images, svgSprites, htmlMinify);

exports.cache = series(cache, rewrite);

exports.backend = series(toProd, clean, htmlInclude, scriptsBackend, stylesBackend, resources, images, svgSprites);