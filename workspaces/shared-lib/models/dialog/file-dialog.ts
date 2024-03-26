export type FileDialogRequest = {
	isFolder: boolean,
	isMultiSelect: boolean,
	extensions: string[],
	allowFolderCreation: boolean
}

export type FileDialogResponse = {
	canceled: boolean,
	filePaths: string[]
}