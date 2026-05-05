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
});
