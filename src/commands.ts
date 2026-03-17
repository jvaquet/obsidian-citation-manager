import { Command, App, parseFrontMatterEntry, parseFrontMatterTags, Modal, Editor, MarkdownView, MarkdownFileInfo } from 'obsidian';
import { PDFSelectionModal, BibEditModal, chainBibEditModals, ExportCitationModal } from 'src/modals';
import { collectBacklinkMentions, getLinkedLiteratureNotes, importPDFFigures, isLiteratureNote, openPDFExternal } from 'src/functions';
import { MyLiteratureTags, MyLiteratureFrontmatter } from './config';
import { SmartLinkAliasPlugin } from './plugin';


export const commandMarkPaperRead : (app: App) => Command = (app) => { 
    return {
        id: 'mark-read',
        name: 'Mark Paper as Read',
        checkCallback: (checking) => {
			const activeFile = app.workspace.getActiveFile();
            
			if(!isLiteratureNote(app, activeFile))
				return false;

			const frontmatter = app.metadataCache.getFileCache(activeFile)?.frontmatter;
			const tags = parseFrontMatterTags(frontmatter) ?? [];
            
			const isRead = tags.includes('#' + MyLiteratureTags.READ);

			if (checking)
				return !isRead;

            app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                const tags = frontmatter.tags ?? [];
                const newTags = tags.filter((t: string) => t !== MyLiteratureTags.UNREAD);
                newTags.push(MyLiteratureTags.READ);
                frontmatter.tags = newTags;
            })
            return true;
        }
    }
}

export const commandMarkPaperUnread : (app: App) => Command = (app) => {
    return {
		id: 'mark-unread',
		name: 'Mark Paper as Unread',
		checkCallback: (checking) => {
			const activeFile = app.workspace.getActiveFile();
            
			if(!isLiteratureNote(app, activeFile))
				return false;

			const frontmatter = app.metadataCache.getFileCache(activeFile)?.frontmatter;
			const tags = parseFrontMatterTags(frontmatter) ?? [];
			const isUnread = tags.includes('#' + MyLiteratureTags.UNREAD);

			if (checking)
				return !isUnread;

			app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
				const tags = frontmatter.tags ?? [];
				const newTags = tags.filter((t: string) => t !== MyLiteratureTags.READ);
				newTags.push(MyLiteratureTags.UNREAD);
				frontmatter.tags = newTags;
			});

			return true;
		}
	}
}

export const commandOpenPaperPDF : (app: App) => Command = (app) => { 
    return {
		id: 'open-pdf',
		name: 'Open PDF',
		checkCallback: (checking) => {
			const activeFile = app.workspace.getActiveFile();
            
            if (isLiteratureNote(app, activeFile)) {
                if (checking)
                    return true;

                const metadata = app.metadataCache.getFileCache(activeFile);
                const pdfPath = parseFrontMatterEntry(metadata?.frontmatter, MyLiteratureFrontmatter.PDF_PATH);
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
		id: 'open-bib',
		name: 'Open bib',
		checkCallback: (checking) => {
            const activeFile = app.workspace.getActiveFile();
            
            if (!isLiteratureNote(app, activeFile))
                return false;

            if (checking)
                return true;

            const metadata = app.metadataCache.getFileCache(activeFile);
            const bibPath = parseFrontMatterEntry(metadata?.frontmatter, MyLiteratureFrontmatter.BIB_PATH);
			const bibfile = app.vault.getFileByPath(bibPath);
            if (bibfile)
			    app.workspace.getLeaf(true).openFile(bibfile);
		}
    }
}

export const commandUpdateBib : (app : App) => Command = (app) => {
    return {
		id: 'update-bib',
		name: 'Update bib Citation',
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
		id: 'check-citations',
		name: 'Check Citations',
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
                return !tags.contains(`#${MyLiteratureTags.BIB_VALIDATED}`);
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
		id: 'export-citations',
		name: 'Export Citations',
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
                    const bibPath = parseFrontMatterEntry(frontmatter, MyLiteratureFrontmatter.BIB_PATH);
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

export const commandZoteroServerStart : (plugin : SmartLinkAliasPlugin) => Command = (plugin) => {
    return {
		id: 'zotero-server-start',
		name: 'Zotero Start',
		checkCallback: (checking) => {
			if (checking)
				return !plugin.zoteroServer.running;
			plugin.zoteroServer.start();
		}
	}
}

export const commandZoteroServerStop : (plugin : SmartLinkAliasPlugin) => Command = (plugin) => {
	return {
		id: 'zotero-server-stop',
		name: 'Zotero Stop',
		checkCallback: (checking) => {
			if (checking)
				return plugin.zoteroServer.running;
			plugin.zoteroServer.stop();
		}
	}
}


export const commandImportPDFFigures : (app : App) => Command = (app) => {
    return {
		id: 'import-pdf-figures',
		name: 'Import PDF figures',
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
		id: 'collect-backlinks',
		name: 'Collect Backlink Notes',
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