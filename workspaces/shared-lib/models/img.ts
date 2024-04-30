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

export type ThumbnailRequest = {
	projectPath: string,
	filter: string,
	categoryId: number,
	page: number,
	perPage: number
}


export type ImageRequest = {
	projectPath: string,
	imgId: number
}

export type Thumbnail = {
	imgId: number,
	path: string,
	imgName: string,
	score?: number,
	rank?: number,
	orgImgWidth: number,
	orgImgHeight: number
}

export type ThumbnailResponse = {
	thumbnails: Thumbnail[]
}

export type ImgDto = {
	id: number,
	name: string,
	path: string,
	fragment: string,
	width: number,
	height: number,
	categoryId: number
}

export type SegmentationPoint = {
	x: number,
	y: number,
	type: number
}

export type ImgSegmentationRequest = {
	imgId: number,
	projectPath: string,
	points: SegmentationPoint[]
}