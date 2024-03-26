export interface WindowApi {

	/**
	 * This method is used by the renderer process to send data to the main process and wait to receive the result
	 * @param type used by the renderer to send data and by the main to receive them
	 * @param payload the data sent by the renderer process to the main process
	 */
	send<P, R>(type: string, payload: P): Promise<R>;
}
