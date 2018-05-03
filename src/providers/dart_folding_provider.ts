import { CancellationToken, FoldingContext, FoldingRange, FoldingRangeKind, FoldingRangeProvider, TextDocument } from "vscode";
import { FoldingKind } from "../analysis/analysis_server_types";
import { Analyzer } from "../analysis/analyzer";
import { OpenFileTracker } from "../analysis/open_file_tracker";

export class DartFoldingProvider implements FoldingRangeProvider {
	private analyzer: Analyzer;
	constructor(analyzer: Analyzer) {
		this.analyzer = analyzer;
	}

	public provideFoldingRanges(document: TextDocument, context: FoldingContext, token: CancellationToken): FoldingRange[] {
		const foldingRegions = OpenFileTracker.getFoldingRegionsFor(document.uri);
		if (!foldingRegions)
			return;

		return foldingRegions.map((f) => new FoldingRange(
			document.positionAt(f.offset).line,
			document.positionAt(f.offset + f.length).line,
			this.getKind(f.kind),
		));
	}

	private getKind(kind: FoldingKind): FoldingRangeKind {
		switch (kind) {
			case "COMMENT":
			case "DOCUMENTATION_COMMENT":
				return FoldingRangeKind.Comment;
			case "DIRECTIVES":
				return FoldingRangeKind.Imports;
		}
	}
}
