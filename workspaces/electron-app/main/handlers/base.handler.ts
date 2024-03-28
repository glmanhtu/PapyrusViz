import { IMessage } from 'shared-lib';

export abstract class BaseHandler {
	private routes: Map<string, (payload: unknown) => Promise<unknown>>;
	private continuousHandlers: Map<string, (payload: unknown, reply: (message: IMessage<unknown>) => void) => void>;


	constructor() {
		this.routes = new Map();
		this.continuousHandlers = new Map();
	}

	protected addRoute<T, R>(action: string, method: (payload: T) => Promise<R>): void {
		this.routes.set(action, method);
	}

	protected addContinuousHandler<T, R>(action: string, method: (payload: T, reply: (message: IMessage<R>) => void) => void): void {
		this.continuousHandlers.set(action, method);
	}

	public getRoutes(): Map<string, (payload: unknown) => Promise<unknown>> {
		return this.routes;
	}

	public getContinuousHandlers(): Map<string, (payload: unknown, reply: (message: IMessage<unknown>) => void) => void> {
		return this.continuousHandlers;
	}
}