import { App, FileSystemAdapter } from "obsidian";


export enum CitationManagerTags {
    BIB_VALIDATED = 'literature/bib-validated',
    UNREAD = 'literature/unread',
    READ = 'literature/read'
};

export enum CitationManagerFrontmatter {
    IS_LITERATURE_NOTE = 'literature_note',
    PDF_PATH = 'pdf',
    BIB_PATH = 'bib',
    TITLE = 'title',
    AUTHOR = 'author',
    YEAR = 'year',
    DOI = 'doi',
    AUTHORS = 'authors'
}

export enum CitationManagerPaths {
    NOTES = '20 Literature',
    PDFS = '20 Literature/attachments/pdf',
    BIB = '20 Literature/attachments/bib',
    JPG = '20 Literature/attachments/figures'
}

export const getNewLiteratureNoteContents = (citekey: string, title: string) => `# [[${citekey}.pdf|${title}]]\n`

export const getPdf2AnnotsExecutable = (app: App) => (app.vault.adapter as FileSystemAdapter).getFullPath('./.obsidian/plugins/obsidian-link-aliases/pdfannots2json');

export const PATH_TMP = '/tmp/obsidian';

export const SECTION_HEADER_FIGURES = 'Figures';
export const SECTION_HEADER_MENTIONS = 'Mentions';