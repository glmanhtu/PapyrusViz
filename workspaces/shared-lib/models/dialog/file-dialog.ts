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

export type FileSaveResponse = {
	canceled: boolean,
	filePath?: string
}