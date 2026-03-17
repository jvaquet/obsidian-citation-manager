import { App, FileSystemAdapter } from "obsidian";


export enum MyLiteratureTags {
    BIB_VALIDATED = 'literature/bib-validated',
    UNREAD = 'literature/unread',
    READ = 'literature/read'
};

export enum MyLiteratureFrontmatter {
    IS_LITERATURE_NOTE = 'my_literature_note',
    PDF_PATH = 'pdf',
    BIB_PATH = 'bibtex',
    TITLE = 'title',
    AUTHOR = 'author',
    YEAR = 'year',
    DOI = 'doi',
    AUTHORS = 'authors'
}

export enum MyLiteraturePaths {
    NOTES = 'literature',
    PDFS = 'literature/attachments/pdf',
    BIB = 'literature/attachments/bib',
    JPG = 'literature/attachments/figures'
}

export const getNewLiteratureNoteContents = (citekey: string, title: string) => `# [[${citekey}.pdf|${title}]]\n`

export const getPdf2AnnotsExecutable = (app: App) => (app.vault.adapter as FileSystemAdapter).getFullPath('./.obsidian/plugins/obsidian-link-aliases/pdfannots2json');

export const PATH_TMP = '/tmp/obsidian';

export const SECTION_HEADER_FIGURES = 'Figures';
export const SECTION_HEADER_MENTIONS = 'Mentions';