export type Progress = {
	percentage: number,
	title: string,
	description: string
}


export interface IMessage<R> {
	status: string,
	payload: R | string,
}


export class Message<R> implements IMessage<R> {

	status: string;
	payload: R | string;

	public constructor(status: string, payload: R) {
		this.status = status;
		this.payload = payload;
	}

	public static success<R>(payload: R) : IMessage<R> {
		return new Message<R>('success', payload);
	}

	public static warning<R>(payload: R) : IMessage<R> {
		return new Message<R>('warning', payload);
	}

	public static complete(message: string) : IMessage<string> {
		return new Message<string>('complete', message);
	}

	public static error(message: string): IMessage<string> {
		return new Message<string>('error', message);
	}
}