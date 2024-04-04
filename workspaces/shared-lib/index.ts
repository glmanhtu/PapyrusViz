import { WindowApi } from './apis/window-api';
export * from './apis/window-api';
export * from './models/config/app-config';
export * from './models/dialog/file-dialog';
export * from './models/common';
export * from './models/project';
export * from './models/category';
export * from './models/asssembling';
export * from './models/context';
export * from './models/img';
export * from './models/matching';

declare global {
	// Global augmentation of the `Window` interface
	interface Window {
		api: WindowApi;
	}
}
