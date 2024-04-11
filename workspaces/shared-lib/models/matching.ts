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

export enum MatchingType {
	SIMILARITY = 'similarity',
	DISTANCE = 'distance'
}

export enum MatchingMethod {
	NAME = 'name',
	PATH = 'path'
}

export type MatchingDto = {
	projectPath: string,
	matchingName: string,
	matchingFile: string,
	matchingType: MatchingType,
	matchingMethod: MatchingMethod
}

export type MatchingResponse = {
	id: number,
	name: string,
	matrixPath: string,
	matchingType: string,
	matchingMethod: string
}

export type MatchingRequest = {
	projectPath: string,
	matchingId: number
}

export type SimilarityRequest = {
	projectPath: string,
	matchingId: number,
	similarity: number
}

export interface Link {
	source: number;
	target: number;
	similarity: number;
}

export type MatchingImgRequest = {
	projectPath: string,
	categoryId: number,
	matchingId: number,
	imgId: number,
	page: number,
	perPage: number
}