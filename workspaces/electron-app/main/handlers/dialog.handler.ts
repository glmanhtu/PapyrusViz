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

import { BaseHandler } from "./base.handler";
import { dialog, OpenDialogOptions } from 'electron';
import { FileDialogRequest, FileDialogResponse, FileSaveResponse } from 'shared-lib';
import { App } from '../components/app';

export class DialogHandler extends BaseHandler {
	constructor() {
		super();
		this.addRoute('dialogs:open-file-folder', this.openFileFolder.bind(this));
		this.addRoute('dialogs:open-file-save', this.openSaveFile.bind(this));
	}

	private async openSaveFile(fileName: string): Promise<FileSaveResponse> {
		return dialog.showSaveDialog({
			defaultPath: fileName
		})
	}

	private async openFileFolder(payload: FileDialogRequest, clientId: number): Promise<FileDialogResponse> {
		// Example response, replace with your actual logic
		const properties: OpenDialogOptions['properties'] = [];
		const filters = [];
		if (payload.isFolder) {
			properties.push('openDirectory')
		} else {
			properties.push('openFile')
		}

		if (payload.allowFolderCreation) {
			properties.push('createDirectory')
		}

		if (payload.isMultiSelect) {
			properties.push('multiSelections')
		}

		if (payload.extensions.length > 0) {
			filters.push({name: 'Data', extensions: payload.extensions})
		}
		return dialog.showOpenDialog(App.getWindow(clientId), {
			properties: properties,
		});
	}
}