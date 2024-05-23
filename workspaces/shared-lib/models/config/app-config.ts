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

export interface GlobalConfig {
	appConfig: AppConfig;
}

export interface AppConfig {
	/** The configuration identifier */
	configId: string;

	/** The main logger output file path */
	mainLogFile: string;

	/** The main logger output level */
	mainLogLevel: string;

	/** Tells if we should try to load app icon */
	isIconAvailable: boolean;

	/** Tells if `nodeIntegration` webPreference is enabled */
	isNodeIntegration: boolean;

	/** Tells if  `contextIsolation` and `worldSafeExecuteJavaScript` webPreferences are enabled */
	isContextIsolation: boolean;

	/** Tells if `isSandbox` webPreference is enabled */
	isSandbox: boolean;

	/** Tells if `isEnableRemoteModule` webPreference is enabled */
	isEnableRemoteModule: boolean;

	/** Tells if we should open dev tools */
	isOpenDevTools: boolean;

	thumbnailImgSize: number;
}


