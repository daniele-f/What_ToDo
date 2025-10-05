export type Mode = 'read' | 'edit';

export type UiOptions = {
  onBeforeMutate?: () => void; // called before any user mutation (for clock jump resets)
};

export type RenderContext = {
  mode: Mode;
  opts: UiOptions;
  enableRowDrag: (el: HTMLElement, rowId: string) => void;
};
