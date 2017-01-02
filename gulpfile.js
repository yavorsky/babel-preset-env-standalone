const gulp = require('gulp');
const lazypipe = require('lazypipe');
const pump = require('pump');
const rename = require('gulp-rename');
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const uglify = require('gulp-uglify');

function webpackBuild(filename, libraryName, version) {
  const config = {
    module: {
      loaders: [
        {
          //exclude: /node_modules/,
          test: /\.js$/,
          loader: 'babel',
          query: {
            presets: ['es2015'], 
            plugins: ['transform-flow-strip-types', "dynamic-import-webpack"]
          }
        },
        {
          test: /\.json$/,
          loader: 'json'
        }
      ]
    },
    node: {
      // Mock Node.js modules that Babel require()s but that we don't
      // particularly care about.
      fs: 'empty',
      module: 'empty',
      net: 'empty'
    },
    output: {
      filename: filename,
      library: libraryName,
      libraryTarget: 'umd'
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': '"production"',
        BABEL_VERSION: JSON.stringify(require('babel-core/package.json').version),
        VERSION: JSON.stringify(version)
      }),
      // // Use browser version of visionmedia-debug
      // new webpack.NormalModuleReplacementPlugin(
      //   /..\/..\/package/,
      //   '../../../../src/babel-package-shim'
      // ),
      new webpack.optimize.OccurenceOrderPlugin(),
      new webpack.optimize.DedupePlugin()
    ]
  };

  if (libraryName !== 'Babel') {
    // This is a secondary package (eg. Babili), we should expect that Babel
    // was already loaded, rather than bundling it in here too.
    config.externals = {
      'babel-standalone': 'babelPresetEnv',
    };
  }
  return webpackStream(config);
}

const minifyAndRename = lazypipe()
  .pipe(uglify)
  .pipe(rename, { extname: '.min.js' });

gulp.task('default', ['build']);
gulp.task('build', ['build-babel']);

gulp.task('build-babel', cb => {
  pump([
    gulp.src('src/index.js'),
    webpackBuild('babel-preset-env.js', 'babelPresetEnv', require('./package.json').version),
    gulp.dest('.'),
    minifyAndRename(),
    gulp.dest('.'),
  ], cb);
});
