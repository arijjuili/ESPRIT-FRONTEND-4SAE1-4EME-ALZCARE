import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageUploadComponent } from './image-upload.component';
import { ImageUploadService, UploadResult } from '../../../core/services/image-upload.service';

describe('ImageUploadComponent', () => {
  let component: ImageUploadComponent;
  let fixture: ComponentFixture<ImageUploadComponent>;
  let imageUploadServiceSpy: jasmine.SpyObj<ImageUploadService>;

  beforeEach(async () => {
    imageUploadServiceSpy = jasmine.createSpyObj('ImageUploadService', [
      'validateFiles',
      'uploadWithProgress',
      'getThumbnailUrl'
    ]);

    await TestBed.configureTestingModule({
      imports: [ImageUploadComponent],
      providers: [
        { provide: ImageUploadService, useValue: imageUploadServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ImageUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate remaining slots', () => {
    component.uploadedImages = [
      { id: '1', url: 'http://test/1.jpg', publicId: 'p1', format: 'jpg', width: 100, height: 100 },
      { id: '2', url: 'http://test/2.jpg', publicId: 'p2', format: 'jpg', width: 100, height: 100 }
    ] as any;
    expect(component.remainingSlots).toBe(3);
  });

  it('should determine if can upload more', () => {
    expect(component.canUploadMore).toBeTrue();
    component.uploadedImages = [
      { id: '1', url: 'http://test/1.jpg', publicId: 'p1', format: 'jpg', width: 100, height: 100 }
    ] as any;
    expect(component.canUploadMore).toBeTrue();
    component.isUploading = true;
    expect(component.canUploadMore).toBeFalse();
  });

  it('should handle drag over', () => {
    const event = new DragEvent('dragover');
    spyOn(event, 'preventDefault');
    spyOn(event, 'stopPropagation');
    component.onDragOver(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(component.isDragging).toBeTrue();
  });

  it('should handle drag leave', () => {
    const event = new DragEvent('dragleave');
    spyOn(event, 'preventDefault');
    spyOn(event, 'stopPropagation');
    component.isDragging = true;
    component.onDragLeave(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(component.isDragging).toBeFalse();
  });

  it('should handle drop with files', () => {
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const event = new DragEvent('drop', { dataTransfer });
    spyOn(event, 'preventDefault');
    spyOn(event, 'stopPropagation');

    imageUploadServiceSpy.validateFiles.and.returnValue({ valid: [file], errors: [] });
    imageUploadServiceSpy.uploadWithProgress.and.returnValue(
      Promise.resolve({ url: 'http://test.jpg', publicId: 'p1', format: 'jpg', width: 100, height: 100 } as UploadResult)
    );

    component.onDrop(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(component.isDragging).toBeFalse();
  });

  it('should handle file input change', () => {
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const input = document.createElement('input');
    input.type = 'file';
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;

    imageUploadServiceSpy.validateFiles.and.returnValue({ valid: [file], errors: [] });
    imageUploadServiceSpy.uploadWithProgress.and.returnValue(
      Promise.resolve({ url: 'http://test.jpg', publicId: 'p1', format: 'jpg', width: 100, height: 100 } as UploadResult)
    );

    component.onFileSelected({ target: input } as any);
    expect(input.value).toBe('');
  });

  it('should open camera', () => {
    const mockInput = document.createElement('input');
    spyOn(mockInput, 'click');
    component.cameraInput = { nativeElement: mockInput } as any;
    component.openCamera();
    expect(mockInput.click).toHaveBeenCalled();
  });

  it('should remove image', () => {
    component.uploadedImages = [
      { id: '1', url: 'http://test/1.jpg', publicId: 'p1', format: 'jpg', width: 100, height: 100 }
    ] as any;
    spyOn(component.imagesChanged, 'emit');
    component.removeImage(0);
    expect(component.uploadedImages.length).toBe(0);
    expect(component.imagesChanged.emit).toHaveBeenCalledWith([]);
  });

  it('should get thumbnail url', () => {
    imageUploadServiceSpy.getThumbnailUrl.and.returnValue('http://thumb.jpg');
    const image = { url: 'http://test.jpg' } as any;
    const result = component.getThumbnailUrl(image);
    expect(result).toBe('http://thumb.jpg');
    expect(imageUploadServiceSpy.getThumbnailUrl).toHaveBeenCalledWith('http://test.jpg', 80);
  });

  it('should return accepted file types', () => {
    expect(component.acceptedFileTypes).toBe('image/jpeg,image/jpg,image/png,image/heic,image/heif');
  });

  it('should generate unique IDs', () => {
    const id1 = (component as any).generateId();
    const id2 = (component as any).generateId();
    expect(id1).not.toBe(id2);
    expect(id1.startsWith('upload-')).toBeTrue();
  });
});
