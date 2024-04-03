import { BaseHandler } from "./base.handler";
import { BrowserWindow, dialog, OpenDialogOptions } from 'electron';
import { FileDialogRequest, FileDialogResponse } from 'shared-lib';

export class DialogHandler extends BaseHandler {
	constructor(private readonly mainWin: BrowserWindow) {
		super();
		this.addRoute('dialogs:open-file-folder', this.openFileFolder.bind(this));
		this.mainWin = mainWin;
	}

	private async openFileFolder(payload: FileDialogRequest): Promise<FileDialogResponse> {
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
		return dialog.showOpenDialog(this.mainWin, {
			properties: properties,
		});
	}
}