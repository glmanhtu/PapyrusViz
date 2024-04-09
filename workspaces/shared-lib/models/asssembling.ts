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

import { ImgDto } from './img';

export type AssemblingDTO = {
	id: number,
	name: string,
	group: string,
	createdAt: string
}


export type Transforms = {
	zIndex: number,
	top: number,
	left: number,
	scale: number,
	rotation: number
}


export type AssemblingImage = {
	img: ImgDto,
	transforms: Transforms
}

export type GetAssemblingRequest = {
	projectPath: string,
	assemblingId: number
}

export type AssemblingImageRequest = {
	projectPath: string,
	assemblingId: number,
	imageId: number,
}

export type AssemblingImageChangeRequest = {
	projectPath: string,
	assemblingId: number,
	imageId: number,
	transforms: Transforms
}

export type AssemblingExportRequest = {
	projectPath: string,
	assemblingId: number,
	outputFile: string
}