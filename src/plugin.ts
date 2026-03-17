import { Plugin } from 'obsidian';
import { getLinkDecorationsStateField } from './link-decorations.field';
import { Prec } from '@codemirror/state';

import { commandCheckBib, commandCollectMentions, commandExportBib, commandImportPDFFigures, commandMarkPaperRead, commandMarkPaperUnread, commandOpenBib, commandOpenPaperPDF, commandUpdateBib, commandZoteroServerStart, commandZoteroServerStop } from 'src/commands'
import { getHandleZoteroAttachment, getHandleZoteroItem, getLinkDisplayName, writeBib } from './functions';
import { ConnectorServer } from './zotero/zotero-connector-server';


// TODO: Rename plugin
export class CitationManagerPlugin extends Plugin {

	zoteroServer: ConnectorServer;

	async onload() {

		this.zoteroServer = new ConnectorServer(this.app);

		// Register Zotero server event listeners
		const handleZoteroItem = getHandleZoteroItem(this.app);
		const handleZoteroAttachment = getHandleZoteroAttachment(this.app);
        document.addEventListener('zotero-item-received', handleZoteroItem);
        document.addEventListener('zotero-additional-attachments', handleZoteroAttachment);

		this.register(() => {
            document.removeEventListener('zotero-item-received', handleZoteroItem);
            document.removeEventListener('zotero-additional-attachments', handleZoteroAttachment);
        });


		// Enable opening bib files
		this.registerExtensions(['bib'], 'markdown')


		this.addCommand(commandUpdateBib(this.app))
		this.addCommand(commandMarkPaperRead(this.app))
		this.addCommand(commandMarkPaperUnread(this.app))
		this.addCommand(commandOpenPaperPDF(this.app))
		this.addCommand(commandOpenBib(this.app))
		this.addCommand(commandCheckBib(this.app))
		this.addCommand(commandExportBib(this.app))
		this.addCommand(commandImportPDFFigures(this.app))
		this.addCommand(commandCollectMentions(this.app))

		this.addCommand(commandZoteroServerStart(this))
		this.addCommand(commandZoteroServerStop(this))


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

