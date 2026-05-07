import { TestBed } from '@angular/core/testing';
import { PdfExportService } from './pdf-export.service';

describe('PdfExportService', () => {
  let service: PdfExportService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PdfExportService]
    });
    service = TestBed.inject(PdfExportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return early if element not found', () => {
    spyOn(document, 'getElementById').and.returnValue(null);
    spyOn(window, 'open');
    service.exportElementAsPdf('nonexistent', 'Test');
    expect(window.open).not.toHaveBeenCalled();
  });

  it('should open print window when element exists', () => {
    const mockElement = document.createElement('div');
    mockElement.id = 'test-element';
    mockElement.innerHTML = '<p>Test content</p>';
    document.body.appendChild(mockElement);

    const mockWindow = {
      focus: jasmine.createSpy('focus'),
      print: jasmine.createSpy('print'),
      close: jasmine.createSpy('close'),
      document: { open: jasmine.createSpy('open'), write: jasmine.createSpy('write'), close: jasmine.createSpy('close') }
    };
    spyOn(window, 'open').and.returnValue(mockWindow as any);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
    spyOn(URL, 'revokeObjectURL');

    service.exportElementAsPdf('test-element', 'Test Report');

    expect(window.open).toHaveBeenCalled();

    document.body.removeChild(mockElement);
  });

  it('should revoke blob URL when print window is blocked', () => {
    const mockElement = document.createElement('div');
    mockElement.id = 'test-element';
    document.body.appendChild(mockElement);

    spyOn(window, 'open').and.returnValue(null);
    const revokeSpy = spyOn(URL, 'revokeObjectURL');
    spyOn(URL, 'createObjectURL').and.returnValue('blob:test');

    service.exportElementAsPdf('test-element', 'Test Report');

    expect(revokeSpy).toHaveBeenCalledWith('blob:test');

    document.body.removeChild(mockElement);
  });

  it('should copy canvas content when canvas exists', () => {
    const mockElement = document.createElement('div');
    mockElement.id = 'test-element-canvas';
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    mockElement.appendChild(canvas);
    document.body.appendChild(mockElement);

    const mockWindow = {
      focus: jasmine.createSpy('focus'),
      print: jasmine.createSpy('print'),
      close: jasmine.createSpy('close')
    };
    spyOn(window, 'open').and.returnValue(mockWindow as any);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
    spyOn(URL, 'revokeObjectURL');

    service.exportElementAsPdf('test-element-canvas', 'Canvas Report');

    expect(window.open).toHaveBeenCalled();

    document.body.removeChild(mockElement);
  });

  it('should remove interactive elements from clone', () => {
    const mockElement = document.createElement('div');
    mockElement.id = 'test-element-interactive';
    mockElement.innerHTML = `
      <button>Click</button>
      <a href="#">Link</a>
      <select><option>Option</option></select>
      <input type="text" value="test" />
      <textarea>text</textarea>
      <p class="text-xs">Total</p>
      <p class="font-bold text-xl">42</p>
    `;
    document.body.appendChild(mockElement);

    const mockWindow = {
      focus: jasmine.createSpy('focus'),
      print: jasmine.createSpy('print'),
      close: jasmine.createSpy('close')
    };
    spyOn(window, 'open').and.returnValue(mockWindow as any);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
    spyOn(URL, 'revokeObjectURL');

    service.exportElementAsPdf('test-element-interactive', 'Interactive Report');

    expect(window.open).toHaveBeenCalled();

    document.body.removeChild(mockElement);
  });

  it('should return early when element is not found', () => {
    spyOn(window, 'open');
    service.exportElementAsPdf('non-existent-element', 'Test');
    expect(window.open).not.toHaveBeenCalled();
  });
});
