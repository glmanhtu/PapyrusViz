const path = require('path');
const fs = require('fs');

const arch = process.arch;
const platform = process.platform;

module.exports = {
	packagerConfig: {
		name: "Papyviz",
		executableName: "papyviz",
		asar: {
			unpack: [
				"**/node_modules/sharp/**/*",
				"**/node_modules/@img/**/*",
				`**/node_modules/onnxruntime-node/bin/**/*`
			]
		},
		extraResource: [
			"resources",
		],
		icon: "./workspaces/electron-app/main/assets/icons/icon"
	},
	hooks: {
		packageAfterCopy: async (config, buildPath, electronVersion, platform, arch) => {
			const src = path.join(buildPath, 'node_modules', 'onnxruntime-node', 'bin', 'napi-v3')
			for (const file of fs.readdirSync(src)) {
				const platformDir = path.join(src, file);
				for (const archFile of fs.readdirSync(platformDir)) {
					if (file !== platform || archFile !== arch) {
						fs.rmSync(path.join(src, file, archFile), {recursive: true});
					}
				}
			}
		}
	},
	rebuildConfig: {},
	makers: [
		{
			name: "@electron-forge/maker-dmg",
			config: {}
		},
		{
			name: "@electron-forge/maker-deb",
			config: {}
		},
		{
			name: "@electron-forge/maker-zip",
			config: {
				platforms: [
					"linux"
				]
			}
		},
		{
			name: "@electron-forge/maker-squirrel",
			config: {}
		}
	],
	plugins: [
		{
			name: "@electron-forge/plugin-webpack",
			config: {
				mainConfig: "./webpack.main.config.js",
				renderer: {
					config: "./webpack.renderer.config.js",
					entryPoints: [
						{
							html: "./workspaces/electron-app/renderer/index.html",
							js: "./workspaces/electron-app/renderer/index.ts",
							name: "main_window",
							preload: {
								js: "./workspaces/electron-app/renderer/preload.ts"
							}
						}
					]
				}
			}
		},
		{
			name: "@electron-forge/plugin-auto-unpack-natives",
			config: {}
		},
		{
			name: "@timfish/forge-externals-plugin",
			config: {
				externals: [
					"sharp",
					"onnxruntime-node"
				],
				includeDeps: true
			}
		}
	]
}