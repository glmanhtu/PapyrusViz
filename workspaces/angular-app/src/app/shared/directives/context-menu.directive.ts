import { Directive, Input, HostListener, ElementRef, Renderer2, Output, EventEmitter } from '@angular/core';

@Directive({
	selector: '[appContextMenu]'
})
export class ContextMenuDirective {
	@Input() menuItems: string[] = [];
	@Output() select = new EventEmitter<string>();

	private contextMenuElement: HTMLElement | null;

	constructor(private el: ElementRef, private renderer: Renderer2) {}

	@HostListener('contextmenu', ['$event'])
	onRightClick(event: MouseEvent) {
		event.preventDefault();
		this.closeContextMenu();
		this.createContextMenu(event);
	}

	@HostListener('document:click')
	onClick() {
		this.closeContextMenu();
	}

	private createContextMenu(event: MouseEvent) {
		this.contextMenuElement = this.renderer.createElement('ul');
		this.renderer.setStyle(this.contextMenuElement, 'position', 'absolute');
		this.renderer.setStyle(this.contextMenuElement, 'top', `${event.clientY}px`);
		this.renderer.setStyle(this.contextMenuElement, 'left', `${event.clientX}px`);
		this.renderer.setStyle(this.contextMenuElement, 'background', '#fff');
		this.renderer.setStyle(this.contextMenuElement, 'border', '1px solid #ccc');
		this.renderer.setStyle(this.contextMenuElement, 'list-style', 'none');
		this.renderer.setStyle(this.contextMenuElement, 'padding', '0');
		this.renderer.setStyle(this.contextMenuElement, 'margin', '0');

		this.menuItems.forEach(item => {
			const menuItemElement = this.renderer.createElement('li');
			const text = this.renderer.createText(item);
			this.renderer.appendChild(menuItemElement, text);
			this.renderer.setStyle(menuItemElement, 'padding', '8px 12px');
			this.renderer.setStyle(menuItemElement, 'cursor', 'pointer');
			this.renderer.listen(menuItemElement, 'click', () => {
				this.select.emit(item);
				this.closeContextMenu();
			});
			this.renderer.appendChild(this.contextMenuElement, menuItemElement);
		});

		this.renderer.appendChild(document.body, this.contextMenuElement);
	}

	private closeContextMenu() {
		if (this.contextMenuElement) {
			this.renderer.removeChild(document.body, this.contextMenuElement);
			this.contextMenuElement = null;
		}
	}
}