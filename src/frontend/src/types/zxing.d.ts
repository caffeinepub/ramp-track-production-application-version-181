// Type definitions for ZXing Browser library loaded from CDN
declare global {
  interface Window {
    ZXingBrowser?: {
      BrowserMultiFormatReader: new (hints?: Map<any, any>) => {
        decodeFromCanvas(canvas: HTMLCanvasElement): { text: string; getText(): string };
        decodeFromImageElement(element: HTMLImageElement): Promise<{ text: string; getText(): string }>;
        decodeFromVideoElement(element: HTMLVideoElement): Promise<{ text: string; getText(): string }>;
        decodeFromVideoDevice(
          deviceId: string | undefined,
          videoElement: HTMLVideoElement,
          callback: (result: { text: string } | null, error: any) => void
        ): Promise<{ stop: () => void }>;
        reset(): void;
      };
      BrowserQRCodeReader: new () => {
        decodeFromCanvas(canvas: HTMLCanvasElement): { text: string; getText(): string };
        decodeFromImageElement(element: HTMLImageElement): Promise<{ text: string; getText(): string }>;
        decodeFromVideoElement(element: HTMLVideoElement): Promise<{ text: string; getText(): string }>;
        decodeFromVideoDevice(
          deviceId: string | undefined,
          videoElement: HTMLVideoElement,
          callback: (result: { text: string } | null, error: any) => void
        ): Promise<{ stop: () => void }>;
        reset(): void;
      };
    };
  }
}

export {};
