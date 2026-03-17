import { App, CachedMetadata, Editor, FileSystemAdapter, TFile, parseFrontMatterEntry } from 'obsidian';
import { getNewLiteratureNoteContents, getPdf2AnnotsExecutable, MyLiteratureFrontmatter, MyLiteraturePaths, MyLiteratureTags, PATH_TMP, SECTION_HEADER_FIGURES } from './config';

import * as fs from "fs/promises";
import { confirmOverride } from './modals';
import { request } from 'https';
import { execa } from 'execa';
import * as path from 'path';

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

export const getLinkDisplayName = (href: string, displayText: string, app: App) => {
	// Get the note instance that best matches the given href
	const noteFile = app.metadataCache.getFirstLinkpathDest(`${href}.md`, "");

    if (!isLiteratureNote(app, noteFile))
        return;

	// Get the notes frontmatter from its metadata
	const frontmatter = app.metadataCache.getFileCache(noteFile)?.frontmatter;

    const title = parseFrontMatterEntry(frontmatter, 'title');
    const author = parseFrontMatterEntry(frontmatter, 'author');
    const year = parseFrontMatterEntry(frontmatter, 'year');

    switch(displayText) {
        case '~full':
            return `${title} (${author} ${year})`;
        case '~title':
            return title;
        default:
            return `${author} (${year})`;
    }
}

export 	const getCitekey = (authors: any, year: number, title: string) => {
	const stopWords = ['a', 'ab', 'aboard', 'about', 'above', 'across', 'after', 'against', 'al', 'along', 'amid', 'among', 'an', 'and', 'anti', 'around', 'as', 'at', 'before', 'behind', 'below', 'beneath', 'beside', 'besides', 'between', 'beyond', 'but', 'by', 'd', 'da', 'das', 'de', 'del', 'dell', 'dello', 'dei', 'degli', 'della', 'dell', 'delle', 'dem', 'den', 'der', 'des', 'despite', 'die', 'do', 'down', 'du', 'during', 'ein', 'eine', 'einem', 'einen', 'einer', 'eines', 'el', 'en', 'et', 'except', 'for', 'from', 'gli', 'i', 'il', 'in', 'inside', 'into', 'is', 'l', 'la', 'las', 'le', 'les', 'like', 'lo', 'los', 'near', 'nor', 'of', 'off', 'on', 'onto', 'or', 'over', 'past', 'per', 'plus', 'round', 'save', 'since', 'so', 'some', 'sur', 'than', 'the', 'through', 'to', 'toward', 'towards', 'un', 'una', 'unas', 'under', 'underneath', 'une', 'unlike', 'uno', 'unos', 'until', 'up', 'upon', 'versus', 'via', 'von', 'while', 'with', 'within', 'without', 'yet', 'zu', 'zum'];
			
	const citekeyAuthor = authors[0]?.lastName.toLowerCase() ?? 'unknown';
	const citeKeyTitle = title
		.replace(/<\/?(?:i|b|sc|nc|code|span[^>]*)>|["]/ig, '')
		.replace(/[/:]/g, ' ')
		.split(' ')
		.filter((word: string) => !stopWords.contains(word.toLowerCase()))
		.map((word: string) => word.replace(/\p{Pe}|\p{Pf}|\p{Pi}|\p{Po}|\p{Ps}/ug, ''))
		.map((word: string) => word.replace(/\p{Pd}|\u2500|\uFF0D|\u2015/ug, ''))
		.filter((word: string) => word)
		.map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
		.slice(0, 3)
		.join('');

	const citekey = `${citekeyAuthor}${year}${citeKeyTitle}`;
	return citekey;
}

export const copyPdf = async (app: App, source: string, destination: string) => {

    const fileExists = app.vault.getFileByPath(destination);
    if (fileExists) {
        if(!await confirmOverride(app, `PDF ${destination} already exists. Overwrite?`))
            return;
        app.vault.delete(fileExists);
    }

    const pdfData = await fs.readFile(source);
    // @ts-ignore
    await app.vault.createBinary(destination, pdfData);
}

const queryBibtex = async (doi: string) => {
	const apiPath = `/api/rest_v1/data/citation/bibtex/${encodeURIComponent(doi)}`;

	const options = {
		hostname: "en.wikipedia.org",
		port: 443,
		path: apiPath,
		method: "GET",
		headers: {
			'accept': 'application/json',
			'charset': 'utf-8',
			'user-agent': 'Obsidian'
		}
	};

	const bibtexContent: string = await new Promise((resolve) => {
		const req = request(options, (res) => {
            let body = '';

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on("end", () => {
                if(res.statusCode == 200)
                    resolve(body);
                resolve(`HTTP error: ${res.statusCode}`);
            });

            req.on('error', (e) => {
                resolve(`Connection error: ${e}`);
            });
        });
	    req.end();
	});
	return bibtexContent;
}

export const writeBib = async (app: App, doi: string, destination: string) => {
    // TODO: Update citekey
    const bibContentPromise = queryBibtex(doi);

    const fileExists = app.vault.getFileByPath(destination);
    if (fileExists) {
        if(!await confirmOverride(app, `Citation ${destination} already exists. Overwrite?`))
            return;
        app.vault.delete(fileExists);
    }

    const bibContent = await bibContentPromise;

	await app.vault.create(destination, bibContent);
}

export const createNewLiteratureNote = async (app: App, newFrontmatter: any, destination: string, contents: string) => {

    const fileExists = app.vault.getFileByPath(destination);
    if (fileExists) {
        if(!await confirmOverride(app, `Literature Note ${destination} already exists. Overwrite?`)) {
	        app.workspace.getLeaf(true).openFile(fileExists);
            return false;
        }
        app.vault.delete(fileExists);
    }

	const literatureNote = await app.vault.create(destination, contents);

    app.fileManager.processFrontMatter(literatureNote, (frontmatter) => {
        for (let frontmatterKey in newFrontmatter) 
            frontmatter[frontmatterKey] = newFrontmatter[frontmatterKey];
	});

	app.workspace.getLeaf(true).openFile(literatureNote);
    return true;
}

export const getHandleZoteroItem = (app: App) => async (event: CustomEvent) => {
    const { item, files, sessionID } = event.detail;

    const title = item.title;
    const year = parseInt(item.date.split('-')[0])
    const authors = item.creators.filter((creator: any) => creator.creatorType == 'author');
    const doi = item.DOI;
    const citekey = getCitekey(authors, year, title);

    const literatureNotePath = `${MyLiteraturePaths.NOTES}/${citekey}.md`;
    const bibtexPath = `${MyLiteraturePaths.BIB}/${citekey}.bib`;
    const pdfPath = `${MyLiteraturePaths.PDFS}/${citekey}.pdf`;

    const newLiteratureNoteContents = getNewLiteratureNoteContents(citekey, title);

    const frontmatterAuthor = authors.length == 0 ? 'Unknown' :
        authors.length == 1 ? authors[0].lastName :
        authors.length == 2 ? `${authors[0].lastName} and ${authors[1].lastName}` :
        `${authors[0].lastName} et al.`;
    const frontmatterAuthorLinks = authors.map((creator: any) =>
        `[[Author ${creator.firstName} ${creator.lastName}]]`
    )

    const newFrontmatter = {
        [MyLiteratureFrontmatter.IS_LITERATURE_NOTE]: true,
        [MyLiteratureFrontmatter.BIB_PATH]: bibtexPath,
        [MyLiteratureFrontmatter.PDF_PATH]: pdfPath,
        [MyLiteratureFrontmatter.TITLE]: title,
        [MyLiteratureFrontmatter.AUTHOR]: frontmatterAuthor,
        [MyLiteratureFrontmatter.YEAR]: year,
        [MyLiteratureFrontmatter.DOI]: doi,
        [MyLiteratureFrontmatter.AUTHORS]: frontmatterAuthorLinks,
        tags: [MyLiteratureTags.UNREAD]
    }

    const pdfFile = files.filter((file: string) => file.endsWith('.pdf'))[0];

    const noteWritten = await createNewLiteratureNote(app, newFrontmatter, literatureNotePath, newLiteratureNoteContents);
    if(!noteWritten)
        return;
            
    await writeBib(app, doi, bibtexPath);
            
    if (pdfFile)
        await copyPdf(app, pdfFile, pdfPath);
}

export const getHandleZoteroAttachment = (app: App) => async (event: CustomEvent) => {}

export const extractImageAnnotations = async (app: App, pdfPath: string) => {
    const pdf2annots = getPdf2AnnotsExecutable(app);
    const fullPdfPath = (app.vault.adapter as FileSystemAdapter).getFullPath(pdfPath);

    const pdf2annotsResults = await execa(pdf2annots, ['-o', PATH_TMP, fullPdfPath]);

    const annotations = JSON.parse(pdf2annotsResults.stdout)
    const imageAnnotations = annotations.map((annotation: any) => {
        return {
            comment: annotation.comment,
            imagePath: annotation.imagePath
        }
    }).filter((annotation: any) => annotation.imagePath);

    return imageAnnotations;
}

export const createFolderIfNotExists = async (app: App, path: string) => {
    if(!app.vault.getFolderByPath(path))
        await app.vault.createFolder(path);
}

export const copyFileToVault = async (app: App, source: string, destination: string, overwrite: boolean) => {

    
    const existingFile = app.vault.getFileByPath(destination);
    if (existingFile) {
        if (overwrite)
            await app.vault.delete(existingFile);
        else
            return null;
    }
    
    const data = await fs.readFile(source);
    // @ts-ignore
    const createdFile = await app.vault.createBinary(destination, data);
    return createdFile;
}

export const replaceEditorSection = (editor: Editor, metadata: CachedMetadata | null, heading: string, headingLevel: number, newContents: string) => {
    const headings = metadata?.headings ?? [];
    const headingsLevel = headings.filter((heading) => heading.level == headingLevel);
    const oldText = editor.getValue();

    let offsetFrom = null;
    let offsetTo = null;

    for (let i = 0; i < headingsLevel.length; i++) {
        if (headingsLevel[i].heading == heading) {
            offsetFrom = headingsLevel[i].position.start.offset
            offsetTo = headingsLevel[i+1]?.position?.start?.offset ?? oldText.length;
        }
    }

    if (offsetFrom && offsetTo) {
        editor.replaceRange(newContents, editor.offsetToPos(offsetFrom), editor.offsetToPos(offsetTo), 'Import Figures');
    } else {
        const newText = oldText + '\n' + newContents;
        editor.setValue(newText);
    }
}

export const importPDFFigures = async (app: App, editor: Editor, activeFile: TFile) => {
    const metadata = app.metadataCache.getFileCache(activeFile);
    const pdfPath = parseFrontMatterEntry(metadata?.frontmatter, MyLiteratureFrontmatter.PDF_PATH);

    const imageAnnotations = await extractImageAnnotations(app, pdfPath);
    const imageAttachmentsPath = path.join(MyLiteraturePaths.JPG, activeFile.basename);

    await createFolderIfNotExists(app, imageAttachmentsPath);

    let newFiguresSection = `## ${SECTION_HEADER_FIGURES}\n`
    for (let imageAnnotation of imageAnnotations) {

        const imgFileName = imageAnnotation.imagePath.split('/').at(-1);
        const imgFilePath = path.join(MyLiteraturePaths.JPG, activeFile.basename, imgFileName);
        const imgFile = await copyFileToVault(app, imageAnnotation.imagePath, imgFilePath, true);

        const imgText = imageAnnotation?.comment?.replace("\\", "\n") ?? 'Figure';

        newFiguresSection += `### ${imgText}\n![[${imgFile?.path}]]\n`;
    }

    replaceEditorSection(editor, metadata, SECTION_HEADER_FIGURES, 2, newFiguresSection);
}