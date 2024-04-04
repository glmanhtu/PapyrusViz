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