

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
    BIB = 'literature/attachments/bib'
}

export const getNewLiteratureNoteContents = (citekey: string, title: string) => `# [[${citekey}.pdf|${title}]]\n`