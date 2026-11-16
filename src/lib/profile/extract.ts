import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import yauzl from 'yauzl';
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const PDF = 'application/pdf';
const DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
function checkDocx(data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(data, { lazyEntries: true }, (error, zip) => {
      if (error || !zip) return reject(new Error('Invalid DOCX archive.'));
      let expanded = 0;
      let entries = 0;
      let document = false;
      let types = false;
      let stopped = false;
      const fail = () => {
        if (stopped) return;
        stopped = true;
        zip.close();
        reject(new Error('Invalid or oversized DOCX archive.'));
      };
      zip.on('error', fail);
      zip.on('entry', (entry) => {
        expanded += entry.uncompressedSize;
        entries++;
        if (
          expanded > 20 * 1024 * 1024 ||
          entries > 2000 ||
          entry.generalPurposeBitFlag & 1
        )
          return fail();
        if (entry.fileName === 'word/document.xml') document = true;
        if (entry.fileName === '[Content_Types].xml') types = true;
        zip.readEntry();
      });
      zip.on('end', () => {
        if (stopped) return;
        if (document && types) resolve();
        else reject(new Error('This ZIP file is not a DOCX document.'));
      });
      zip.readEntry();
    });
  });
}
export async function extractResume(data: Buffer, fileName: string) {
  if (!data.length) throw new Error('The uploaded file is empty.');
  if (data.length > MAX_UPLOAD_BYTES)
    throw new Error('Resume must be 5 MB or smaller.');
  let text: string;
  let mimeType: string;
  if (data.subarray(0, 5).toString() === '%PDF-' && /\.pdf$/i.test(fileName)) {
    mimeType = PDF;
    const parser = new PDFParse({ data: new Uint8Array(data) });
    try {
      text = (await parser.getText({ pageJoiner: '' })).text;
    } catch {
      throw new Error(
        'Unable to read this PDF. It may be damaged or password protected.',
      );
    } finally {
      await parser.destroy();
    }
  } else if (
    data.length >= 4 &&
    data.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) &&
    /\.docx$/i.test(fileName)
  ) {
    mimeType = DOCX;
    await checkDocx(data);
    try {
      text = (await mammoth.extractRawText({ buffer: data })).value;
    } catch {
      throw new Error('Unable to read this DOCX document.');
    }
  } else
    throw new Error(
      'Upload a valid PDF or DOCX file. File contents must match its extension.',
    );
  text = text.replace(/\u0000/g, '').trim();
  if (!text || !/[a-zA-Z\p{L}]/u.test(text))
    throw new Error(
      'No readable text found. Upload a text-based resume, not a scan.',
    );
  if (text.length > 100000)
    throw new Error('Resume text is too long (maximum 100,000 characters).');
  return { rawText: text, mimeType };
}
