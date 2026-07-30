// TypeScript's bundled lib.dom.d.ts already declares FileSystemFileHandle /
// FileSystemWritableFileStream (used by the drag-and-drop file API), but
// omits `showSaveFilePicker` -- it's Chromium-only and not on a standards
// track, so lib.dom.d.ts intentionally leaves it out. Feature-detected at
// runtime in hooks/useHlsDownload.ts before ever being called.
interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: {
    description?: string;
    accept: Record<string, string[]>;
  }[];
  excludeAcceptAllOption?: boolean;
}

interface Window {
  // Declared as always-present for typing convenience -- actual presence is
  // feature-detected at runtime (supportsFileSystemAccess()) before any call.
  showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
}
