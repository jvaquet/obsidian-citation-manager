import { App, ButtonComponent, FuzzySuggestModal, Modal, parseFrontMatterEntry, Setting, TextAreaComponent, TextComponent, TFile } from "obsidian";
import { cbValidateBib, openPDFExternal, setBibPath } from 'src/functions';
import { CitationManagerFrontmatter, CitationManagerPaths } from "./config";


export class PDFSelectionModal extends FuzzySuggestModal<TFile> {

    literatureNotes: TFile[];

    constructor(app: App, literatureNotes: TFile[]) {
        super(app);
        this.literatureNotes = literatureNotes;
    }

    getItems(): TFile[] {
        return this.literatureNotes
    }

    getItemText(file: TFile): string {
        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
        const title = parseFrontMatterEntry(frontmatter, CitationManagerFrontmatter.TITLE) ?? file.basename;
        const author = parseFrontMatterEntry(frontmatter, CitationManagerFrontmatter.AUTHOR) ?? 'Unknown';
        const year = parseFrontMatterEntry(frontmatter, CitationManagerFrontmatter.YEAR) ?? '';
        return `${title} (${author} ${year})`;
    }

    onChooseItem(file: TFile, evt: MouseEvent | KeyboardEvent) {
        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
        const pdfPath = parseFrontMatterEntry(frontmatter, CitationManagerFrontmatter.PDF_PATH);
        openPDFExternal(this.app, pdfPath);
    }
}

export const chainBibEditModals = async (app: App, literatureNotes: TFile[]): Promise<void> => {
    for (const literatureNote of literatureNotes) {
        await new Promise((resolve) => {
            new BibEditModal(app, literatureNote, () => resolve(null)).open();
        })  
    }
}

export class BibEditModal extends Modal {

    literatureNote : TFile;
    cbClose: (() => void) | undefined;

	constructor(app: App, literatureNote: TFile, cbClose?: () => void) {
		super(app);
        this.setTitle('Edit Citation')
        this.literatureNote = literatureNote;
        this.cbClose = cbClose
    }

	async onOpen() {
        let {contentEl} = this;
		contentEl.empty();

        const metadata = this.app.metadataCache.getFileCache(this.literatureNote);
        const frontmatter = metadata?.frontmatter;
        const title = parseFrontMatterEntry(frontmatter, CitationManagerFrontmatter.TITLE) ?? this.literatureNote.basename;
        const author = parseFrontMatterEntry(frontmatter, CitationManagerFrontmatter.AUTHOR) ?? 'Unknown';
        const year = parseFrontMatterEntry(frontmatter, CitationManagerFrontmatter.YEAR) ?? '';
        const fullTitle =  `${title} (${author} ${year})`;
        const citekey = this.literatureNote.basename;
        const tagValidated = cbValidateBib(this.app, this.literatureNote);



        let bibPath: string | null = parseFrontMatterEntry(metadata?.frontmatter, CitationManagerFrontmatter.BIB_PATH);
        if (!bibPath) {
            bibPath = CitationManagerPaths.BIB + '/' + citekey + '.bib';
            setBibPath(this.app, this.literatureNote, bibPath);
        }

		const bibfile = this.app.vault.getFileByPath(bibPath) ??
            await this.app.vault.create(bibPath, '');


        const saveBib = (content: string) => {
            this.app.vault.modify(bibfile, content);
        }


        const bibContents = await this.app.vault.cachedRead(bibfile);

        // Header
        const headingEl = contentEl.createEl('h1', { text: fullTitle });
        headingEl.style.userSelect = 'text';

        const citekeyEl = contentEl.createEl('p', { text: 'Citekey: ' + citekey });
        citekeyEl.style.userSelect = 'text';

        // Textarea editor
        const editorEl = contentEl.createEl('textarea');
        editorEl.value = bibContents
        editorEl.style.width = '100%'
        editorEl.rows = 30
        editorEl.style.resize = 'vertical'

        // Buttons
        const buttonContainerEl = contentEl.createDiv();
        buttonContainerEl.style.display = "flex";
        buttonContainerEl.style.gap = "10px";
        buttonContainerEl.style.marginTop = "10px";

        const btnCancel = buttonContainerEl.createEl('button')
        btnCancel.textContent = 'Cancel'
        btnCancel.onclick = () => {
            this.close()
        }

        const spacerEl = buttonContainerEl.createDiv()
        spacerEl.style.width = '100%'

        const btnSaveClose = buttonContainerEl.createEl('button')
        btnSaveClose.textContent = 'Save and Close'
        btnSaveClose.onclick = () => {
            saveBib(editorEl.value)
            this.close()
        }

        const btnConfirm = buttonContainerEl.createEl('button')
        btnConfirm.textContent = 'Save and Confirm'
        btnConfirm.classList.add('mod-cta')
        btnConfirm.onclick = () => {
            saveBib(editorEl.value)
            tagValidated()
            this.close()
        }
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
        if (this.cbClose)
            this.cbClose();
	}

}


export class ExportCitationModal extends Modal {

    content : string;

	constructor(app: App, content: string) {
		super(app);
        this.setTitle('Export Citations')
        this.content = content;
    }

	async onOpen() {
        let {contentEl} = this;
		contentEl.empty();

        const textarea = contentEl.createEl('textarea', { text: this.content });
        textarea.style.width = '100%';
        textarea.rows = 30;
        textarea.style.resize = 'vertical';
        textarea.disabled = true;
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}

}


export const confirmOverride = async (app: App, message: string) => {
    const override: boolean = await new Promise((resolve) => {
        new ConfirmOverrideModal(app, message, resolve).open();
    });
    return override;
}

class ConfirmOverrideModal extends Modal {

    private onSubmit: (result: boolean) => void;
    private message: string;

    constructor(app: App, message: string, onSubmit: (result: boolean) => void) {
        super(app);
        this.onSubmit = onSubmit;
        this.message = message;
    }

    onOpen() {
        const { contentEl } = this;

        // Title / message
        contentEl.createEl("h2", { text: this.message });

        // Buttons container
        new Setting(contentEl)
        .addButton(btn => btn
            .setButtonText('Overwrite')
            .onClick(() => {
            this.onSubmit(true);
            this.close();
            }))
        .addButton(btn => btn
            .setButtonText('Abort')
            .setCta()
            .onClick(() => {
            this.onSubmit(false);
            this.close();
            }));
    }

    onClose() {
        this.onSubmit(false);
        this.contentEl.empty();
    }
}