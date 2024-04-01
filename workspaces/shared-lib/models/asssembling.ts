import { ImgDto } from './img';

export type AssemblingDTO = {
	id: number,
	name: string,
	group: string,
	isActivated: boolean,
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

export type AssemblingImageRequest = {
	projectPath: string,
	assemblingId: number
}