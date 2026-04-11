import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {
  exportElementAsPdf(elementId: string, title: string): void {
    const sourceElement = document.getElementById(elementId);
    if (!sourceElement) {
      console.error(`[PdfExportService] Element not found: ${elementId}`);
      return;
    }

    const clonedElement = sourceElement.cloneNode(true) as HTMLElement;
    this.copyCanvasContent(sourceElement, clonedElement);
    this.preparePdfClone(clonedElement);

    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) {
      console.error('[PdfExportService] Unable to open print window');
      return;
    }

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(node => node.outerHTML)
      .join('\n');

    const now = new Date();
    const dateText = now.toLocaleString();

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${this.escapeHtml(title)} - ${this.escapeHtml(dateText)}</title>
        ${styles}
        <style>
          @page { size: A4 portrait; margin: 14mm; }
          body { margin: 0; font-family: Arial, sans-serif; background: #fff; color: #111827; }
          .pdf-wrapper { padding: 0; }
          .pdf-meta { margin-bottom: 14px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
          .pdf-title { font-size: 20px; font-weight: 700; margin: 0 0 4px 0; }
          .pdf-date { font-size: 12px; color: #6b7280; margin: 0; }
          .pdf-content { width: 100%; }
          .pdf-content * { animation: none !important; transition: none !important; }
          .pdf-content [class*="hover:"] { box-shadow: none !important; transform: none !important; }
          .pdf-content img { max-width: 100%; height: auto; }
          .pdf-content table { width: 100%; border-collapse: collapse; }
          .pdf-content th, .pdf-content td { border: 1px solid #e5e7eb; vertical-align: top; }
          .pdf-content .pdf-stat-line { margin: 6px 0 0; font-size: 14px; font-weight: 600; color: #111827; }
          .pdf-content [class*="grid"] > div,
          .pdf-content section,
          .pdf-content article,
          .pdf-content table { break-inside: avoid; page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <div class="pdf-wrapper">
          <div class="pdf-meta">
            <p class="pdf-title">${this.escapeHtml(title)}</p>
            <p class="pdf-date">Generated: ${this.escapeHtml(dateText)}</p>
          </div>
          <div class="pdf-content">${clonedElement.outerHTML}</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();

    const triggerPrint = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
    setTimeout(triggerPrint, 500);
  }

  private copyCanvasContent(sourceRoot: HTMLElement, cloneRoot: HTMLElement): void {
    const sourceCanvases = sourceRoot.querySelectorAll('canvas');
    const cloneCanvases = cloneRoot.querySelectorAll('canvas');

    sourceCanvases.forEach((sourceCanvas, index) => {
      const cloneCanvas = cloneCanvases[index];
      if (!cloneCanvas) {
        return;
      }
      const dataUrl = sourceCanvas.toDataURL('image/png');
      const img = document.createElement('img');
      img.src = dataUrl;
      img.style.width = `${sourceCanvas.clientWidth || sourceCanvas.width}px`;
      img.style.height = `${sourceCanvas.clientHeight || sourceCanvas.height}px`;
      img.style.maxWidth = '100%';
      cloneCanvas.replaceWith(img);
    });
  }

  private preparePdfClone(cloneRoot: HTMLElement): void {
    this.removeInteractiveElements(cloneRoot);
    this.normalizeStatCards(cloneRoot);
  }

  private removeInteractiveElements(root: HTMLElement): void {
    root.querySelectorAll('button').forEach(button => button.remove());

    root.querySelectorAll('a').forEach(link => {
      const text = (link.textContent || '').trim();
      const span = document.createElement('span');
      span.textContent = text;
      link.replaceWith(span);
    });

    root.querySelectorAll('select').forEach(select => {
      const selectedText = (select as HTMLSelectElement).selectedOptions[0]?.textContent?.trim() || '';
      const span = document.createElement('span');
      span.textContent = selectedText;
      select.replaceWith(span);
    });

    root.querySelectorAll('input, textarea').forEach(field => field.remove());
  }

  private normalizeStatCards(root: HTMLElement): void {
    const labels = Array.from(root.querySelectorAll('p'));

    labels.forEach(label => {
      const labelClassName = (label.className || '').toString();
      const next = label.nextElementSibling as HTMLElement | null;
      if (!next || next.tagName !== 'P') {
        return;
      }

      const nextClassName = (next.className || '').toString();
      const looksLikeLabel =
        /text-(xs|sm)/.test(labelClassName) ||
        /(Total|Avg|Active|Favorite|Trend|Score|Time|Games|Assessments|Rate|Streak|Records|Mood|Sleep|Appetite)/i.test(label.textContent || '');
      const looksLikeValue = /(font-bold|text-(xl|2xl|3xl))/.test(nextClassName);

      if (!looksLikeLabel || !looksLikeValue) {
        return;
      }

      const labelText = this.normalizeSpace(label.textContent || '');
      const valueText = this.normalizeSpace(next.textContent || '');
      if (!labelText || !valueText) {
        return;
      }
      if (labelText.length > 48 || valueText.length > 36) {
        return;
      }

      const combined = document.createElement('p');
      combined.className = 'pdf-stat-line';
      combined.textContent = `${labelText}: ${valueText}`;
      label.replaceWith(combined);
      next.remove();
    });
  }

  private normalizeSpace(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
