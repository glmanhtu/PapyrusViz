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

export type OldImg = {
	path: string,
	name: string,
	thumbnails: string,
	width: number,
	height: number,
	format: string
}


export type Transforms = {
	zIndex: number,
	top: number,
	left: number,
	scale: number,
	rotation: number
}


export type OldAssembled = {
	name: string,
	parent: string,
	activated: boolean,
	images: Map<string, Transforms>,
	imagesCount: number,
	createdAt: number
}

export type OldRootDir = {
	available: {name: string, path: string}[],
	selected: string
}

export type OldMatching = {
	matchingName: string,
	matchingFile: string,
	matrixType: string,
	matchingMethod: string
}

export type OldProjectModel = {
	projName: string,
	projPath: string,
	datasetPath: string,
	images: Map<string, OldImg>,
	createdAt: number,
	assembled: Map<string, OldAssembled>,
	assembledCount: number,
	rootDirs: OldRootDir,
	imagesCount: number,
	matching?: OldMatching
}