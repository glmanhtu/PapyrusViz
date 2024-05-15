const path = require('path');
const fs = require('fs');

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

			// Here we clean up prebuild files which is not related to this platform and arch
			for (const platformName of fs.readdirSync(src)) {
				const platformDir = path.join(src, platformName);
				for (const archName of fs.readdirSync(platformDir)) {
					const archDir = path.join(platformDir, archName);

					// If the platform and arch of the folder doesn't match with current system, we remove it
					if (platformName !== platform || archName !== arch) {
						fs.rmSync(archDir, {recursive: true});
					} else {
						for (const fileName of fs.readdirSync(archDir)) {
							if (fileName.includes('_cuda')) {
								// We don't need CUDA library for this application
								fs.rmSync(path.join(archDir, fileName));
							}
						}
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