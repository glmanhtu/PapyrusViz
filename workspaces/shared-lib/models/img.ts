export type ThumbnailRequest = {
	projectPath: string,
	filter: string,
	categoryId: number,
	page: number,
	perPage: number
}

export type Thumbnail = {
	imgId: number,
	path: string,
	imgName: string
}

export type ThumbnailResponse = {
	thumbnails: Thumbnail[]
}