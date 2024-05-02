
import * as ort from 'onnxruntime-node';

export type BBox = {
	x_min: number,
	y_min: number,
	x_max: number,
	y_max: number
}

export type EmbeddingInfo = {
	embedding: ort.Tensor,
	width: number,
	height: number,
	scale: number,
}