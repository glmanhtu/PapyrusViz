const path = require('path');
const fs = require('fs');

module.exports = {
	packagerConfig: {
		name: "Papyrus Visualization",
		executableName: "papyviz",
		asar: {
			unpack: [
				"**/node_modules/sharp/**/*",
				"**/node_modules/@img/**/*"
			]
		},
		extraResource: [
			"resources",
		],
		icon: "./workspaces/electron-app/main/assets/icons/icon"
	},
	hooks: {
		packageAfterCopy: async (config, buildPath, electronVersion, platform, arch) => {
			const src = path.join(buildPath, '.webpack', arch, 'bin', 'napi-v3', platform, arch)
			for (const file of fs.readdirSync(src)) {
				if (!file.endsWith('.node')) {
					fs.rmSync(path.join(src, file), {recursive: true});
				}
			}
		},
		packageAfterExtract: async (config, buildPath, electronVersion, platform, arch) => {
			const src = path.join(__dirname, 'node_modules', 'onnxruntime-node', 'bin', 'napi-v3', platform, arch)
			let dest = buildPath
			if (platform === 'darwin') {
				dest = path.join(buildPath, 'Electron.app', 'Contents', 'Frameworks');
			}
			// Todo: Verify the flow on Windows and Linux
			fs.cpSync(src, dest, {recursive: true});
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
					"sharp"
				],
				includeDeps: true
			}
		}
	]
}