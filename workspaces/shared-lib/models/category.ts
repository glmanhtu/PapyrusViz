export type CategoryDTO = {
	id: number,
	name: string,
	path: string,
	isActivated: boolean
}

export type CategoryRequest = {
	projectPath: string,
	categoryId: number
}