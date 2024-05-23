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

import { WindowApi } from './apis/window-api';
export * from './apis/window-api';
export * from './models/config/app-config';
export * from './models/dialog/file-dialog';
export * from './models/common';
export * from './models/project';
export * from './models/category';
export * from './models/asssembling';
export * from './models/context';
export * from './models/img';
export * from './models/matching';
export * from './extras-channels';
export * from './models/app';

declare global {
	// Global augmentation of the `Window` interface
	interface Window {
		api: WindowApi;
	}
}
