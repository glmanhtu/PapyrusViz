import { ImgDto } from './img';

export type AssemblingDTO = {
	id: number,
	name: string,
	group: string,
	imgCount: number,
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

export type AssemblingImageChangeRequest = {
	projectPath: string,
	assemblingId: number,
	imageId: number,
	transforms: Transforms
}

