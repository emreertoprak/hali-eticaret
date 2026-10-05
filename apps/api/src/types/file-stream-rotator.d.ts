declare module 'file-stream-rotator' {
  interface StreamOptions {
    filename: string;
    frequency?: string;
    date_format?: string;
    max_logs?: string;
    verbose?: boolean;
  }
  const FileStreamRotator: { getStream(options: StreamOptions): NodeJS.WritableStream };
  export default FileStreamRotator;
}
