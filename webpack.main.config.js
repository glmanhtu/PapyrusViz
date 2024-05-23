/*
 * Copyright (C) 2024  Manh Tu VU
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const relocateLoader = require('@vercel/webpack-asset-relocator-loader');

module.exports = {
	/**
	 * This is the main entry point for your application, it's the first file
	 * that runs in the main process.
	 */
	entry: './workspaces/electron-app/main/index.ts',
	// Put your normal webpack config below here
	module: {
		rules: require('./webpack.rules'),
	},
	devtool: 'source-map',
	externals: {
		'sharp': 'commonjs sharp',
		'onnxruntime-node': 'commonjs onnxruntime-node'
	},
	resolve: {
		extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
		modules: [path.resolve(__dirname, 'node_modules'), 'node_modules'],
	},
	node: {
		__filename: false,
		__dirname: false,
	},
	plugins: [
		new CopyWebpackPlugin({
			patterns: [
				{ from: 'workspaces/electron-app/main/assets' },
				{
					from: 'workspaces/angular-app/.dist/angular-app',
					to: '../renderer/angular_window',
					noErrorOnMissing: true,
				}
			],
		}),
		{
			apply (compiler) {
				compiler.hooks.compilation.tap('webpack-asset-relocator-loader', compilation => {
					relocateLoader.initAssetCache(compilation, 'native_modules');
				});
			}
		}
	],
};
