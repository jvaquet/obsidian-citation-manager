import { Command, App, parseFrontMatterEntry, parseFrontMatterTags, Modal, Editor, MarkdownView, MarkdownFileInfo } from 'obsidian';
import { PDFSelectionModal, BibEditModal, chainBibEditModals, ExportCitationModal } from 'src/modals';
import { collectBacklinkMentions, getLinkedLiteratureNotes, importPDFFigures, isLiteratureNote, openPDFExternal } from 'src/functions';
import { CitationManagerTags, CitationManagerFrontmatter } from './config';
import { CitationManagerPlugin } from './plugin';


export const commandMarkPaperRead : (app: App) => Command = (app) => { 
    return {
        id: 'citation-manager-mark-read',
        name: 'Mark paper as read',
        checkCallback: (checking) => {
			const activeFile = app.workspace.getActiveFile();
            
			if(!isLiteratureNote(app, activeFile))
				return false;

			const frontmatter = app.metadataCache.getFileCache(activeFile)?.frontmatter;
			const tags = parseFrontMatterTags(frontmatter) ?? [];
            
			const isRead = tags.includes('#' + CitationManagerTags.READ);

			if (checking)
				return !isRead;

            app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                const tags = frontmatter.tags ?? [];
                const newTags = tags.filter((t: string) => t !== CitationManagerTags.UNREAD);
                newTags.push(CitationManagerTags.READ);
                frontmatter.tags = newTags;
            })
            return true;
        }
    }
}

export const commandMarkPaperUnread : (app: App) => Command = (app) => {
    return {
		id: 'citation-manager-mark-unread',
		name: 'Mark paper as unread',
		checkCallback: (checking) => {
			const activeFile = app.workspace.getActiveFile();
            
			if(!isLiteratureNote(app, activeFile))
				return false;

			const frontmatter = app.metadataCache.getFileCache(activeFile)?.frontmatter;
			const tags = parseFrontMatterTags(frontmatter) ?? [];
			const isUnread = tags.includes('#' + CitationManagerTags.UNREAD);

			if (checking)
				return !isUnread;

			app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
				const tags = frontmatter.tags ?? [];
				const newTags = tags.filter((t: string) => t !== CitationManagerTags.READ);
				newTags.push(CitationManagerTags.UNREAD);
				frontmatter.tags = newTags;
			});

			return true;
		}
	}
}

export const commandOpenPaperPDF : (app: App) => Command = (app) => { 
    return {
		id: 'citation-manager-open-pdf',
		name: 'Open paper PDF',
		checkCallback: (checking) => {
			const activeFile = app.workspace.getActiveFile();
            
            if (isLiteratureNote(app, activeFile)) {
                if (checking)
                    return true;

                const metadata = app.metadataCache.getFileCache(activeFile);
                const pdfPath = parseFrontMatterEntry(metadata?.frontmatter, CitationManagerFrontmatter.PDF_PATH);
                openPDFExternal(app, pdfPath);
            }

            const linkedLiteratureNotes = getLinkedLiteratureNotes(app, activeFile);
            if (linkedLiteratureNotes.length == 0)
                return false;

            if (!checking)
                new PDFSelectionModal(app, linkedLiteratureNotes).open();
			return true;
		}
	}
}

export const commandOpenBib : (app : App) => Command = (app) => {
    return {
		id: 'citation-manager-open-bib',
		name: 'Open paper bib citation',
		checkCallback: (checking) => {
            const activeFile = app.workspace.getActiveFile();
            
            if (!isLiteratureNote(app, activeFile))
                return false;

            if (checking)
                return true;

            const metadata = app.metadataCache.getFileCache(activeFile);
            const bibPath = parseFrontMatterEntry(metadata?.frontmatter, CitationManagerFrontmatter.BIB_PATH);
			const bibfile = app.vault.getFileByPath(bibPath);
            if (bibfile)
			    app.workspace.getLeaf(true).openFile(bibfile);
		}
    }
}

export const commandUpdateBib : (app : App) => Command = (app) => {
    return {
		id: 'citation-manager-update-bib',
		name: 'Update paper bib citation',
		checkCallback: (checking) => {
            const activeFile = app.workspace.getActiveFile();
            
            if (!isLiteratureNote(app, activeFile))
                return false;

            if (checking)
                return true;

            new BibEditModal(app, activeFile).open()

            return true;
		}
	}
}

export const commandCheckBib : (app : App) => Command = (app) => {
    return {
		id: 'citation-manager-check-citations',
		name: 'Check bib citations',
		checkCallback: (checking) => {
            const activeFile = app.workspace.getActiveFile();

            if (isLiteratureNote(app, activeFile))
                return false;

            const linkedLiteratureNotes = getLinkedLiteratureNotes(app, activeFile);
            if (linkedLiteratureNotes.length == 0)
                return false;

            if (checking)
                return true;

            const literatureNotes = linkedLiteratureNotes.filter((literatureNote) => {
                const frontmatter = app.metadataCache.getFileCache(literatureNote)?.frontmatter;
                const tags = parseFrontMatterTags(frontmatter) ?? [];
                console.log(tags)
                return !tags.contains(`#${CitationManagerTags.BIB_VALIDATED}`);
            });

            if (literatureNotes.length == 0)
                new Modal(app)
                    .setTitle('All citations are validated!')
                    .open();

            chainBibEditModals(app, literatureNotes);
            return true;
		}
	}
}

export const commandExportBib : (app : App) => Command = (app) => {
    return {
		id: 'citation-manager-export-citations',
		name: 'Export bib citations',
		checkCallback: (checking) => {
            const activeFile = app.workspace.getActiveFile();

            const linkedLiteratureNotes = getLinkedLiteratureNotes(app, activeFile);
            if (linkedLiteratureNotes.length == 0)
                return false;

            if (checking)
                return true;

            new Promise(async (resolve) => {
                const bibliographyEntries = await Promise.all(linkedLiteratureNotes.map(async (literatureNote) => {
                    const frontmatter = app.metadataCache.getFileCache(literatureNote)?.frontmatter;
                    const bibPath = parseFrontMatterEntry(frontmatter, CitationManagerFrontmatter.BIB_PATH);
                    const bibfile = app.vault.getFileByPath(bibPath);
                    if (!bibfile)
                        return '';

                    const bibContents = await app.vault.cachedRead(bibfile);
                    return bibContents;
                }));

                const bibliography = bibliographyEntries.join('\n\n');
                
                new ExportCitationModal(app, bibliography)
                    .open();

                resolve(null);
            });            
		}
	}
}

export const commandZoteroServerStart : (plugin : CitationManagerPlugin) => Command = (plugin) => {
    return {
		id: 'citation-manager-zotero-server-start',
		name: 'Zotero server start',
		checkCallback: (checking) => {
			if (checking)
				return !plugin.zoteroServer.running;
			plugin.zoteroServer.start();
		}
	}
}

export const commandZoteroServerStop : (plugin : CitationManagerPlugin) => Command = (plugin) => {
	return {
		id: 'citation-manager-zotero-server-stop',
		name: 'Zotero server stop',
		checkCallback: (checking) => {
			if (checking)
				return plugin.zoteroServer.running;
			plugin.zoteroServer.stop();
		}
	}
}


export const commandImportPDFFigures : (app : App) => Command = (app) => {
    return {
		id: 'citation-manager-import-pdf-figures',
		name: 'Import figures from paper PDF',
		editorCheckCallback: (checking: boolean, editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {
            const activeFile = app.workspace.getActiveFile();
            
            if (!isLiteratureNote(app, activeFile))
                return false;

            if (checking)
                return true;

            importPDFFigures(app, editor, activeFile);
		}
    }
}

export const commandCollectMentions : (app : App) => Command = (app) => {
    return {
		id: 'citation-manager-collect-backlinks',
		name: 'Collect paper backlink mentions',
		editorCheckCallback: (checking: boolean, editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {
            const activeFile = app.workspace.getActiveFile();
            
            if (!isLiteratureNote(app, activeFile))
                return false;

            if (checking)
                return true;

            collectBacklinkMentions(app, editor, activeFile);
		}
    }
}