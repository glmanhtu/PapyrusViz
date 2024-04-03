import { IMessage } from 'shared-lib';

export abstract class BaseHandler {
	private routes: Map<string, (payload: unknown) => Promise<unknown>>;
	private continuousHandlers: Map<string, (payload: unknown, reply: (message: IMessage<unknown>) => void) => Promise<void>>;


	constructor() {
		this.routes = new Map();
		this.continuousHandlers = new Map();
	}

	protected addRoute(action: string, method: (payload: unknown) => Promise<unknown>): void {
		this.routes.set(action, method);
	}

	protected addContinuousRoute(action: string, method: (payload: unknown, reply: (message: IMessage<unknown>) => void) => Promise<void>): void {
		this.continuousHandlers.set(action, method);
	}

	public getRoutes(): Map<string, (payload: unknown) => Promise<unknown>> {
		return this.routes;
	}

	public getContinuousHandlers(): Map<string, (payload: unknown, reply: (message: IMessage<unknown>) => void) => Promise<void>> {
		return this.continuousHandlers;
	}
}