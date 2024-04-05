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