export abstract class BaseHandler {
	private routes: Map<string, (payload: unknown) => Promise<unknown>>;

	constructor() {
		this.routes = new Map();
	}

	protected addRoute<T, R>(action: string, method: (payload: T) => Promise<R>): void {
		this.routes.set(action, method);
	}

	public getRoutes(): Map<string, (payload: unknown) => Promise<unknown>> {
		return this.routes;
	}
}