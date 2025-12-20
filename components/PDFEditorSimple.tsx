'use client';

import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { PDFDocument, rgb } from 'pdf-lib';
import SignaturePad from 'signature_pad';
import { usePremium } from '@/contexts/PremiumContext';

// iOS WebKit fix: Use HTTPS CDN for worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface PDFEditorProps {
  file: File;
  onReset?: () => void;
}

interface Annotation {
  id: string;
  type: 'text' | 'signature' | 'eraser' | 'formfield';
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  text?: string;
  imageData?: string;
  fontSize?: number;
  textColor?: string;
  fieldName?: string;
  isFormField?: boolean;
  fieldType?: 'text' | 'checkbox' | 'radio' | 'dropdown';
  isChecked?: boolean;
  groupId?: string;  // For grouping related fields (like SSN digit boxes)
  groupIndex?: number;  // Position within the group (0, 1, 2, etc.)
}

interface FieldSplitConfig {
  [fieldName: string]: number; // field name -> number of boxes
}

// Known form configurations
const FORM_FIELD_CONFIGS: { [formType: string]: FieldSplitConfig } = {
  'FW9': {
    // SSN fields: 3 digits + 2 digits + 4 digits = 9 total
    'topmostSubform[0].Page1[0].f1_11[0]': 3,  // SSN part 1
    'topmostSubform[0].Page1[0].f1_12[0]': 2,  // SSN part 2
    'topmostSubform[0].Page1[0].f1_13[0]': 4,  // SSN part 3
    // EIN fields: 2 digits + 7 digits = 9 total
    'topmostSubform[0].Page1[0].f1_14[0]': 2,  // EIN part 1
    'topmostSubform[0].Page1[0].f1_15[0]': 7,  // EIN part 2
  }
};

interface FormField {
  name: string;
  value: string;
  type: string;
  rect: number[];
  pageNumber: number;
}

interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
  pageNumber: number;
}

export default function PDFEditorSimple({ file, onReset }: PDFEditorProps) {
  const { setShowPaywall } = usePremium();
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedTool, setSelectedTool] = useState<'select' | 'text' | 'signature' | 'eraser'>('select');
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [pendingSignaturePos, setPendingSignaturePos] = useState<{x: number, y: number} | null>(null);
  const [fontSize, setFontSize] = useState<number>(16);
  const [textColor, setTextColor] = useState<string>('#000000');
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [showFormFields, setShowFormFields] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; annotationId: string } | null>(null);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [splitCount, setSplitCount] = useState<number>(2);
  const [extractedText, setExtractedText] = useState<TextItem[]>([]);
  const [makeEditableMode, setMakeEditableMode] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [pageScale, setPageScale] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);
  const [lastTouchDistance, setLastTouchDistance] = useState<number>(0);

  // Drag and resize state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null);
  const [confirmedSignatureIds, setConfirmedSignatureIds] = useState<Set<string>>(new Set());
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadFilename, setDownloadFilename] = useState<string>('');

  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const justFinishedResizingRef = useRef<boolean>(false);

  useEffect(() => {
    console.log('Annotations updated:', annotations);
  }, [annotations]);

  // Touch event handlers for pinch-to-zoom and panning
  useEffect(() => {
    const container = pdfContainerRef.current;
    if (!container) return;

    let lastPanPos = { x: 0, y: 0 };
    let isPanning = false;

    const getTouchDistance = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (touches: TouchList) => {
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      // Check if touch target is an input or interactive element
      const target = e.target as HTMLElement;
      const isInteractive = target.tagName === 'INPUT' ||
                           target.tagName === 'TEXTAREA' ||
                           target.tagName === 'BUTTON' ||
                           target.closest('[data-signature]') ||
                           target.closest('[data-annotation]') ||
                           target.closest('[data-form-field]');

      // iOS: Early return for interactive elements - let browser handle them
      if (isInteractive) {
        return;
      }

      if (e.touches.length === 2) {
        // Two-finger pinch-to-zoom
        setIsPinching(true);
        isPanning = false;
        const distance = getTouchDistance(e.touches);
        setLastTouchDistance(distance);
        e.preventDefault();
      } else if (e.touches.length === 1 && zoom > 1) {
        // One-finger pan when zoomed
        isPanning = true;
        lastPanPos = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive = target.tagName === 'INPUT' ||
                           target.tagName === 'TEXTAREA' ||
                           target.closest('[data-signature]') ||
                           target.closest('[data-annotation]') ||
                           target.closest('[data-form-field]');

      // iOS: Early return for interactive elements
      if (isInteractive) {
        return;
      }

      if (e.touches.length === 2 && isPinching) {
        // Two-finger pinch-to-zoom
        const distance = getTouchDistance(e.touches);
        const delta = distance - lastTouchDistance;
        const zoomDelta = delta * 0.005;

        setZoom((prevZoom) => {
          const newZoom = Math.max(0.5, Math.min(3, prevZoom + zoomDelta));
          return newZoom;
        });

        setLastTouchDistance(distance);
        if (!isInteractive) {
          e.preventDefault();
        }
      } else if (e.touches.length === 1 && isPanning && zoom > 1 && !isInteractive) {
        // One-finger pan
        const deltaX = e.touches[0].clientX - lastPanPos.x;
        const deltaY = e.touches[0].clientY - lastPanPos.y;

        setPanOffset(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }));

        lastPanPos = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };

        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      setIsPinching(false);
      isPanning = false;
      setLastTouchDistance(0);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isPinching, lastTouchDistance, zoom]);

  // Handle drag and resize mouse and touch events
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (draggingId && pdfContainerRef.current) {
        const containerRect = pdfContainerRef.current.getBoundingClientRect();
        const newX = (clientX - containerRect.left - dragOffset.x) / pageScale;
        const newY = (clientY - containerRect.top - dragOffset.y) / pageScale;

        setAnnotations(prev =>
          prev.map(ann =>
            ann.id === draggingId
              ? { ...ann, x: newX, y: newY }
              : ann
          )
        );
      } else if (resizingId && resizeStart) {
        const deltaX = clientX - resizeStart.x;
        const deltaY = clientY - resizeStart.y;
        const newWidth = Math.max(50, resizeStart.width + deltaX) / pageScale;
        const newHeight = Math.max(30, resizeStart.height + deltaY) / pageScale;

        setAnnotations(prev =>
          prev.map(ann => {
            if (ann.id === resizingId) {
              // Scale fontSize proportionally to height change for text annotations
              const updates: Partial<Annotation> = { width: newWidth, height: newHeight };
              if (ann.type === 'text' && ann.fontSize) {
                const heightRatio = newHeight / (resizeStart.height / pageScale);
                updates.fontSize = Math.max(8, Math.min(72, ann.fontSize * heightRatio));
              }
              return { ...ann, ...updates };
            }
            return ann;
          })
        );
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
        e.preventDefault();
      }
    };

    const handleEnd = () => {
      // Set flag to prevent immediate click after resize/drag
      if (draggingId || resizingId) {
        justFinishedResizingRef.current = true;
        setTimeout(() => {
          justFinishedResizingRef.current = false;
        }, 100);
      }
      setDraggingId(null);
      setResizingId(null);
      setResizeStart(null);
    };

    if (draggingId || resizingId) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [draggingId, resizingId, dragOffset, resizeStart, pageScale]);

  useEffect(() => {
    if (showSignatureModal && signatureCanvasRef.current) {
      const canvas = signatureCanvasRef.current;
      const ctx = canvas.getContext('2d');

      // Fill canvas with white background for visibility while drawing
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      signaturePadRef.current = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255, 255, 255)',  // White background for drawing
      });
    }
  }, [showSignatureModal]);

  const onDocumentLoadSuccess = async ({ numPages }: { numPages: number }) => {
    try {
      setNumPages(numPages);
      // Automatically extract form fields on load (like Adobe Fill & Sign)
      console.log('🔍 Starting form field extraction...');
      const extractedFields = await extractFormFields();
      console.log('✅ Extracted fields:', extractedFields.length);

      // If no fields found with pdf-lib, try pdf.js annotation detection
      if (extractedFields.length === 0) {
        console.log('No AcroForm fields found, trying pdf.js annotation detection...');
        await extractAnnotationsWithPdfJs();
      }

      setShowFormFields(true);

    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('There was an error loading your PDF. Please try a different file or go back and try again.');
    }
  };

  const extractAllText = async () => {
    if (isExtractingText) return;
    setIsExtractingText(true);

    try {
      const loadingTask = pdfjs.getDocument(await file.arrayBuffer());
      const pdf = await loadingTask.promise;
      const allTextItems: TextItem[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1 });

        for (const item of textContent.items) {
          if ('str' in item && item.str.trim()) {
            // Extract transform matrix: [scaleX, skewY, skewX, scaleY, translateX, translateY]
            const transform = item.transform;
            const x = transform[4];
            const y = transform[5];
            const fontSize = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]);
            const width = item.width;
            const height = item.height;

            // Convert PDF coordinates (bottom-left origin) to canvas coordinates (top-left origin)
            const canvasY = viewport.height - y - height;

            allTextItems.push({
              text: item.str,
              x: x,
              y: canvasY,
              width: width,
              height: height,
              fontSize: fontSize,
              fontName: item.fontName || 'default',
              pageNumber: pageNum,
            });
          }
        }
      }

      console.log('Extracted text items:', allTextItems);
      setExtractedText(allTextItems);

      // Convert text items to editable annotations
      if (allTextItems.length > 0) {
        convertTextItemsToAnnotations(allTextItems);
      }
    } catch (error) {
      console.error('Error extracting text:', error);
      alert('Error extracting text from PDF. The PDF may not contain extractable text.');
    } finally {
      setIsExtractingText(false);
    }
  };

  const convertTextItemsToAnnotations = (textItems: TextItem[]) => {
    const newAnnotations: Annotation[] = textItems.map((item, index) => ({
      id: `text-${index}-${Date.now()}`,
      type: 'formfield' as const,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      pageNumber: item.pageNumber,
      text: item.text,
      isFormField: false,
      fontSize: Math.max(8, item.fontSize * 0.8), // Slightly smaller to fit
      textColor: '#000000',
    }));

    // Clear existing annotations and set new ones
    setAnnotations(newAnnotations);
  };

  const splitFieldIntoBoxes = (annotationId: string, boxCount: number) => {
    const annotation = annotations.find(a => a.id === annotationId);
    if (!annotation || annotation.fieldType !== 'text') return;

    // Remove the original annotation
    const otherAnnotations = annotations.filter(a => a.id !== annotationId);

    // Create new split boxes
    const boxWidth = annotation.width / boxCount;
    const gap = boxWidth * 0.05;
    const actualBoxWidth = boxWidth - gap;

    const newBoxes: Annotation[] = [];
    for (let i = 0; i < boxCount; i++) {
      const boxX = annotation.x + (i * boxWidth);
      newBoxes.push({
        ...annotation,
        id: `${annotationId}-split${i}-${Date.now()}`,
        x: boxX,
        width: actualBoxWidth,
        fieldName: `${annotation.fieldName}_${i}`,
        text: '', // Clear text when splitting
      });
    }

    setAnnotations([...otherAnnotations, ...newBoxes]);
    console.log(`✂️ Split field into ${boxCount} boxes`);
  };

  const extractFormFields = async () => {
    console.log('=== STARTING FORM FIELD EXTRACTION ===');
    try {
      if (!file) {
        console.error('❌ No file provided');
        alert('ERROR: No PDF file loaded');
        return [];
      }

      const arrayBuffer = await file.arrayBuffer();
      console.log('PDF loaded, size:', arrayBuffer.byteLength, 'bytes');

      if (typeof PDFDocument === 'undefined') {
        console.error('❌ PDFDocument is undefined - pdf-lib not loaded');
        alert('ERROR: PDF library not loaded. Please refresh the app.');
        return [];
      }

      const pdfDoc = await PDFDocument.load(arrayBuffer);
      console.log('✅ PDFDocument loaded successfully');

      const form = pdfDoc.getForm();
      console.log('✅ Form object retrieved:', form ? 'exists' : 'null');

      const fields = form.getFields();
      console.log(`📊 Total fields found: ${fields.length}`);

      const extractedFields: FormField[] = [];

      for (const field of fields) {
        const fieldName = field.getName();
        console.log('Processing field:', fieldName);

        let fieldValue = '';
        let fieldType = 'unknown';

        try {
          // Try to get value based on field type
          const fieldConstructor = field.constructor.name;
          console.log('  Field type:', fieldConstructor);

          if (fieldConstructor === 'PDFTextField') {
            const textField = form.getTextField(fieldName);
            fieldValue = textField.getText() || '';
            fieldType = 'text';
          } else if (fieldConstructor === 'PDFCheckBox') {
            const checkBox = form.getCheckBox(fieldName);
            fieldValue = checkBox.isChecked() ? 'Yes' : 'No';
            fieldType = 'checkbox';
          } else if (fieldConstructor === 'PDFDropdown') {
            const dropdown = form.getDropdown(fieldName);
            const selected = dropdown.getSelected();
            fieldValue = selected ? selected.join(', ') : '';
            fieldType = 'dropdown';
          } else if (fieldConstructor === 'PDFRadioGroup') {
            const radioGroup = form.getRadioGroup(fieldName);
            fieldValue = radioGroup.getSelected() || '';
            fieldType = 'radio';
          }

          // Get field widget (location info)
          const widgets = (field as any).acroField.getWidgets();
          console.log('  Widgets found:', widgets?.length || 0);

          if (widgets && widgets.length > 0) {
            const widget = widgets[0];
            const rect = widget.getRectangle();

            // Try to find the page index by checking each page
            let pageIndex = -1;
            const pages = pdfDoc.getPages();
            const pageRef = widget.P();

            // Try comparing page.ref with pageRef (most reliable method)
            for (let i = 0; i < pages.length; i++) {
              if (pages[i].ref === pageRef) {
                pageIndex = i;
                break;
              }
            }

            // Fallback: try indexOf
            if (pageIndex === -1) {
              pageIndex = pages.indexOf(pageRef as any);
            }

            // Fallback 2: try comparing page.node
            if (pageIndex === -1) {
              for (let i = 0; i < pages.length; i++) {
                const pageDict = (pages[i] as any).node;
                if (pageDict === pageRef || pageDict.dict === pageRef) {
                  pageIndex = i;
                  break;
                }
              }
            }

            // If still not found, default to page 0
            if (pageIndex === -1) {
              console.log('  ⚠️ Could not determine page, defaulting to page 1');
              pageIndex = 0;
            }

            console.log('  Rectangle:', rect);
            console.log('  Page index:', pageIndex);

            if (rect) {
              extractedFields.push({
                name: fieldName,
                value: fieldValue,
                type: fieldType,
                rect: [rect.x, rect.y, rect.width, rect.height],
                pageNumber: pageIndex + 1,
              });
              console.log('  ✓ Field extracted successfully');
            } else {
              console.log('  ✗ No rectangle found');
            }
          } else {
            console.log('  ✗ No widgets found');
          }
        } catch (err) {
          console.warn(`Could not extract field ${fieldName}:`, err);
        }
      }

      console.log('=== EXTRACTION COMPLETE ===');
      console.log('Total fields extracted:', extractedFields.length);
      console.log('Extracted form fields:', extractedFields);
      setFormFields(extractedFields);

      // Automatically create annotations for form fields
      if (extractedFields.length > 0) {
        console.log('Converting fields to annotations...');
        await convertFormFieldsToAnnotations(extractedFields);
      } else {
        console.log('⚠️ No fields to convert - PDF may not have form fields');
      }

      return extractedFields;
    } catch (error) {
      console.error('❌ Error extracting form fields:', error);
      return [];
    }
  };

  const extractAnnotationsWithPdfJs = async () => {
    console.log('=== EXTRACTING ANNOTATIONS WITH PDF.JS ===');
    try {
      const loadingTask = pdfjs.getDocument(await file.arrayBuffer());
      const pdf = await loadingTask.promise;
      console.log('PDF loaded, total pages:', pdf.numPages);

      const newAnnotations: Annotation[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const annotations = await page.getAnnotations();

        console.log(`Page ${pageNum}: Found ${annotations.length} annotations`);

        for (const annot of annotations) {
          console.log('Annotation:', annot);

          // Check if it's a widget annotation (form field)
          if (annot.subtype === 'Widget' && annot.fieldType) {
            const rect = annot.rect; // [x1, y1, x2, y2]
            const x = rect[0];
            const y = rect[1];
            const width = rect[2] - rect[0];
            const height = rect[3] - rect[1];

            const viewport = page.getViewport({ scale: 1 });
            const pageHeight = viewport.height;

            // Convert PDF coordinates to canvas coordinates
            const canvasY = pageHeight - rect[3];

            console.log(`  Widget field:`, {
              fieldName: annot.fieldName,
              fieldType: annot.fieldType,
              rect,
              converted: { x, y: canvasY, width, height }
            });

            // Create annotation based on field type
            if (annot.fieldType === 'Tx') { // Text field
              newAnnotations.push({
                id: `pdfjs-field-${annot.fieldName || annot.id}-${Date.now()}`,
                type: 'formfield' as const,
                x: x,
                y: canvasY,
                width: width,
                height: height,
                pageNumber: pageNum,
                text: annot.fieldValue || '',
                fieldName: annot.fieldName || `field-${annot.id}`,
                isFormField: true,
                fieldType: 'text',
                fontSize: Math.min(12, height * 0.7),
                textColor: '#000000',
              });
            } else if (annot.fieldType === 'Btn') { // Button/Checkbox
              newAnnotations.push({
                id: `pdfjs-checkbox-${annot.fieldName || annot.id}-${Date.now()}`,
                type: 'formfield' as const,
                x: x,
                y: canvasY,
                width: width,
                height: height,
                pageNumber: pageNum,
                text: annot.buttonValue ? '☑' : '☐',
                fieldName: annot.fieldName || `checkbox-${annot.id}`,
                isFormField: true,
                fieldType: 'checkbox',
                isChecked: annot.buttonValue === 'Yes' || annot.buttonValue === true,
                fontSize: Math.min(16, height * 0.8),
                textColor: '#000000',
              });
            }
          }
        }
      }

      console.log('=== PDF.JS EXTRACTION COMPLETE ===');
      console.log('Total annotations found:', newAnnotations.length);

      if (newAnnotations.length > 0) {
        setAnnotations(newAnnotations);
        console.log('Annotations set from pdf.js detection');
      } else {
        console.log('⚠️ No widget annotations found with pdf.js either');
      }
    } catch (error) {
      console.error('❌ Error extracting annotations with pdf.js:', error);
    }
  };

  const detectFormType = (fields: FormField[]): string | null => {
    // Check field names to identify form type
    const fieldNames = fields.map(f => f.name);

    // Check for FW9 - look for characteristic field names
    if (fieldNames.some(name => name.includes('topmostSubform') && name.includes('Page1'))) {
      console.log('📋 Detected form type: FW9');
      return 'FW9';
    }

    console.log('📋 Form type not recognized - using generic handling');
    return null;
  };

  const extractVisualBoxes = async (pageNum: number) => {
    try {
      const loadingTask = pdfjs.getDocument(await file.arrayBuffer());
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(pageNum);
      const ops = await page.getOperatorList();

      const rectangles: { x: number; y: number; width: number; height: number }[] = [];

      // Scan for rectangle drawing operations
      for (let i = 0; i < ops.fnArray.length; i++) {
        const fn = ops.fnArray[i];
        const args = ops.argsArray[i];

        // OPS.rectangle = 43 (re command in PDF)
        if (fn === 43 && args && args.length >= 4) {
          const [x, y, width, height] = args;
          rectangles.push({ x, y, width, height });
        }
      }

      return rectangles;
    } catch (error) {
      console.error('Error extracting visual boxes:', error);
      return [];
    }
  };

  const convertFormFieldsToAnnotations = async (fields: FormField[]) => {
    console.log('=== CONVERTING FORM FIELDS TO ANNOTATIONS ===');
    console.log('Fields to convert:', fields.length);

    try {
      // We need the page dimensions to convert coordinates
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();
      console.log('Total pages:', pages.length);

      const newAnnotations: Annotation[] = [];

      // Detect form type to use configurations
      const formType = detectFormType(fields);
      const fieldConfig = formType ? FORM_FIELD_CONFIGS[formType] : {};

      // Extract visual boxes from PDF for intelligent field splitting
      const visualBoxesCache = new Map<number, { x: number; y: number; width: number; height: number }[]>();

      for (const field of fields) {
        const [x, y, width, height] = field.rect;
        const pageIndex = field.pageNumber - 1;

        console.log(`Converting field "${field.name}":`, {
          type: field.type,
          rect: field.rect,
          pageNumber: field.pageNumber,
          pageIndex
        });

        // Check if page exists
        if (pageIndex >= 0 && pageIndex < pages.length) {
          const page = pages[pageIndex];
          const pageHeight = page.getSize().height;

          // Convert PDF coordinates (bottom-left origin) to canvas coordinates (top-left origin)
          let canvasY = pageHeight - y - height;

          // Only shift upward for single-line text fields (not digit boxes)
          // Digit boxes (height > 20) and wide fields should stay in their original position
          const isDigitBox = height > 20 || (width < height * 2);
          if (!isDigitBox) {
            // Shift boxes upward so the bottom border sits on the line
            canvasY = canvasY - (height * 0.5);
          }

          // For text fields, check if we should split into individual digit boxes
          if (field.type === 'text') {
            let boxCount = 0;

            // Priority 1: Check configuration for this specific field
            if (fieldConfig[field.name]) {
              boxCount = fieldConfig[field.name];
              console.log(`  ✓ Using configured split: ${boxCount} boxes for field: ${field.name}`);
            } else if (width > height * 1.5) {
              // Only use heuristic splitting if no config exists
              console.log(`  No config for field: ${field.name}, checking heuristics...`);
            } else {
              console.log(`  Field ${field.name} too narrow for splitting (width:${width} height:${height})`);
            }

            // Priority 2: Try to detect visual boxes (only for wider fields without config)
            if (boxCount === 0 && width > height * 1.5) {
              if (!visualBoxesCache.has(field.pageNumber)) {
                console.log(`  Extracting visual boxes from page ${field.pageNumber}...`);
                const boxes = await extractVisualBoxes(field.pageNumber);
                visualBoxesCache.set(field.pageNumber, boxes);
                console.log(`  Found ${boxes.length} visual rectangles on page`);
              }

              const visualBoxes = visualBoxesCache.get(field.pageNumber) || [];

              // Find visual boxes that are WITHIN this form field's boundaries
              const tolerance = 5;
              const containedBoxes = visualBoxes.filter(box => {
                const boxInBounds =
                  box.x >= (x - tolerance) &&
                  box.x + box.width <= (x + width + tolerance) &&
                  box.y >= (y - tolerance) &&
                  box.y + box.height <= (y + height + tolerance);

                const isSmallBox = box.width > 5 && box.width < 50 && box.height > 5 && box.height < 50;
                return boxInBounds && isSmallBox;
              });

              containedBoxes.sort((a, b) => a.x - b.x);

              if (containedBoxes.length >= 2) {
                console.log(`  ✓ Using ${containedBoxes.length} detected visual boxes`);

                // Use the ACTUAL visual boxes!
                for (let i = 0; i < containedBoxes.length; i++) {
                  const vbox = containedBoxes[i];
                  let vboxCanvasY = pageHeight - vbox.y - vbox.height;

                  // Don't shift digit boxes upward
                  const isDigitBox = vbox.height > 20 || (vbox.width < vbox.height * 2);
                  if (!isDigitBox) {
                    vboxCanvasY = vboxCanvasY - (vbox.height * 0.5);
                  }

                  const annotation = {
                    id: `formfield-${field.name}-box${i}-${Date.now()}`,
                    type: 'formfield' as const,
                    x: vbox.x,
                    y: vboxCanvasY,
                    width: vbox.width,
                    height: vbox.height,
                    pageNumber: field.pageNumber,
                    text: '',
                    fieldName: `${field.name}_digit${i}`,
                    isFormField: true,
                    fieldType: 'text' as const,
                    isChecked: false,
                    fontSize: Math.min(12, vbox.height * 0.7),
                    textColor: '#000000',
                  };
                  newAnnotations.push(annotation);
                }
                continue; // Skip to next field
              }
            }

            // Use configured or default box count
            if (boxCount >= 2) {
              const boxWidth = width / boxCount;
              const gap = boxWidth * 0.05;
              const actualBoxWidth = boxWidth - gap;

              console.log(`  Creating ${boxCount} evenly-spaced boxes`);

              for (let i = 0; i < boxCount; i++) {
                const boxX = x + (i * boxWidth);
                const annotation = {
                  id: `formfield-${field.name}-box${i}-${Date.now()}`,
                  type: 'formfield' as const,
                  x: boxX,
                  y: canvasY,
                  width: actualBoxWidth,
                  height: height,
                  pageNumber: field.pageNumber,
                  text: '',
                  fieldName: `${field.name}_digit${i}`,
                  isFormField: true,
                  fieldType: 'text' as const,
                  isChecked: false,
                  fontSize: Math.min(12, height * 0.7),
                  textColor: '#000000',
                  groupId: field.name,  // All boxes from same field share groupId
                  groupIndex: i,  // Position in the group
                };
                newAnnotations.push(annotation);
              }
            } else {
              // Single box - create as normal
              const annotation = {
                id: `formfield-${field.name}-${Date.now()}`,
                type: 'formfield' as const,
                x: x,
                y: canvasY,
                width: width,
                height: height,
                pageNumber: field.pageNumber,
                text: '',
                fieldName: field.name,
                isFormField: true,
                fieldType: 'text' as const,
                isChecked: false,
                fontSize: Math.min(12, height * 0.7),
                textColor: '#000000',
              };
              console.log('  Created single annotation:', annotation);
              newAnnotations.push(annotation);
            }
          } else {
            // Checkbox, radio, dropdown, or narrow text field - create as normal
            // Default unknown field types to 'text' so they render properly
            const normalizedFieldType = field.type === 'unknown' || !field.type
              ? 'text'
              : field.type as 'text' | 'checkbox' | 'radio' | 'dropdown';

            const annotation = {
              id: `formfield-${field.name}-${Date.now()}`,
              type: 'formfield' as const,
              x: x,
              y: canvasY,
              width: width,
              height: height,
              pageNumber: field.pageNumber,
              text: field.type === 'checkbox' ? (field.value === 'Yes' ? '☑' : '☐') : '',
              fieldName: field.name,
              isFormField: true,
              fieldType: normalizedFieldType,
              isChecked: field.type === 'checkbox' && field.value === 'Yes',
              fontSize: Math.min(12, height * 0.7),
              textColor: '#000000',
            };

            console.log('  Created annotation:', annotation);
            newAnnotations.push(annotation);
          }
        } else {
          console.warn(`Page ${field.pageNumber} not found for field ${field.name}`);
        }
      }

      console.log('=== CONVERSION COMPLETE ===');
      console.log('Total annotations created:', newAnnotations.length);
      console.log('Annotations:', newAnnotations);

      // Replace all annotations with just the form fields
      setAnnotations(newAnnotations);
      console.log('Annotations state updated');
    } catch (error) {
      console.error('❌ Error converting form fields:', error);
    }
  };

  const handlePdfClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Ignore clicks during drag or resize operations, or immediately after
    if (draggingId || resizingId || justFinishedResizingRef.current) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    // Convert click position to PDF coordinate space by dividing by pageScale
    const x = (e.clientX - rect.left) / pageScale;
    const y = (e.clientY - rect.top) / pageScale;

    // Handle text placement
    if (selectedTool === 'text') {
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: 'text',
        x,
        y,
        width: 200,
        height: 30,
        pageNumber: currentPage,
        text: '',
        fontSize: 14,
        textColor: '#000000',
      };

      setAnnotations(prev => [...prev, newAnnotation]);

      // Auto-zoom to placed annotation
      if (zoom < 1.8) {
        setZoom(1.8);
      }

      // Deselect tool after placing text
      setSelectedTool('select');
    }
    // Handle signature placement
    else if (selectedTool === 'signature') {
      // Store position and open modal
      setPendingSignaturePos({ x, y });
      setShowSignatureModal(true);

      // Auto-zoom for signature
      if (zoom < 1.8) {
        setZoom(1.8);
      }
    }
    // Deselect any selected annotation when clicking on empty PDF area
    else {
      setSelectedAnnotation(null);
      setSelectedSignatureId(null);
    }
  };

  const handlePdfTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    // Ignore touches during drag or resize operations, or immediately after
    if (draggingId || resizingId || justFinishedResizingRef.current) {
      return;
    }

    // Only handle single touch (not multi-touch gestures)
    // Use changedTouches for touchend event since touches array is empty at touch end
    if (e.changedTouches.length !== 1) {
      return;
    }

    const touch = e.changedTouches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    // Convert touch position to PDF coordinate space by dividing by pageScale
    const x = (touch.clientX - rect.left) / pageScale;
    const y = (touch.clientY - rect.top) / pageScale;

    // Handle text placement
    if (selectedTool === 'text') {
      e.preventDefault(); // Prevent default touch behavior
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: 'text',
        x,
        y,
        width: 200,
        height: 30,
        pageNumber: currentPage,
        text: '',
        fontSize: 14,
        textColor: '#000000',
      };

      setAnnotations(prev => [...prev, newAnnotation]);

      // Auto-zoom to placed annotation
      if (zoom < 1.8) {
        setZoom(1.8);
      }

      // Deselect tool after placing text
      setSelectedTool('select');
    }
    // Handle signature placement
    else if (selectedTool === 'signature') {
      e.preventDefault(); // Prevent default touch behavior
      // Store position and open modal
      setPendingSignaturePos({ x, y });
      setShowSignatureModal(true);

      // Auto-zoom for signature
      if (zoom < 1.8) {
        setZoom(1.8);
      }
    }
    // Deselect any selected annotation when tapping on empty PDF area
    else {
      setSelectedAnnotation(null);
      setSelectedSignatureId(null);
    }
  };

  const saveSignature = () => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty() || !pendingSignaturePos) {
      alert('Please draw a signature first');
      return;
    }

    // Create a temporary canvas to extract signature with transparent background
    const tempCanvas = document.createElement('canvas');
    const sourceCanvas = signatureCanvasRef.current;
    if (!sourceCanvas) return;

    tempCanvas.width = sourceCanvas.width;
    tempCanvas.height = sourceCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Draw the signature from the source canvas
    tempCtx.drawImage(sourceCanvas, 0, 0);

    // Get image data and make white pixels transparent
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // If pixel is white or very close to white, make it transparent
      if (r > 250 && g > 250 && b > 250) {
        data[i + 3] = 0; // Set alpha to 0 (transparent)
      }
    }

    tempCtx.putImageData(imageData, 0, 0);
    const transparentImageData = tempCanvas.toDataURL('image/png');

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'signature',
      x: pendingSignaturePos.x,
      y: pendingSignaturePos.y,
      width: 200,
      height: 100,
      pageNumber: currentPage,
      imageData: transparentImageData,
    };

    console.log('Creating signature annotation:', newAnnotation);
    setAnnotations(prev => {
      const updated = [...prev, newAnnotation];
      console.log('Annotations after adding signature:', updated);
      return updated;
    });

    setShowSignatureModal(false);
    setPendingSignaturePos(null);
    setSelectedTool('select');
    if (signaturePadRef.current) signaturePadRef.current.clear();
  };

  const updateAnnotationText = (id: string, text: string) => {
    setAnnotations(prev =>
      prev.map(ann => (ann.id === id ? { ...ann, text } : ann))
    );
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
  };

  const startDrag = (e: React.MouseEvent, annId: string, ann: Annotation) => {
    if (selectedTool !== 'select') return;
    e.stopPropagation();
    setDraggingId(annId);
    const rect = pdfContainerRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left - ann.x,
        y: e.clientY - rect.top - ann.y,
      });
    }
  };

  const startResize = (e: React.MouseEvent, annId: string, ann: Annotation, handle: 'nw' | 'ne' | 'sw' | 'se') => {
    e.stopPropagation();
    setResizingId(annId);
    setResizeHandle(handle);
    setResizeStart({
      x: ann.x,
      y: ann.y,
      width: ann.width,
      height: ann.height,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = pdfContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (draggingId) {
      const x = e.clientX - rect.left - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;

      setAnnotations(prev =>
        prev.map(ann =>
          ann.id === draggingId ? { ...ann, x, y } : ann
        )
      );
    } else if (resizingId && resizeStart && resizeHandle) {
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      setAnnotations(prev =>
        prev.map(ann => {
          if (ann.id !== resizingId) return ann;

          let newX = ann.x;
          let newY = ann.y;
          let newWidth = ann.width;
          let newHeight = ann.height;

          if (resizeHandle === 'se') {
            // Southeast - resize from bottom-right
            newWidth = currentX - resizeStart.x;
            newHeight = currentY - resizeStart.y;
          } else if (resizeHandle === 'sw') {
            // Southwest - resize from bottom-left
            newWidth = resizeStart.width - (currentX - resizeStart.x);
            newHeight = currentY - resizeStart.y;
            newX = currentX;
          } else if (resizeHandle === 'ne') {
            // Northeast - resize from top-right
            newWidth = currentX - resizeStart.x;
            newHeight = resizeStart.height - (currentY - resizeStart.y);
            newY = currentY;
          } else if (resizeHandle === 'nw') {
            // Northwest - resize from top-left
            newWidth = resizeStart.width - (currentX - resizeStart.x);
            newHeight = resizeStart.height - (currentY - resizeStart.y);
            newX = currentX;
            newY = currentY;
          }

          // Ensure minimum size
          if (newWidth < 50) {
            if (resizeHandle === 'sw' || resizeHandle === 'nw') {
              newX = resizeStart.x + resizeStart.width - 50;
            }
            newWidth = 50;
          }
          if (newHeight < 30) {
            if (resizeHandle === 'ne' || resizeHandle === 'nw') {
              newY = resizeStart.y + resizeStart.height - 30;
            }
            newHeight = 30;
          }

          return { ...ann, x: newX, y: newY, width: newWidth, height: newHeight };
        })
      );
    }
  };

  const handleMouseUp = () => {
    setDraggingId(null);
    setResizingId(null);
    setResizeHandle(null);
    setResizeStart(null);
  };

  const prepareDownload = () => {
    // Set default filename and show modal
    // Format: originalname-edited.pdf instead of edited-originalname.pdf
    const nameParts = file.name.split('.');
    const extension = nameParts.pop();
    const baseName = nameParts.join('.');
    const defaultName = `${baseName}-edited.${extension}`;
    setDownloadFilename(defaultName);
    setShowDownloadModal(true);
  };

  const downloadPDF = async () => {
    try {
      console.log('=== DOWNLOAD STARTED ===');
      console.log(`Total annotations: ${annotations.length}`);

      const existingPdfBytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();
      const form = pdfDoc.getForm();

      // First, handle grouped fields (SSN/EIN) - reconstruct full values
      const groupedFields = new Map<string, { fieldName: string; digits: string[] }>();
      for (const annotation of annotations) {
        if (annotation.type === 'formfield') {
          console.log(`Formfield: ${annotation.fieldName}, has groupId: ${!!annotation.groupId}, groupIndex: ${annotation.groupIndex}, text: "${annotation.text}"`);
        }
        if (annotation.type === 'formfield' && annotation.groupId && annotation.groupIndex !== undefined) {
          console.log(`  ✓ Found grouped field: groupId=${annotation.groupId}, index=${annotation.groupIndex}, text="${annotation.text}"`);
          if (!groupedFields.has(annotation.groupId)) {
            groupedFields.set(annotation.groupId, { fieldName: annotation.groupId, digits: [] });
          }
          const group = groupedFields.get(annotation.groupId)!;
          group.digits[annotation.groupIndex] = annotation.text || '';
        }
      }
      console.log(`Total grouped fields found: ${groupedFields.size}`);

      // Set the reconstructed values for grouped fields
      for (const [groupId, group] of groupedFields) {
        try {
          const fullValue = group.digits.join('');
          console.log(`Setting grouped field ${groupId} to: "${fullValue}"`);
          const field = form.getFieldMaybe(groupId);
          if (field && field.constructor.name === 'PDFTextField') {
            const textField = form.getTextField(groupId);
            textField.setText(fullValue);
            textField.enableReadOnly();
            console.log(`  ✓ Successfully set ${groupId}`);
          } else {
            console.warn(`  ✗ Field ${groupId} not found or not a text field`);
          }
        } catch (err) {
          console.warn(`Could not update grouped field ${groupId}:`, err);
        }
      }

      // Then, update regular form field values
      for (const annotation of annotations) {
        if (annotation.type === 'formfield' && annotation.fieldName && annotation.isFormField && !annotation.groupId) {
          try {
            const field = form.getFieldMaybe(annotation.fieldName);
            if (field) {
              const fieldConstructor = field.constructor.name;
              if (fieldConstructor === 'PDFTextField') {
                const textField = form.getTextField(annotation.fieldName);
                // Set the form field value
                textField.setText(annotation.text || '');
                // Make the field read-only to prevent editing
                textField.enableReadOnly();
              } else if (fieldConstructor === 'PDFCheckBox') {
                const checkBox = form.getCheckBox(annotation.fieldName);
                if (annotation.isChecked) {
                  checkBox.check();
                } else {
                  checkBox.uncheck();
                }
              }
            }
          } catch (err) {
            console.warn(`Could not update field ${annotation.fieldName}:`, err);
          }
        }
      }

      // Then, add other annotations (text, signatures, erasers, and editable text)
      for (const annotation of annotations) {
        const page = pages[annotation.pageNumber - 1];
        if (!page) continue;

        const { height } = page.getSize();

        // Skip formfield annotations - they were already handled above by setting form values
        if (annotation.type === 'formfield' && annotation.isFormField) {
          continue;
        } else if (annotation.type === 'eraser') {
          // Draw white rectangle to cover existing content
          page.drawRectangle({
            x: annotation.x,
            y: height - annotation.y - annotation.height,
            width: annotation.width,
            height: annotation.height,
            color: rgb(1, 1, 1), // White
          });
        } else if (annotation.type === 'formfield' && annotation.isFormField === false) {
          // This is an editable text item (from Make Editable mode)
          // First, draw white rectangle to cover original text
          page.drawRectangle({
            x: annotation.x,
            y: height - annotation.y - annotation.height,
            width: annotation.width,
            height: annotation.height,
            color: rgb(1, 1, 1), // White
          });

          // Then, draw the new text
          if (annotation.text) {
            const textSize = annotation.fontSize || 12;
            const colorMatch = annotation.textColor?.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
            const textRgb = colorMatch
              ? rgb(
                  parseInt(colorMatch[1], 16) / 255,
                  parseInt(colorMatch[2], 16) / 255,
                  parseInt(colorMatch[3], 16) / 255
                )
              : rgb(0, 0, 0);

            try {
              page.drawText(annotation.text, {
                x: annotation.x,
                y: height - annotation.y - annotation.height + 2,
                size: textSize,
                color: textRgb,
              });
            } catch (err) {
              console.warn('Could not draw text:', err);
            }
          }
        } else if (annotation.type === 'text' && annotation.text) {
          const textSize = annotation.fontSize || 16;
          const colorMatch = annotation.textColor?.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
          const textRgb = colorMatch
            ? rgb(
                parseInt(colorMatch[1], 16) / 255,
                parseInt(colorMatch[2], 16) / 255,
                parseInt(colorMatch[3], 16) / 255
              )
            : rgb(0, 0, 0);

          // Align text inside the box: text baseline should be textSize from bottom of box
          page.drawText(annotation.text, {
            x: annotation.x + 4,
            y: height - annotation.y - annotation.height + textSize + 4,
            size: textSize,
            color: textRgb,
          });
        } else if (annotation.type === 'signature' && annotation.imageData) {
          const imageBytes = Uint8Array.from(
            atob(annotation.imageData.split(',')[1]),
            (c) => c.charCodeAt(0)
          );
          const image = await pdfDoc.embedPng(imageBytes);
          page.drawImage(image, {
            x: annotation.x,
            y: height - annotation.y - annotation.height,
            width: annotation.width,
            height: annotation.height,
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Use custom filename or generate default
      if (downloadFilename) {
        link.download = downloadFilename;
      } else {
        const nameParts = file.name.split('.');
        const extension = nameParts.pop();
        const baseName = nameParts.join('.');
        link.download = `${baseName}-edited.${extension}`;
      }

      link.click();
      URL.revokeObjectURL(url);
      setShowDownloadModal(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  return (
    <div className="flex mobile-viewport flex-col">
      {/* Toolbar with Safe Area */}
      <div className="safe-area-top bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 flex gap-2 sm:gap-4 items-center flex-wrap shadow-sm sticky top-0 z-40">
        {/* Back Button */}
        {onReset && (
          <button
            onClick={onReset}
            className="px-3 py-2.5 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 border border-gray-200 transition-all duration-200 flex items-center gap-2"
            title="Back to home"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline text-sm font-semibold">Back</span>
          </button>
        )}

        <button
          onClick={() => setSelectedTool('text')}
          className={`px-3 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 ${
            selectedTool === 'text'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span className="inline-flex items-center gap-1 sm:gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="hidden sm:inline">Add Text</span>
            <span className="sm:hidden">Text</span>
          </span>
        </button>

        <button
          onClick={() => setSelectedTool('signature')}
          className={`px-3 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 ${
            selectedTool === 'signature'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span className="inline-flex items-center gap-1 sm:gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span className="hidden sm:inline">Add Signature</span>
            <span className="sm:hidden">Sign</span>
          </span>
        </button>

        {/* Hide PRO button on mobile to save space */}
        <button
          onClick={() => setShowPaywall(true)}
          className="hidden sm:block relative px-4 sm:px-6 py-2.5 bg-white border-2 border-purple-200 text-purple-700 rounded-xl hover:bg-purple-50 hover:border-purple-300 text-xs sm:text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200"
        >
          <span className="inline-flex items-center gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">Send for Signature</span>
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full">
              PRO
            </span>
          </span>
        </button>

        <div className="flex-1" />

        <button
          onClick={prepareDownload}
          className="px-3 sm:px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-200"
        >
          <span className="inline-flex items-center gap-1 sm:gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline">Download</span>
            <span className="sm:hidden">Save</span>
          </span>
        </button>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-gray-200 p-3 sm:p-8 safe-area-bottom">
        <div
          ref={pdfContainerRef}
          className="relative bg-white shadow-2xl mx-auto w-fit"
          onClick={(e) => {
            // Don't handle clicks on form fields
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.closest('[data-form-field="true"]')) {
              return;
            }
            handlePdfClick(e);
          }}
          onTouchEnd={(e) => {
            // Don't handle touches on form fields
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.closest('[data-form-field="true"]')) {
              return;
            }
            handlePdfTouch(e);
          }}
          style={{
            cursor: selectedTool === 'signature' || selectedTool === 'text' ? 'crosshair' : 'default',
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isPinching ? 'none' : 'transform 0.2s ease-out',
            touchAction: 'auto'  // iOS: Allow touch on form inputs
          }}
        >
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(error) => {
              console.error('PDF load error:', error);
              alert('Failed to load PDF. The file may be corrupted or incompatible. Please try another file.');
              if (onReset) onReset();
            }}
            loading={
              <div className="flex items-center justify-center p-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading PDF...</p>
                </div>
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              width={Math.min(window.innerWidth - 48, 800)}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              onRenderSuccess={(page) => {
                console.log('Page rendered:', page);
                const scale = page.width / page.originalWidth;
                console.log('Calculated scale:', scale);
                setPageScale(scale);
              }}
            />
          </Document>

          {/* Render Annotations */}
          {annotations
            .filter(ann => ann.pageNumber === currentPage)
            .map(ann => (
              <div
                key={ann.id}
                style={{
                  position: 'absolute',
                  left: ann.fieldType === 'checkbox' ? (ann.x * pageScale) - 6 : ann.x * pageScale,
                  top: ann.fieldType === 'checkbox' ? (ann.y * pageScale) - 6 : ann.y * pageScale,
                  width: ann.fieldType === 'checkbox' ? Math.max(ann.width * pageScale, 24) : ann.width * pageScale,
                  height: ann.fieldType === 'checkbox' ? Math.max(ann.height * pageScale, 24) : ann.height * pageScale,
                  padding: '0',
                  pointerEvents: 'auto',
                  zIndex: 1000,
                }}
              >
                {/* Render text fields */}
                {ann.type === 'formfield' && ann.isFormField && ann.fieldType === 'text' && (
                  <input
                    type="text"
                    value={ann.text || ''}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      updateAnnotationText(ann.id, newValue);

                      // Auto-advance to next field if this is part of a group (SSN/EIN)
                      if (ann.groupId && ann.groupIndex !== undefined && newValue.length === 1) {
                        // Find the next field in the group
                        const nextField = annotations.find(a =>
                          a.groupId === ann.groupId &&
                          a.groupIndex === (ann.groupIndex! + 1)
                        );
                        if (nextField) {
                          // Focus the next field
                          setTimeout(() => {
                            const nextInput = document.querySelector(`input[data-field-id="${nextField.id}"]`) as HTMLInputElement;
                            if (nextInput) {
                              nextInput.focus();
                              nextInput.select();
                            }
                          }, 0);
                        }
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      // iOS: Focus must happen during touch event, not in setTimeout
                      const target = e.target as HTMLInputElement;
                      target.focus();
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                    }}
                    data-field-id={ann.id}
                    data-form-field="true"
                    onFocus={(e) => {
                      e.target.style.backgroundColor = '#FFFFFF';
                      e.target.style.border = '1px solid #2563EB';
                      e.target.style.boxShadow = 'none';
                    }}
                    onBlur={(e) => {
                      e.target.style.backgroundColor = '#DBEAFE';
                      e.target.style.border = '0.5px solid #3B82F6';
                      e.target.style.boxShadow = 'none';
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: '0.5px solid #3B82F6',
                      boxShadow: 'none',
                      outline: 'none',
                      backgroundColor: '#DBEAFE',
                      fontSize: `${Math.max(Math.min((ann.fontSize || 12) * pageScale, (ann.height * pageScale) * 0.55), 10)}px`,
                      color: '#000000',
                      fontWeight: ann.groupId ? '600' : 'normal',
                      padding: ann.groupId ? '2px 1px' : '1px 3px',
                      boxSizing: 'border-box',
                      fontFamily: 'Helvetica, Arial, sans-serif',
                      transition: 'all 0.15s ease',
                      cursor: 'text',
                      pointerEvents: 'auto',
                      zIndex: 1001,
                      position: 'relative',
                      borderRadius: '2px',
                      overflow: 'visible',
                      textOverflow: 'clip',
                      whiteSpace: 'nowrap',
                      lineHeight: `${ann.height * pageScale - 4}px`,
                      textAlign: ann.width < 40 ? 'center' : 'left',
                      WebkitUserSelect: 'text',
                      userSelect: 'text',
                      WebkitTapHighlightColor: 'rgba(0,0,0,0)',
                      WebkitAppearance: 'none',
                      touchAction: 'manipulation',
                    }}
                    placeholder=""
                    autoComplete="off"
                    tabIndex={0}
                    maxLength={ann.width < 40 ? 1 : undefined}
                  />
                )}
                {/* Render checkboxes */}
                {ann.type === 'formfield' && ann.isFormField && ann.fieldType === 'checkbox' && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      console.log('🖱️ Checkbox clicked:', ann.id, 'Was:', ann.isChecked);
                      // Toggle checkbox
                      setAnnotations(prev =>
                        prev.map(a =>
                          a.id === ann.id
                            ? { ...a, isChecked: !a.isChecked, text: !a.isChecked ? '☑' : '☐' }
                            : a
                        )
                      );
                      console.log('🖱️ Now should be:', !ann.isChecked);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    tabIndex={0}
                    role="checkbox"
                    aria-checked={ann.isChecked}
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      pointerEvents: 'auto',
                      zIndex: 10000,
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: '#000000',
                      userSelect: 'none',
                      backgroundColor: 'transparent',
                      border: 'none',
                      boxSizing: 'border-box',
                    }}
                    title={ann.isChecked ? 'Checked - Click to uncheck' : 'Unchecked - Click to check'}
                  >
                    {ann.isChecked ? '✓' : ''}
                  </div>
                )}
                {/* Render fields without specified type as text inputs (fallback) */}
                {ann.type === 'formfield' && ann.isFormField && !ann.fieldType && (
                  <input
                    type="text"
                    value={ann.text || ''}
                    onChange={(e) => {
                      updateAnnotationText(ann.id, e.target.value);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      // iOS: Focus must happen during touch event, not in setTimeout
                      const target = e.target as HTMLInputElement;
                      target.focus();
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                    }}
                    data-form-field="true"
                    onFocus={(e) => {
                      e.target.style.backgroundColor = '#FFFFFF';
                      e.target.style.border = '3px solid #2563EB';
                    }}
                    onBlur={(e) => {
                      e.target.style.backgroundColor = '#DBEAFE';
                      e.target.style.border = '3px solid #3B82F6';
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      outline: 'none',
                      backgroundColor: 'transparent',
                      fontSize: `${Math.max(Math.min((ann.fontSize || 12) * pageScale, (ann.height * pageScale) * 0.6), 16)}px`,
                      color: ann.textColor || '#000',
                      padding: '1px 3px',
                      boxSizing: 'border-box',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      transition: 'all 0.15s ease',
                      cursor: 'text',
                      pointerEvents: 'auto',
                      zIndex: 1001,
                      position: 'relative',
                      borderRadius: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      lineHeight: `${ann.height * pageScale - 4}px`,
                      textAlign: ann.width < 40 ? 'center' : 'left',
                      WebkitUserSelect: 'text',
                      userSelect: 'text',
                      WebkitTapHighlightColor: 'rgba(0,0,0,0)',
                      WebkitAppearance: 'none',
                      touchAction: 'manipulation',
                    }}
                    placeholder=""
                    autoComplete="off"
                    tabIndex={0}
                    maxLength={ann.width < 40 ? 1 : undefined}
                  />
                )}
                {/* Render manually-placed text annotations */}
                {ann.type === 'text' && !ann.isFormField && (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      position: 'relative',
                      border: selectedAnnotation === ann.id ? '0.5px solid #6366f1' : 'none',
                      borderRadius: '2px',
                      backgroundColor: selectedAnnotation === ann.id ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
                      padding: '4px',
                      boxSizing: 'border-box',
                      cursor: selectedAnnotation === ann.id ? 'move' : 'default',
                    }}
                    onMouseDown={(e) => {
                      // Start dragging from anywhere except the input field
                      if (e.target !== e.currentTarget.querySelector('input')) {
                        e.stopPropagation();
                        if (pdfContainerRef.current) {
                          const annotationRect = e.currentTarget.getBoundingClientRect();
                          setDraggingId(ann.id);
                          setSelectedAnnotation(ann.id);
                          setDragOffset({
                            x: e.clientX - annotationRect.left,
                            y: e.clientY - annotationRect.top
                          });
                        }
                      }
                    }}
                    onTouchStart={(e) => {
                      // Start dragging from anywhere except the input field
                      if (e.target !== e.currentTarget.querySelector('input')) {
                        e.stopPropagation();
                        if (pdfContainerRef.current && e.touches.length === 1) {
                          const touch = e.touches[0];
                          const annotationRect = e.currentTarget.getBoundingClientRect();
                          setDraggingId(ann.id);
                          setSelectedAnnotation(ann.id);
                          setDragOffset({
                            x: touch.clientX - annotationRect.left,
                            y: touch.clientY - annotationRect.top
                          });
                        }
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAnnotation(ann.id);
                    }}
                  >
                    <input
                      type="text"
                      value={ann.text || ''}
                      onChange={(e) => {
                        updateAnnotationText(ann.id, e.target.value);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAnnotation(ann.id);
                      }}
                      onMouseDown={(e) => {
                        // Prevent drag from starting when clicking in input
                        e.stopPropagation();
                      }}
                      onFocus={(e) => {
                        e.target.parentElement!.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                        e.target.parentElement!.style.border = '0.5px solid rgba(99, 102, 241, 0.8)';
                        setSelectedAnnotation(ann.id);
                      }}
                      onBlur={(e) => {
                        e.target.parentElement!.style.backgroundColor = 'transparent';
                        e.target.parentElement!.style.border = selectedAnnotation === ann.id ? '0.5px solid #6366f1' : 'none';
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        fontSize: `${Math.min((ann.fontSize || 14) * pageScale, (ann.height * pageScale) * 0.6)}px`,
                        color: ann.textColor || '#000',
                        padding: '2px 4px',
                        boxSizing: 'border-box',
                        fontFamily: 'Helvetica, Arial, sans-serif',
                        cursor: 'text',
                        pointerEvents: 'auto',
                        zIndex: 1001,
                      }}
                      placeholder="Type here..."
                      autoComplete="off"
                      tabIndex={0}
                    />
                    {/* Resize handle - only show when selected */}
                    {selectedAnnotation === ann.id && (
                      <div
                        style={{
                          position: 'absolute',
                          right: -6,
                          bottom: -6,
                          width: 20,
                          height: 20,
                          backgroundColor: '#6366f1',
                          border: '2px solid white',
                          borderRadius: '50%',
                          cursor: 'nwse-resize',
                          pointerEvents: 'auto',
                          zIndex: 10,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setResizingId(ann.id);
                          setSelectedAnnotation(ann.id);
                          setResizeStart({
                            x: e.clientX,
                            y: e.clientY,
                            width: ann.width * pageScale,
                            height: ann.height * pageScale
                          });
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          if (e.touches.length === 1) {
                            const touch = e.touches[0];
                            setResizingId(ann.id);
                            setSelectedAnnotation(ann.id);
                            setResizeStart({
                              x: touch.clientX,
                              y: touch.clientY,
                              width: ann.width * pageScale,
                              height: ann.height * pageScale
                            });
                          }
                        }}
                      />
                    )}
                    {/* Action icons - delete and accept */}
                    {selectedAnnotation === ann.id && !draggingId && !resizingId && (
                      <div style={{
                        position: 'absolute',
                        top: -32,
                        right: 0,
                        display: 'flex',
                        gap: '4px',
                        zIndex: 10000,
                      }}>
                        {/* Accept/Check icon */}
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setSelectedAnnotation(null);
                          }}
                          onTouchEnd={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setSelectedAnnotation(null);
                          }}
                          style={{
                            width: '28px',
                            height: '28px',
                            padding: '0',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'auto',
                          }}
                        >
                          ✓
                        </button>
                        {/* Delete icon */}
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setAnnotations(prev => prev.filter(a => a.id !== ann.id));
                            setSelectedAnnotation(null);
                          }}
                          onTouchEnd={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setAnnotations(prev => prev.filter(a => a.id !== ann.id));
                            setSelectedAnnotation(null);
                          }}
                          style={{
                            width: '28px',
                            height: '28px',
                            padding: '0',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'auto',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {/* Render signatures */}
                {ann.type === 'signature' && ann.imageData && (
                  <div
                    data-signature="true"
                    onClick={(e) => {
                      if (!confirmedSignatureIds.has(ann.id)) {
                        e.stopPropagation();
                        setSelectedSignatureId(ann.id);
                      }
                    }}
                    onMouseDown={(e) => {
                      if (!confirmedSignatureIds.has(ann.id)) {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setDraggingId(ann.id);
                        setSelectedSignatureId(ann.id);
                        setDragOffset({
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top
                        });
                      }
                    }}
                    onTouchStart={(e) => {
                      if (!confirmedSignatureIds.has(ann.id)) {
                        e.stopPropagation();
                        const touch = e.touches[0];
                        const rect = e.currentTarget.getBoundingClientRect();
                        setDraggingId(ann.id);
                        setSelectedSignatureId(ann.id);
                        setDragOffset({
                          x: touch.clientX - rect.left,
                          y: touch.clientY - rect.top
                        });
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      position: 'relative',
                      cursor: confirmedSignatureIds.has(ann.id) ? 'default' : (draggingId === ann.id ? 'grabbing' : 'grab'),
                      pointerEvents: 'auto',
                      border: confirmedSignatureIds.has(ann.id)
                        ? 'none'
                        : (draggingId === ann.id || resizingId === ann.id || selectedSignatureId === ann.id ? '2px solid #6366f1' : '1px dashed rgba(99, 102, 241, 0.3)'),
                    }}
                  >
                    <img
                      src={ann.imageData}
                      alt="Signature"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        pointerEvents: 'none',
                        backgroundColor: 'transparent',
                      }}
                      draggable={false}
                    />
                    {/* Resize handle - only show if not confirmed */}
                    {!confirmedSignatureIds.has(ann.id) && (
                      <div
                        data-signature="true"
                        style={{
                          position: 'absolute',
                          right: -6,
                          bottom: -6,
                          width: 20,
                          height: 20,
                          backgroundColor: '#6366f1',
                          border: '2px solid white',
                          borderRadius: '50%',
                          cursor: 'nwse-resize',
                          pointerEvents: 'auto',
                          zIndex: 10,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setResizingId(ann.id);
                          setSelectedSignatureId(ann.id);
                          setResizeStart({
                            x: e.clientX,
                            y: e.clientY,
                            width: ann.width * pageScale,
                            height: ann.height * pageScale
                          });
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          const touch = e.touches[0];
                          setResizingId(ann.id);
                          setSelectedSignatureId(ann.id);
                          setResizeStart({
                            x: touch.clientX,
                            y: touch.clientY,
                            width: ann.width * pageScale,
                            height: ann.height * pageScale
                          });
                        }}
                      />
                    )}
                    {/* Confirm and Delete icon buttons - only show if selected and not confirmed */}
                    {selectedSignatureId === ann.id && !confirmedSignatureIds.has(ann.id) && !draggingId && !resizingId && (
                      <>
                        <button
                          onMouseDown={(e) => {
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            console.log('🗑️ Delete button clicked - Removing signature!');

                            setAnnotations(prev => prev.filter(a => a.id !== ann.id));
                            setSelectedSignatureId(null);
                          }}
                          title="Delete signature"
                          style={{
                            position: 'absolute',
                            top: -22,
                            right: 22,
                            width: 18,
                            height: 18,
                            backgroundColor: 'white',
                            color: '#000',
                            border: '1px solid #999',
                            borderRadius: '50%',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                            zIndex: 10000,
                            pointerEvents: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            filter: 'contrast(1.2)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.15)';
                            e.currentTarget.style.boxShadow = '0 3px 6px rgba(0,0,0,0.25)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
                          }}
                        >
                          🗑️
                        </button>
                        <button
                          onMouseDown={(e) => {
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            console.log('🖱️ Confirm button clicked - Signature locked!');

                            setConfirmedSignatureIds(prev => new Set([...prev, ann.id]));
                            setSelectedSignatureId(null);
                          }}
                          title="Confirm signature"
                          style={{
                            position: 'absolute',
                            top: -22,
                            right: 2,
                            width: 18,
                            height: 18,
                            backgroundColor: 'white',
                            color: '#000',
                            border: '1px solid #999',
                            borderRadius: '50%',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                            zIndex: 10000,
                            pointerEvents: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            filter: 'contrast(1.2)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.15)';
                            e.currentTarget.style.boxShadow = '0 3px 6px rgba(0,0,0,0.25)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
                          }}
                        >
                          ✓
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>

        {/* Info Panel - Form Fields */}
        {formFields.length > 0 && showFormFields && (
          <div style={{ marginTop: '20px', padding: '16px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #e0e7ff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '16px' }}>✓</span>
              </div>
              <strong style={{ fontSize: '15px', color: '#1e293b', fontWeight: '600' }}>Form Fields Ready</strong>
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px', lineHeight: '1.6' }}>
              {formFields.length} fillable field{formFields.length > 1 ? 's' : ''} automatically detected. Just click and type!
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.8', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <strong style={{ color: '#475569', display: 'block', marginBottom: '6px' }}>How to use:</strong>
              • Click any highlighted field to type or edit<br />
              • Use &quot;Add Signature&quot; to draw and place your signature<br />
              • Drag and resize signatures, then click ✓ to confirm<br />
              • Click &quot;Download PDF&quot; to save your completed document
            </div>
          </div>
        )}

        {/* No Fields Found */}
        {formFields.length === 0 && !isExtractingText && (
          <div style={{ marginTop: '20px', padding: '16px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', lineHeight: '1.6' }}>
              No fillable form fields detected in this PDF.<br/>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Use the tools above to add text or signatures manually.</span>
            </div>
          </div>
        )}
      </div>

      {/* Page Navigation */}
      <div className="bg-gradient-to-b from-gray-100 to-gray-200 border-t border-gray-300 p-3 flex items-center justify-center gap-3">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow font-medium text-sm"
        >
          ← Previous
        </button>
        <span className="text-sm font-medium text-gray-700 px-3">
          Page {currentPage} of {numPages}
        </span>
        <button
          onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
          disabled={currentPage === numPages}
          className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow font-medium text-sm"
        >
          Next →
        </button>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 99999, backgroundColor: 'rgba(0, 0, 0, 0.15)' }}>
          <div className="bg-white rounded-lg p-3 w-full mx-3 shadow-2xl border border-gray-300" style={{ maxWidth: '340px' }}>
            <h3 className="text-sm font-semibold mb-2 text-gray-800">Draw Your Signature</h3>
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
              <canvas ref={signatureCanvasRef} width={300} height={120} className="w-full" style={{ touchAction: 'none' }} />
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => signaturePadRef.current?.clear()}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  setShowSignatureModal(false);
                  setPendingSignaturePos(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={saveSignature}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Signature
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 99999, backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
          <div className="bg-white rounded-xl p-6 w-full mx-4 shadow-2xl border border-gray-300" style={{ maxWidth: '500px' }}>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Download PDF</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File name:
              </label>
              <input
                type="text"
                value={downloadFilename}
                onChange={(e) => setDownloadFilename(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base font-medium text-gray-900"
                placeholder="Enter filename..."
                autoFocus
                spellCheck={false}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    downloadPDF();
                  }
                }}
              />
              <p className="mt-2 text-xs text-gray-500">
                Your file will be saved to your default Downloads folder
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDownloadModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={downloadPDF}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 font-medium shadow-lg transition-all"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
