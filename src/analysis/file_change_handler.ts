import * as vs from "vscode";
import * as path from "path";
import { Analyzer } from "./analyzer";
import * as as from "./analysis_server_types";
import * as util from "../utils";
import { fsPath } from "../utils";

export class FileChangeHandler implements vs.Disposable {
	private disposables: vs.Disposable[] = [];
	private analyzer: Analyzer;
	constructor(analyzer: Analyzer) {
		this.analyzer = analyzer;

		this.disposables.push(
			vs.workspace.onDidOpenTextDocument((td) => this.onDidOpenTextDocument(td)),
			vs.workspace.onDidChangeTextDocument((e) => this.onDidChangeTextDocument(e)),
			vs.workspace.onDidCloseTextDocument((td) => this.onDidCloseTextDocument(td)),
		);
		// Handle already-open files.
		vs.workspace.textDocuments.forEach((td) => this.onDidOpenTextDocument(td));
	}

	public onDidOpenTextDocument(document: vs.TextDocument) {
		if (!util.isAnalyzable(document))
			return;

		const files: { [key: string]: as.AddContentOverlay } = {};

		files[fsPath(document.uri)] = {
			content: document.getText(),
			type: "add",
		};

		this.analyzer.analysisUpdateContent({ files });
	}

	public onDidChangeTextDocument(e: vs.TextDocumentChangeEvent) {
		if (!util.isAnalyzable(e.document))
			return;

		if (e.contentChanges.length === 0) // This event fires for metadata changes (dirty?) so don't need to notify AS then.
			return;

		// TODO: Fix this...
		// HACK: e.document.offsetAt appears to return the wrong offset when there are
		// multiple edits (since it uses the current document state which can include
		// earlier edits, offsetting the values!)
		//   See https://github.com/Microsoft/vscode/issues/10047
		//
		// As a workaround, we just send the full contents if there was more than one edit.

		if (e.contentChanges.length === 1) {
			const files: { [key: string]: as.ChangeContentOverlay } = {};

			files[fsPath(e.document.uri)] = {
				edits: e.contentChanges.map((c) => this.convertChange(e.document, c)),
				type: "change",
			};

			this.analyzer.analysisUpdateContent({ files });
		} else {
			// TODO: Remove this block when the bug is fixed (or we figure out it's not a bug).
			const files: { [key: string]: as.AddContentOverlay } = {};

			files[fsPath(e.document.uri)] = {
				content: e.document.getText(),
				type: "add",
			};

			this.analyzer.analysisUpdateContent({ files });
		}
	}

	public onDidCloseTextDocument(document: vs.TextDocument) {
		if (!util.isAnalyzable(document))
			return;

		const files: { [key: string]: as.RemoveContentOverlay } = {};

		files[fsPath(document.uri)] = {
			type: "remove",
		};

		this.analyzer.analysisUpdateContent({ files });
	}

	private convertChange(document: vs.TextDocument, change: vs.TextDocumentContentChangeEvent): as.SourceEdit {
		return {
			id: "",
			length: change.rangeLength,
			offset: document.offsetAt(change.range.start),
			replacement: change.text,
		};
	}

	public dispose(): any {
		this.disposables.forEach((d) => d.dispose());
	}
}
