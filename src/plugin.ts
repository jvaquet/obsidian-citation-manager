import { Plugin } from 'obsidian';
import { getLinkDecorationsStateField } from './link-decorations.field';
import { Prec } from '@codemirror/state';

import { commandCheckBib, commandExportBib, commandMarkPaperRead, commandMarkPaperUnread, commandOpenBib, commandOpenPaperPDF, commandUpdateBib } from 'src/commands'
import { getLinkDisplayName } from './functions';




export class SmartLinkAliasPlugin extends Plugin {

	async onload() {

		// Enable opening bib files
		this.registerExtensions(['bib'], 'markdown')


		this.addCommand(commandUpdateBib(this.app))
		this.addCommand(commandMarkPaperRead(this.app))
		this.addCommand(commandMarkPaperUnread(this.app))
		this.addCommand(commandOpenPaperPDF(this.app))
		this.addCommand(commandOpenBib(this.app))
		this.addCommand(commandCheckBib(this.app))
		this.addCommand(commandExportBib(this.app))


		// Register StateField Code Mirror extension for showing links on edit mode
		this.registerEditorExtension(Prec.high(getLinkDecorationsStateField(this)));
		
		// Register Markdown Post Processor to update links on reading mode
		this.registerMarkdownPostProcessor((el, ctx) => {
			const internalLinks = el.querySelectorAll("a.internal-link");

			internalLinks.forEach(async (link) => {
				const href = link.getAttribute("href");
				if (!href) return;
				if (!link.textContent) return;

				link.textContent = getLinkDisplayName(href, link.textContent, this.app) ?? link.textContent;
			});
		});
	}

}

