/* global __dirname */

var path = require('path');

var webpack = require('webpack');
var CopyWebpackPlugin = require('copy-webpack-plugin');

var dir_js = path.resolve(__dirname, 'js');
var dir_html = path.resolve(__dirname, 'html');
var dir_build = path.resolve(__dirname, 'build');

module.exports = {
    entry: [
        'webpack/hot/only-dev-server',
        path.resolve(dir_js, 'index.js')
    ],

    output: {
        path: dir_build,
        publicPath: '/scripts',
        //publicPath: '/build/',
        filename: 'bundle.js'
    },
    devServer: {
        //contentBase: dir_build,
        proxy: {
            "*": "http://localhost:5000"
        }
    },
    module: {
        loaders: [
            {
                loader: 'babel-loader',
                test: dir_js
            }
        ]
    },
    plugins: [
        /*// Simply copies the files over
        new CopyWebpackPlugin([
            { from: dir_html } // to: output.path
        ]),
        */
        // Avoid publishing files when compilation fails
        new webpack.NoErrorsPlugin(),
        new webpack.HotModuleReplacementPlugin(),
        /*http://webpack.github.io/docs/shimming-modules.html
        new webpack.ProvidePlugin({
            fetch: "whatwg-fetch",
            "window.fetch": "whatwg-fetch"
        })*/
        //http://mts.io/2015/04/08/webpack-shims-polyfills/
        new webpack.ProvidePlugin({
            'fetch': 'imports?this=>global!exports?global.fetch!whatwg-fetch'
        })
        //new webpack.optimize.UglifyJsPlugin({
        //    sourceMap: true
        //})
    ],
    stats: {
        // Nice colored output
        colors: true
    },
    // Create Sourcemaps for the bundle
    devtool: 'source-map',
};
