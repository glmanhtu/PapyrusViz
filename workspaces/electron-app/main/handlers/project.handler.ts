import { BaseHandler } from "./base.handler";
import { IMessage, Message, Progress, ProjectDTO } from 'shared-lib';
import * as fs from 'fs';

export class ProjectHandler extends BaseHandler {
	constructor() {
		super();
		this.addContinuousHandler<ProjectDTO, Progress>('project::create-project', this.creteProject.bind(this));
	}

	private creteProject(payload: ProjectDTO, reply: (message: IMessage<string | Progress>) => void ): void {
		const isProjPathExists = fs.existsSync(payload.path) && fs.lstatSync(payload.path).isDirectory();
		const isDSPathExists = fs.existsSync(payload.dataPath) && fs.lstatSync(payload.dataPath).isDirectory();
		if (isProjPathExists &&  fs.readdirSync(payload.path).length !== 0) {
			reply(Message.error(`Project location: ${payload.path} is not empty!`));
		}
		if (isDSPathExists) {
			reply(Message.error(`Dataset location: ${payload.dataPath} doesn't exists!`));
		}
		reply(Message.success({
			percentage: 0, title: 'Step 1/3 - Creating project', description: 'Writing project information...'
		}));
		if (!isProjPathExists) {
			fs.mkdirSync(payload.path);
		}
	}
}