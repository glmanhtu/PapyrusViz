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