import { App, TFile, parseFrontMatterEntry } from 'obsidian';
import { MyLiteratureFrontmatter, MyLiteratureTags } from './config';

export const openPDFExternal = (app: App, path: string) => {
    const pdfFile = app.vault.getFileByPath(path);
	//@ts-ignore
	app.openWithDefaultApp(pdfFile.path);
}

export const isLiteratureNote = (app: App, file: TFile | null) : file is TFile => {
    if(!file)
        return false;

    const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
    const isLiteratureNote : boolean = parseFrontMatterEntry(frontmatter, MyLiteratureFrontmatter.IS_LITERATURE_NOTE);
    return isLiteratureNote;
}

export const getLinkedLiteratureNotes = (app: App, file: TFile | null) => {
    if(!file)
        return [];

    const metadata = app.metadataCache.getFileCache(file);
    const links = metadata?.links ?? [];

    const linkedLiteratureNotes = links
        .map((link) => app.metadataCache.getFirstLinkpathDest(link.link, file.path))
        .filter((linkedFile) => linkedFile != null)
        .filter((linkedFile) => isLiteratureNote(app, linkedFile));

    return linkedLiteratureNotes;
}

export const cbValidateBib = (app: App, literatureNote: TFile) => () => {
    app.fileManager.processFrontMatter(literatureNote, (frontmatter) => {
        const tags = frontmatter.tags ?? [];
        if (!tags.contains(MyLiteratureTags.BIB_VALIDATED))
            frontmatter.tags.push(MyLiteratureTags.BIB_VALIDATED);
    });
}

export const setBibPath = (app: App, literatureNote: TFile, bibPath: string) => {
    app.fileManager.processFrontMatter(literatureNote, (frontmatter) => {
        frontmatter.bibtex = bibPath;
    });
}

export function getLinkDisplayName(href: string, displayText: string, app: App) {
	// Get the note instance that best matches the given href
	const noteFile = app.metadataCache.getFirstLinkpathDest(`${href}.md`, "");
	if (!(noteFile instanceof TFile)) return;

	// Get the notes frontmatter from its metadata
	const metadata = app.metadataCache.getFileCache(noteFile);
	const frontmatter = metadata?.frontmatter;
	if (!frontmatter) return;

	const displayTitles = frontmatter[MyLiteratureFrontmatter.DISPLAY_NAMES]
	if (!displayTitles) return;

	const displayTitle = displayTitles[displayText.substring(1)] ?? displayTitles['default'];
	if (displayTitle) 
		return displayTitle;

	return displayText
}