import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { TailoredContent } from './content';
import { educationLine } from '@/lib/profile/education';
function lines(content: TailoredContent) {
  return [
    ...(content.fullName?.trim() ? [content.fullName.trim()] : []),
    content.headline,
    [
      content.email,
      content.phone,
      content.linkedinUrl,
      content.website,
      content.location,
    ]
      .filter(Boolean)
      .join(' | '),
    '',
    'SUMMARY',
    content.summary,
    '',
    'SKILLS',
    content.skills.join(', '),
    '',
    'EXPERIENCE',
    ...content.experience.flatMap((entry) => [
      `${entry.title} | ${entry.company}`,
      `${entry.start} - ${entry.end}`,
      ...entry.bullets.map((bullet) => `- ${bullet}`),
      '',
    ]),
    'EDUCATION',
    ...content.education.map(educationLine),
  ].flatMap((line) => line.split('\n'));
}
export async function exportDocx(content: TailoredContent) {
  const headings = new Set(['SUMMARY', 'SKILLS', 'EXPERIENCE', 'EDUCATION']);
  return Packer.toBuffer(
    new Document({
      sections: [
        {
          children: lines(content).map(
            (line, index) =>
              new Paragraph({
                heading:
                  index === 0
                    ? HeadingLevel.TITLE
                    : headings.has(line)
                      ? HeadingLevel.HEADING_1
                      : undefined,
                children: [
                  new TextRun({ text: line, font: 'Arial', size: 22 }),
                ],
                spacing: { after: 120 },
              }),
          ),
        },
      ],
    }),
  );
}
export async function exportPdf(content: TailoredContent) {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page = document.addPage([612, 792]);
  let y = 744;
  const headings = new Set(['SUMMARY', 'SKILLS', 'EXPERIENCE', 'EDUCATION']);
  for (const [index, line] of lines(content).entries()) {
    const face = index === 0 || headings.has(line) ? bold : font;
    const size = index === 0 ? 17 : 11;
    const ascii = line
      .normalize('NFKD')
      .replace(/[\u2010-\u2015]/g, '-')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[^\x20-\x7e\n]/g, '?');
    for (const paragraph of ascii.split('\n')) {
      let row = '';
      const rows: string[] = [];
      for (const word of paragraph.split(' ')) {
        for (const char of `${word} `) {
          if (face.widthOfTextAtSize(row + char, size) > 516) {
            rows.push(row);
            row = '';
          }
          row += char;
        }
      }
      rows.push(row.trimEnd());
      for (const value of rows) {
        if (y < 50) {
          page = document.addPage([612, 792]);
          y = 744;
        }
        page.drawText(value, {
          x: 48,
          y,
          size,
          font: face,
          color: rgb(0.08, 0.12, 0.16),
        });
        y -= size + 5;
      }
      y -= 4;
    }
  }
  return Buffer.from(await document.save());
}
