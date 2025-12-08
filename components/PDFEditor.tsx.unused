'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import SignaturePad from 'signature_pad';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFEditorProps {
  file: File;
}

interface BaseAnnotation {
  id: string;
  pageNumber: number;
  color: string;
}

interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  text: string;
  x: number;
  y: number;
  fontSize: number;
  width?: number;
  height?: number;
}

interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlight' | 'strikethrough' | 'underline';
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ShapeAnnotation extends BaseAnnotation {
  type: 'rectangle' | 'circle' | 'line' | 'arrow';
  x: number;
  y: number;
  width: number;
  height: number;
  strokeWidth: number;
}

interface StickyNoteAnnotation extends BaseAnnotation {
  type: 'sticky';
  x: number;
  y: number;
  text: string;
}

interface SignatureAnnotation extends BaseAnnotation {
  type: 'signature';
  imageData: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FormFieldAnnotation extends BaseAnnotation {
  type: 'textfield' | 'checkbox' | 'radio';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  value?: string;
}

type Annotation = TextAnnotation | HighlightAnnotation | ShapeAnnotation | StickyNoteAnnotation | SignatureAnnotation | FormFieldAnnotation;

type Tool = 'select' | 'text' | 'highlight' | 'strikethrough' | 'underline' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'sticky' | 'signature' | 'textfield' | 'checkbox' | 'radio' | 'pan';

export default function PDFEditor({ file }: PDFEditorProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [history, setHistory] = useState<Annotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedTool, setSelectedTool] = useState<Tool>('select');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [fontSize, setFontSize] = useState(16);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [zoom, setZoom] = useState(1);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedSignature, setTypedSignature] = useState('');
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({});
  const [deletedPages, setDeletedPages] = useState<Set<number>>(new Set());
  const [savedSignatures, setSavedSignatures] = useState<string[]>([]);
  const [showSavedSignatures, setShowSavedSignatures] = useState(false);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentDrawing, setCurrentDrawing] = useState<Partial<Annotation> | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingPosition, setEditingPosition] = useState<{ x: number; y: number } | null>(null);
  const [draggingAnnotationId, setDraggingAnnotationId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Resizing state
  const [resizingAnnotationId, setResizingAnnotationId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<'se' | 'ne' | 'sw' | 'nw' | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showSignatureModal && signatureMode === 'draw' && signatureCanvasRef.current) {
      signaturePadRef.current = new SignaturePad(signatureCanvasRef.current, {
        backgroundColor: 'rgb(255, 255, 255)',
      });
    }
  }, [showSignatureModal, signatureMode]);

  // Load saved signatures from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pdf-editor-signatures');
    if (saved) {
      try {
        setSavedSignatures(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading saved signatures:', e);
      }
    }
  }, []);

  // Debug: Monitor editingPosition and editingTextId changes
  useEffect(() => {
    console.log('=== Text Editing State Changed ===');
    console.log('editingTextId:', editingTextId);
    console.log('editingText:', editingText);
    console.log('editingPosition:', editingPosition);
    console.log('================================');
  }, [editingTextId, editingText, editingPosition]);

  // Debug: Monitor annotations changes
  useEffect(() => {
    console.log('=== Annotations Changed ===');
    console.log('Total annotations:', annotations.length);
    annotations.forEach((ann, i) => {
      console.log(`  [${i}] ${ann.type} - id: ${ann.id}, page: ${ann.pageNumber}`);
    });
    console.log('=========================');
  }, [annotations]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const addToHistory = (newAnnotations: Annotation[]) => {
    console.log('addToHistory called with', newAnnotations.length, 'annotations');
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAnnotations);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setAnnotations(newAnnotations);
    console.log('Annotations state updated');
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations(history[historyIndex + 1]);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    console.log('handleMouseDown called, selectedTool:', selectedTool);

    // Allow select tool to work with annotations
    if (selectedTool === 'select') {
      // Check if clicking on an annotation
      const target = e.target as HTMLElement;
      if (target.closest('[data-annotation]')) {
        return; // Let annotation handler deal with it
      }
      return;
    }

    if (selectedTool === 'pan') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    console.log('Click position:', x, y);

    setStartPos({ x, y });

    if (selectedTool === 'text') {
      console.log('Text tool selected, opening editor at', x, y);
      e.stopPropagation();
      e.preventDefault();
      // Open text editor for new annotation
      setEditingTextId('new');
      setEditingText('');
      setEditingPosition({ x, y });
      console.log('State set for text editing');
      setTimeout(() => {
        console.log('Attempting to focus textarea, ref exists:', !!textInputRef.current);
        if (textInputRef.current) {
          textInputRef.current.focus();
          console.log('Textarea focused');
        }
      }, 100);
      return;
    } else if (selectedTool === 'sticky') {
      e.stopPropagation();
      const text = prompt('Enter note:');
      if (text) {
        const annotation: StickyNoteAnnotation = {
          id: Date.now().toString(),
          type: 'sticky',
          x,
          y,
          text,
          pageNumber: currentPage,
          color: selectedColor,
        };
        addToHistory([...annotations, annotation]);
      }
    } else if (selectedTool === 'signature') {
      setStartPos({ x, y });
      setShowSignatureModal(true);
    } else if (['textfield', 'checkbox', 'radio'].includes(selectedTool)) {
      const label = prompt('Enter field label:');
      if (label) {
        const annotation: FormFieldAnnotation = {
          id: Date.now().toString(),
          type: selectedTool as 'textfield' | 'checkbox' | 'radio',
          x,
          y,
          width: selectedTool === 'textfield' ? 200 : 20,
          height: selectedTool === 'textfield' ? 30 : 20,
          label,
          pageNumber: currentPage,
          color: selectedColor,
        };
        addToHistory([...annotations, annotation]);
      }
    } else if (['highlight', 'strikethrough', 'underline', 'rectangle', 'circle', 'line', 'arrow'].includes(selectedTool)) {
      setIsDrawing(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning && panStart) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (resizingAnnotationId && resizeStart) {
      handleAnnotationResize(e);
      return;
    }

    if (draggingAnnotationId) {
      handleAnnotationDrag(e);
      return;
    }

    if (!isDrawing || !startPos) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    const width = x - startPos.x;
    const height = y - startPos.y;

    if (['highlight', 'strikethrough', 'underline'].includes(selectedTool)) {
      const preview: HighlightAnnotation = {
        id: 'preview',
        type: selectedTool as 'highlight' | 'strikethrough' | 'underline',
        x: startPos.x,
        y: startPos.y,
        width,
        height,
        pageNumber: currentPage,
        color: selectedColor,
      };
      setCurrentDrawing(preview);
    } else if (['rectangle', 'circle', 'line', 'arrow'].includes(selectedTool)) {
      const preview: ShapeAnnotation = {
        id: 'preview',
        type: selectedTool as 'rectangle' | 'circle' | 'line' | 'arrow',
        x: startPos.x,
        y: startPos.y,
        width,
        height,
        strokeWidth,
        pageNumber: currentPage,
        color: selectedColor,
      };
      setCurrentDrawing(preview);
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    if (resizingAnnotationId) {
      stopResizeAnnotation();
      return;
    }

    if (draggingAnnotationId) {
      stopDragAnnotation();
      return;
    }

    if (isDrawing && currentDrawing) {
      const newAnnotation = { ...currentDrawing, id: Date.now().toString() } as Annotation;
      addToHistory([...annotations, newAnnotation]);
      setCurrentDrawing(null);
      setIsDrawing(false);
      setStartPos(null);
    }
  };

  const saveText = () => {
    console.log('saveText called', { editingTextId, editingText, editingPosition });

    if (!editingPosition) {
      console.log('No editing position, clearing state');
      setEditingTextId(null);
      setEditingText('');
      setEditingPosition(null);
      return;
    }

    // If text is empty, don't save
    if (!editingText.trim()) {
      console.log('Empty text, clearing state');
      setEditingTextId(null);
      setEditingText('');
      setEditingPosition(null);
      return;
    }

    if (editingTextId === 'new') {
      console.log('Creating new text annotation');
      const annotation: TextAnnotation = {
        id: Date.now().toString(),
        type: 'text',
        text: editingText,
        x: editingPosition.x,
        y: editingPosition.y,
        pageNumber: currentPage,
        fontSize,
        color: selectedColor,
        width: 200,
        height: 50,
      };
      const newAnnotations = [...annotations, annotation];
      console.log('Adding annotation to history', annotation);
      addToHistory(newAnnotations);
    } else {
      console.log('Updating existing text annotation');
      const updated = annotations.map(ann => {
        if (ann.id === editingTextId && ann.type === 'text') {
          return { ...ann, text: editingText };
        }
        return ann;
      });
      addToHistory(updated);
    }

    setEditingTextId(null);
    setEditingText('');
    setEditingPosition(null);
    console.log('Text saved and state cleared');
  };

  const startDragAnnotation = (e: React.MouseEvent, annotation: Annotation) => {
    if (selectedTool !== 'select') return;
    e.stopPropagation();

    setDraggingAnnotationId(annotation.id);
    const rect = pdfContainerRef.current?.getBoundingClientRect();
    if (rect) {
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      if ('x' in annotation && 'y' in annotation) {
        setDragOffset({
          x: x - annotation.x,
          y: y - annotation.y
        });
      }
    }
  };

  const handleAnnotationDrag = (e: React.MouseEvent) => {
    if (!draggingAnnotationId) return;

    const rect = pdfContainerRef.current?.getBoundingClientRect();
    if (rect) {
      const x = (e.clientX - rect.left) / zoom - dragOffset.x;
      const y = (e.clientY - rect.top) / zoom - dragOffset.y;

      const updated = annotations.map(ann => {
        if (ann.id === draggingAnnotationId && ('x' in ann)) {
          return { ...ann, x, y } as Annotation;
        }
        return ann;
      });
      setAnnotations(updated);
    }
  };

  const stopDragAnnotation = () => {
    if (draggingAnnotationId) {
      addToHistory(annotations);
      setDraggingAnnotationId(null);
    }
  };

  const editTextAnnotation = (annotation: TextAnnotation) => {
    if (selectedTool !== 'select') return;
    setEditingTextId(annotation.id);
    setEditingText(annotation.text);
    setEditingPosition({ x: annotation.x, y: annotation.y });
    setTimeout(() => textInputRef.current?.focus(), 0);
  };

  const startResizeAnnotation = (e: React.MouseEvent, annotation: Annotation, handle: 'se' | 'ne' | 'sw' | 'nw') => {
    if (selectedTool !== 'select') return;
    e.stopPropagation();

    setResizingAnnotationId(annotation.id);
    setResizeHandle(handle);

    if ('width' in annotation && 'height' in annotation) {
      setResizeStart({
        x: annotation.x,
        y: annotation.y,
        width: annotation.width,
        height: annotation.height,
      });
    }
  };

  const handleAnnotationResize = (e: React.MouseEvent) => {
    if (!resizingAnnotationId || !resizeStart) return;

    const rect = pdfContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentX = (e.clientX - rect.left) / zoom;
    const currentY = (e.clientY - rect.top) / zoom;

    const updated = annotations.map(ann => {
      if (ann.id === resizingAnnotationId && ('width' in ann) && ('height' in ann)) {
        let newWidth = ann.width;
        let newHeight = ann.height;
        let newX = ann.x;
        let newY = ann.y;

        if (resizeHandle === 'se') {
          // Southeast handle - resize from bottom-right
          newWidth = currentX - resizeStart.x;
          newHeight = currentY - resizeStart.y;
        } else if (resizeHandle === 'ne') {
          // Northeast handle - resize from top-right
          newWidth = currentX - resizeStart.x;
          newHeight = resizeStart.height - (currentY - resizeStart.y);
          newY = currentY;
        } else if (resizeHandle === 'sw') {
          // Southwest handle - resize from bottom-left
          newWidth = resizeStart.width - (currentX - resizeStart.x);
          newHeight = currentY - resizeStart.y;
          newX = currentX;
        } else if (resizeHandle === 'nw') {
          // Northwest handle - resize from top-left
          newWidth = resizeStart.width - (currentX - resizeStart.x);
          newHeight = resizeStart.height - (currentY - resizeStart.y);
          newX = currentX;
          newY = currentY;
        }

        // Ensure minimum size
        if (Math.abs(newWidth) < 50) newWidth = Math.sign(newWidth) * 50;
        if (Math.abs(newHeight) < 30) newHeight = Math.sign(newHeight) * 30;

        return { ...ann, x: newX, y: newY, width: newWidth, height: newHeight } as Annotation;
      }
      return ann;
    });
    setAnnotations(updated);
  };

  const stopResizeAnnotation = () => {
    if (resizingAnnotationId) {
      addToHistory(annotations);
      setResizingAnnotationId(null);
      setResizeHandle(null);
      setResizeStart(null);
    }
  };

  const saveSignatureToLibrary = (imageData: string) => {
    const newSignatures = [...savedSignatures, imageData];
    setSavedSignatures(newSignatures);
    localStorage.setItem('pdf-editor-signatures', JSON.stringify(newSignatures));
    console.log('Signature saved to library, total:', newSignatures.length);
  };

  const loadSignatureFromLibrary = (imageData: string) => {
    if (!startPos) return;

    console.log('Loading signature from library at position:', startPos.x, startPos.y);
    const signature: SignatureAnnotation = {
      id: Date.now().toString(),
      type: 'signature',
      imageData,
      x: startPos.x,
      y: startPos.y,
      width: 200,
      height: 100,
      pageNumber: currentPage,
      color: '#000000',
    };
    addToHistory([...annotations, signature]);
    setShowSignatureModal(false);
    setSelectedTool('select');
  };

  const saveSignature = async (saveToLibrary: boolean = false) => {
    if (!startPos) {
      console.log('No start position for signature');
      return;
    }

    let imageData = '';

    if (signatureMode === 'draw' && signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
      imageData = signaturePadRef.current.toDataURL();
      console.log('Got signature from drawing pad');
    } else if (signatureMode === 'type' && typedSignature) {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = '48px "Brush Script MT", cursive';
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2);
      imageData = canvas.toDataURL();
      console.log('Got signature from typed text');
    } else if (signatureMode === 'upload' && fileInputRef.current?.files?.[0]) {
      const reader = new FileReader();
      imageData = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(fileInputRef.current!.files![0]);
      });
      console.log('Got signature from uploaded file');
    }

    if (imageData) {
      console.log('Saving signature at position:', startPos.x, startPos.y, 'page:', currentPage);

      if (saveToLibrary) {
        saveSignatureToLibrary(imageData);
      }

      const signature: SignatureAnnotation = {
        id: Date.now().toString(),
        type: 'signature',
        imageData,
        x: startPos.x,
        y: startPos.y,
        width: 200,
        height: 100,
        pageNumber: currentPage,
        color: '#000000',
      };
      console.log('Created signature annotation:', signature.id, 'with image data length:', imageData.length);
      const newAnnotations = [...annotations, signature];
      console.log('Total annotations after adding signature:', newAnnotations.length);
      addToHistory(newAnnotations);
      console.log('Signature added to history, switching to select mode');
      // Switch to select mode so user can see and move the signature
      setSelectedTool('select');
    } else {
      console.log('No image data for signature');
      alert('Please draw, type, or upload a signature first');
      return;
    }

    setShowSignatureModal(false);
    setStartPos(null);
    setTypedSignature('');
    if (signaturePadRef.current) signaturePadRef.current.clear();
  };

  const rotatePage = (pageNum: number) => {
    const currentRotation = pageRotations[pageNum] || 0;
    setPageRotations({ ...pageRotations, [pageNum]: (currentRotation + 90) % 360 });
  };

  const deletePage = (pageNum: number) => {
    setDeletedPages(new Set([...deletedPages, pageNum]));
    if (currentPage === pageNum && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const deleteAnnotation = (id: string) => {
    addToHistory(annotations.filter(a => a.id !== id));
  };

  const handleZoom = (delta: number) => {
    setZoom(Math.max(0.5, Math.min(3, zoom + delta)));
  };

  const downloadPDF = async () => {
    try {
      const existingPdfBytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();

      // Handle page deletions
      const pagesToDelete = Array.from(deletedPages).sort((a, b) => b - a);
      for (const pageNum of pagesToDelete) {
        pdfDoc.removePage(pageNum - 1);
      }

      // Handle rotations
      for (const [pageNum, rotation] of Object.entries(pageRotations)) {
        const page = pages[parseInt(pageNum) - 1];
        if (page && !deletedPages.has(parseInt(pageNum))) {
          page.setRotation(degrees(rotation));
        }
      }

      // Add annotations
      for (const annotation of annotations) {
        if (deletedPages.has(annotation.pageNumber)) continue;

        const page = pages[annotation.pageNumber - 1];
        if (!page) continue;

        const { height } = page.getSize();
        const [r, g, b] = hexToRgb(annotation.color);

        if (annotation.type === 'text') {
          page.drawText(annotation.text, {
            x: annotation.x,
            y: height - annotation.y,
            size: annotation.fontSize,
            color: rgb(r / 255, g / 255, b / 255),
          });
        } else if (annotation.type === 'highlight') {
          page.drawRectangle({
            x: annotation.x,
            y: height - annotation.y - annotation.height,
            width: annotation.width,
            height: annotation.height,
            color: rgb(r / 255, g / 255, b / 255),
            opacity: 0.3,
          });
        } else if (annotation.type === 'strikethrough') {
          page.drawLine({
            start: { x: annotation.x, y: height - annotation.y - annotation.height / 2 },
            end: { x: annotation.x + annotation.width, y: height - annotation.y - annotation.height / 2 },
            color: rgb(r / 255, g / 255, b / 255),
            thickness: 2,
          });
        } else if (annotation.type === 'underline') {
          page.drawLine({
            start: { x: annotation.x, y: height - annotation.y - annotation.height },
            end: { x: annotation.x + annotation.width, y: height - annotation.y - annotation.height },
            color: rgb(r / 255, g / 255, b / 255),
            thickness: 2,
          });
        } else if (annotation.type === 'rectangle') {
          page.drawRectangle({
            x: annotation.x,
            y: height - annotation.y - annotation.height,
            width: annotation.width,
            height: annotation.height,
            borderColor: rgb(r / 255, g / 255, b / 255),
            borderWidth: annotation.strokeWidth,
          });
        } else if (annotation.type === 'circle') {
          page.drawEllipse({
            x: annotation.x + annotation.width / 2,
            y: height - annotation.y - annotation.height / 2,
            xScale: Math.abs(annotation.width) / 2,
            yScale: Math.abs(annotation.height) / 2,
            borderColor: rgb(r / 255, g / 255, b / 255),
            borderWidth: annotation.strokeWidth,
          });
        } else if (annotation.type === 'line' || annotation.type === 'arrow') {
          page.drawLine({
            start: { x: annotation.x, y: height - annotation.y },
            end: { x: annotation.x + annotation.width, y: height - annotation.y - annotation.height },
            color: rgb(r / 255, g / 255, b / 255),
            thickness: annotation.strokeWidth,
          });
        } else if (annotation.type === 'signature') {
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
        } else if (annotation.type === 'sticky') {
          page.drawText(`📝 ${annotation.text}`, {
            x: annotation.x,
            y: height - annotation.y - 20,
            size: 10,
            color: rgb(r / 255, g / 255, b / 255),
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `edited-${file.name}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  };

  const renderAnnotation = (annotation: Annotation) => {
    if (annotation.pageNumber !== currentPage) {
      console.log('Annotation not on current page:', annotation.id, 'page:', annotation.pageNumber, 'current:', currentPage);
      return null;
    }

    const commonStyle = {
      position: 'absolute' as const,
      left: annotation.type === 'text' ? annotation.x : annotation.x,
      top: annotation.type === 'text' ? annotation.y : annotation.y,
      pointerEvents: 'auto' as const,
      cursor: selectedTool === 'select' ? 'pointer' : 'default',
    };

    if (annotation.type === 'text') {
      // Don't render if currently editing
      if (editingTextId === annotation.id) {
        console.log('Text annotation being edited, not rendering:', annotation.id);
        return null;
      }

      console.log('Rendering text annotation:', annotation.id, annotation.text, 'at', annotation.x, annotation.y);

      return (
        <div
          key={annotation.id}
          data-annotation="true"
          style={{
            ...commonStyle,
            width: annotation.width || 200,
            height: annotation.height || 50,
            fontSize: annotation.fontSize,
            color: annotation.color,
            cursor: selectedTool === 'select' ? 'move' : 'default',
            userSelect: 'none',
            padding: '8px',
            border: selectedTool === 'select' ? '2px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(200, 200, 200, 0.3)',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            position: 'relative',
            wordWrap: 'break-word',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
          }}
          onMouseDown={(e) => startDragAnnotation(e, annotation)}
          onDoubleClick={() => editTextAnnotation(annotation)}
          className="font-sans group"
          title={selectedTool === 'select' ? 'Drag to move, resize with handles, double-click to edit, click X to delete' : ''}
        >
          {annotation.text}
          {selectedTool === 'select' && (
            <>
              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteAnnotation(annotation.id);
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600 z-10"
                style={{ pointerEvents: 'auto' }}
              >
                ×
              </button>
              {/* Resize handles */}
              <div
                onMouseDown={(e) => startResizeAnnotation(e, annotation, 'nw')}
                className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-nw-resize opacity-0 group-hover:opacity-100"
                style={{ pointerEvents: 'auto' }}
              />
              <div
                onMouseDown={(e) => startResizeAnnotation(e, annotation, 'ne')}
                className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-ne-resize opacity-0 group-hover:opacity-100"
                style={{ pointerEvents: 'auto' }}
              />
              <div
                onMouseDown={(e) => startResizeAnnotation(e, annotation, 'sw')}
                className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-sw-resize opacity-0 group-hover:opacity-100"
                style={{ pointerEvents: 'auto' }}
              />
              <div
                onMouseDown={(e) => startResizeAnnotation(e, annotation, 'se')}
                className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-se-resize opacity-0 group-hover:opacity-100"
                style={{ pointerEvents: 'auto' }}
              />
            </>
          )}
        </div>
      );
    }

    if (annotation.type === 'highlight' || annotation.type === 'strikethrough' || annotation.type === 'underline') {
      return (
        <div
          key={annotation.id}
          style={{
            ...commonStyle,
            width: annotation.width,
            height: annotation.height,
            backgroundColor: annotation.type === 'highlight' ? annotation.color : 'transparent',
            opacity: annotation.type === 'highlight' ? 0.3 : 1,
            borderBottom: annotation.type === 'underline' ? `2px solid ${annotation.color}` : 'none',
            borderTop: annotation.type === 'strikethrough' ? `2px solid ${annotation.color}` : 'none',
            marginTop: annotation.type === 'strikethrough' ? annotation.height / 2 : 0,
          }}
          onClick={() => selectedTool === 'select' && deleteAnnotation(annotation.id)}
          title="Click to delete"
        />
      );
    }

    if (annotation.type === 'rectangle') {
      return (
        <div
          key={annotation.id}
          style={{
            ...commonStyle,
            width: annotation.width,
            height: annotation.height,
            border: `${annotation.strokeWidth}px solid ${annotation.color}`,
          }}
          onClick={() => selectedTool === 'select' && deleteAnnotation(annotation.id)}
          title="Click to delete"
        />
      );
    }

    if (annotation.type === 'circle') {
      return (
        <div
          key={annotation.id}
          style={{
            ...commonStyle,
            width: annotation.width,
            height: annotation.height,
            border: `${annotation.strokeWidth}px solid ${annotation.color}`,
            borderRadius: '50%',
          }}
          onClick={() => selectedTool === 'select' && deleteAnnotation(annotation.id)}
          title="Click to delete"
        />
      );
    }

    if (annotation.type === 'line' || annotation.type === 'arrow') {
      const angle = Math.atan2(annotation.height, annotation.width);
      const length = Math.sqrt(annotation.width ** 2 + annotation.height ** 2);
      return (
        <div
          key={annotation.id}
          style={{
            ...commonStyle,
            width: length,
            height: annotation.strokeWidth,
            backgroundColor: annotation.color,
            transform: `rotate(${angle}rad)`,
            transformOrigin: '0 0',
          }}
          onClick={() => selectedTool === 'select' && deleteAnnotation(annotation.id)}
          title="Click to delete"
        />
      );
    }

    if (annotation.type === 'sticky') {
      return (
        <div
          key={annotation.id}
          style={commonStyle}
          onClick={() => selectedTool === 'select' && deleteAnnotation(annotation.id)}
          className="bg-yellow-200 p-2 rounded shadow-lg text-sm max-w-xs"
          title="Click to delete"
        >
          📝 {annotation.text}
        </div>
      );
    }

    if (annotation.type === 'signature') {
      console.log('Rendering signature annotation:', annotation.id, 'at', annotation.x, annotation.y, 'size:', annotation.width, 'x', annotation.height);
      return (
        <div
          key={annotation.id}
          data-annotation="true"
          style={{
            ...commonStyle,
            width: annotation.width,
            height: annotation.height,
            border: selectedTool === 'select' ? '2px solid rgba(59, 130, 246, 0.8)' : '2px dashed rgba(100, 100, 100, 0.3)',
            position: 'relative',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }}
          onMouseDown={(e) => startDragAnnotation(e, annotation)}
          className="group"
          title={selectedTool === 'select' ? 'Drag to move, resize with handles, click X to delete' : 'Switch to Select tool to move/resize'}
        >
          <img
            src={annotation.imageData}
            alt="Signature"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              pointerEvents: 'none',
              backgroundColor: 'transparent',
            }}
          />
          {selectedTool === 'select' && (
            <>
              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteAnnotation(annotation.id);
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600 z-10"
                style={{ pointerEvents: 'auto' }}
              >
                ×
              </button>
              {/* Resize handles */}
              <div
                onMouseDown={(e) => startResizeAnnotation(e, annotation, 'nw')}
                className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-nw-resize opacity-0 group-hover:opacity-100"
                style={{ pointerEvents: 'auto' }}
              />
              <div
                onMouseDown={(e) => startResizeAnnotation(e, annotation, 'ne')}
                className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-ne-resize opacity-0 group-hover:opacity-100"
                style={{ pointerEvents: 'auto' }}
              />
              <div
                onMouseDown={(e) => startResizeAnnotation(e, annotation, 'sw')}
                className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-sw-resize opacity-0 group-hover:opacity-100"
                style={{ pointerEvents: 'auto' }}
              />
              <div
                onMouseDown={(e) => startResizeAnnotation(e, annotation, 'se')}
                className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-se-resize opacity-0 group-hover:opacity-100"
                style={{ pointerEvents: 'auto' }}
              />
            </>
          )}
        </div>
      );
    }

    if (annotation.type === 'textfield' || annotation.type === 'checkbox' || annotation.type === 'radio') {
      return (
        <div
          key={annotation.id}
          style={commonStyle}
          onClick={() => selectedTool === 'select' && deleteAnnotation(annotation.id)}
          title="Click to delete"
        >
          {annotation.type === 'textfield' && (
            <input
              type="text"
              placeholder={annotation.label}
              className="border-2 border-gray-400 px-2 py-1"
              style={{ width: annotation.width, height: annotation.height }}
            />
          )}
          {annotation.type === 'checkbox' && (
            <label className="flex items-center gap-2">
              <input type="checkbox" className="w-5 h-5" />
              <span className="text-sm">{annotation.label}</span>
            </label>
          )}
          {annotation.type === 'radio' && (
            <label className="flex items-center gap-2">
              <input type="radio" className="w-5 h-5" />
              <span className="text-sm">{annotation.label}</span>
            </label>
          )}
        </div>
      );
    }

    return null;
  };

  const visiblePages = Array.from({ length: numPages }, (_, i) => i + 1).filter(
    (page) => !deletedPages.has(page)
  );

  return (
    <div className="flex h-screen">
      {/* Sidebar - macOS Style */}
      {showSidebar && (
        <div className="w-64 bg-white border-r border-gray-300 overflow-y-auto shadow-sm">
          <div className="p-4">
            <h3 className="font-semibold text-gray-700 mb-4 text-sm">THUMBNAILS</h3>
            <div className="space-y-3">
              {visiblePages.map((pageNum) => (
                <div key={pageNum} className="group">
                  <div
                    className={`cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${
                      currentPage === pageNum
                        ? 'border-blue-500 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    <Document file={file}>
                      <Page
                        pageNumber={pageNum}
                        width={200}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        rotate={pageRotations[pageNum] || 0}
                      />
                    </Document>
                  </div>
                  <div className="mt-2 text-xs text-center text-gray-600 font-medium">
                    Page {pageNum}
                  </div>
                  <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => rotatePage(pageNum)}
                      className="flex-1 px-2 py-1 text-xs bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-all"
                    >
                      ↻ Rotate
                    </button>
                    <button
                      onClick={() => deletePage(pageNum)}
                      className="flex-1 px-2 py-1 text-xs bg-white border border-red-300 text-red-600 rounded hover:bg-red-50 transition-all"
                    >
                      × Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {/* Top Toolbar - macOS Preview Style */}
        <div className="bg-gradient-to-b from-gray-100 to-gray-200 border-b border-gray-300 px-4 py-3 flex flex-wrap gap-4 items-center shadow-sm">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-sm shadow-sm transition-all"
          >
            ☰
          </button>

          <div className="h-6 w-px bg-gray-300" />

          {/* Tools - Segmented Control Style */}
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden inline-flex">
            {[
              { tool: 'select', icon: '↖', label: 'Select' },
              { tool: 'text', icon: 'Aa', label: 'Text' },
              { tool: 'signature', icon: '✍️', label: 'Sign' },
              { tool: 'highlight', icon: '🖍', label: 'Highlight' },
              { tool: 'rectangle', icon: '▭', label: 'Shape' },
              { tool: 'sticky', icon: '📝', label: 'Note' },
            ].map(({ tool, icon, label }, index, arr) => (
              <button
                key={tool}
                onClick={() => setSelectedTool(tool as Tool)}
                className={`px-4 py-2 text-sm font-medium transition-all ${
                  selectedTool === tool
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } ${index !== arr.length - 1 ? 'border-r border-gray-300' : ''}`}
                title={label}
              >
                <span className="text-base">{icon}</span>
                <span className="ml-1.5">{label}</span>
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-gray-300" />

          {/* Additional Tools Dropdown */}
          <div className="relative">
            <button
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-sm shadow-sm transition-all inline-flex items-center gap-2"
            >
              <span>More Tools</span>
              <span>▼</span>
            </button>
          </div>

          <div className="h-6 w-px bg-gray-300" />

          {/* Text Options */}
          <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm">
            <label className="text-xs text-gray-600 font-medium">Size:</label>
            <input
              type="number"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-14 px-2 py-1 border border-gray-300 rounded text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="8"
              max="72"
            />
          </div>

          {/* Color Picker */}
          <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm">
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
            />
          </div>

          <div className="flex-1" />

          {/* Undo/Redo */}
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden inline-flex">
            <button
              onClick={undo}
              disabled={historyIndex === 0}
              className="px-3 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed border-r border-gray-300 transition-all"
              title="Undo"
            >
              ↶
            </button>
            <button
              onClick={redo}
              disabled={historyIndex === history.length - 1}
              className="px-3 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Redo"
            >
              ↷
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden inline-flex items-center">
            <button
              onClick={() => handleZoom(-0.1)}
              className="px-3 py-2 text-gray-700 hover:bg-gray-50 border-r border-gray-300 transition-all"
            >
              −
            </button>
            <span className="px-3 py-2 text-sm text-gray-700 font-medium min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => handleZoom(0.1)}
              className="px-3 py-2 text-gray-700 hover:bg-gray-50 border-l border-gray-300 transition-all"
            >
              +
            </button>
          </div>

          {/* Download Button */}
          <button
            onClick={downloadPDF}
            className="px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium shadow-sm transition-all"
          >
            📥 Download
          </button>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto bg-gray-200">
          <div
            className="inline-block min-w-full"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
              padding: '40px',
            }}
          >
            <div
              ref={pdfContainerRef}
              className="relative bg-white shadow-2xl mx-auto"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: '0 0',
                cursor: selectedTool === 'pan' ? 'grab' : selectedTool !== 'select' ? 'crosshair' : 'default',
                width: 'fit-content',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
                className="pdf-document"
              >
                <Page
                  pageNumber={currentPage}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  rotate={pageRotations[currentPage] || 0}
                  className="pdf-page"
                />
              </Document>

              {/* Render all annotations */}
              {(() => {
                console.log('Rendering annotations, total count:', annotations.length, 'current page:', currentPage);
                return annotations.map(renderAnnotation);
              })()}
              {currentDrawing && renderAnnotation(currentDrawing as Annotation)}

              {/* Inline Text Editor */}
              {(() => {
                console.log('Textarea render check:', {
                  editingPosition,
                  editingTextId,
                  shouldRender: !!(editingPosition && editingTextId)
                });
                return null;
              })()}
              {editingPosition && editingTextId ? (
                <div
                  style={{
                    position: 'absolute',
                    left: editingPosition.x,
                    top: editingPosition.y,
                    zIndex: 10000,
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <textarea
                    ref={textInputRef}
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={saveText}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        saveText();
                      }
                      if (e.key === 'Escape') {
                        setEditingTextId(null);
                        setEditingText('');
                        setEditingPosition(null);
                      }
                    }}
                    style={{
                      fontSize: fontSize,
                      color: selectedColor,
                      minWidth: '200px',
                      minHeight: '50px',
                      width: '200px',
                      height: '50px',
                      padding: '8px',
                      border: '3px solid #3B82F6',
                      borderRadius: '6px',
                      outline: 'none',
                      resize: 'both',
                      fontFamily: 'inherit',
                      backgroundColor: 'white',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                    }}
                    placeholder="Type text here..."
                    autoFocus
                  />
                  <div className="text-xs text-gray-700 mt-2 bg-blue-100 px-3 py-2 rounded shadow-md border border-blue-300">
                    <strong>Enter</strong> to save • <strong>Shift+Enter</strong> for new line • <strong>Esc</strong> to cancel
                  </div>
                </div>
              ) : selectedTool === 'text' ? (
                <div style={{ position: 'absolute', top: 10, left: 10, color: 'red', zIndex: 10000, background: 'yellow', padding: '5px', fontSize: '14px' }}>
                  Debug: Text editor not shown - {!editingPosition ? 'No position' : !editingTextId ? 'No text ID' : 'Unknown'}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Bottom Navigation - macOS Style */}
        <div className="bg-gradient-to-b from-gray-100 to-gray-200 border-t border-gray-300 p-3 flex items-center justify-center gap-3 shadow-sm">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed text-gray-700 text-sm font-medium shadow-sm transition-all"
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-700 font-medium px-4">
            Page {currentPage} of {visiblePages.length}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(visiblePages.length, currentPage + 1))}
            disabled={currentPage === visiblePages.length}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed text-gray-700 text-sm font-medium shadow-sm transition-all"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 relative">
            <button
              onClick={() => {
                setShowSignatureModal(false);
                setStartPos(null);
                setTypedSignature('');
              }}
              className="absolute top-4 right-4 w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 text-xl font-bold transition-colors"
              title="Close"
            >
              ×
            </button>
            <h3 className="text-xl font-semibold mb-4">Add Signature</h3>

            {/* Signature Mode Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setSignatureMode('draw');
                  setShowSavedSignatures(false);
                }}
                className={`px-4 py-2 rounded ${
                  signatureMode === 'draw' && !showSavedSignatures ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
              >
                Draw
              </button>
              <button
                onClick={() => {
                  setSignatureMode('type');
                  setShowSavedSignatures(false);
                }}
                className={`px-4 py-2 rounded ${
                  signatureMode === 'type' && !showSavedSignatures ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
              >
                Type
              </button>
              <button
                onClick={() => {
                  setSignatureMode('upload');
                  setShowSavedSignatures(false);
                }}
                className={`px-4 py-2 rounded ${
                  signatureMode === 'upload' && !showSavedSignatures ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
              >
                Upload
              </button>
              {savedSignatures.length > 0 && (
                <button
                  onClick={() => setShowSavedSignatures(!showSavedSignatures)}
                  className={`px-4 py-2 rounded ${
                    showSavedSignatures ? 'bg-blue-600 text-white' : 'bg-gray-200'
                  }`}
                >
                  Saved ({savedSignatures.length})
                </button>
              )}
            </div>

            {/* Signature Input Area */}
            {!showSavedSignatures && signatureMode === 'draw' && (
              <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                <canvas
                  ref={signatureCanvasRef}
                  width={700}
                  height={200}
                  className="w-full"
                />
              </div>
            )}

            {!showSavedSignatures && signatureMode === 'type' && (
              <input
                type="text"
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
                placeholder="Type your signature"
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-4xl font-script"
                style={{ fontFamily: '"Brush Script MT", cursive' }}
              />
            )}

            {!showSavedSignatures && signatureMode === 'upload' && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
              />
            )}

            {showSavedSignatures && (
              <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto p-4 bg-gray-50 rounded-lg">
                {savedSignatures.map((sig, index) => (
                  <div
                    key={index}
                    className="border-2 border-gray-300 rounded-lg p-4 bg-white hover:border-blue-500 cursor-pointer transition-all"
                    onClick={() => loadSignatureFromLibrary(sig)}
                  >
                    <img src={sig} alt={`Saved signature ${index + 1}`} className="w-full h-24 object-contain" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newSigs = savedSignatures.filter((_, i) => i !== index);
                        setSavedSignatures(newSigs);
                        localStorage.setItem('pdf-editor-signatures', JSON.stringify(newSigs));
                      }}
                      className="mt-2 w-full px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            {!showSavedSignatures && (
              <div className="flex flex-col gap-2 mt-4">
                <div className="flex gap-3">
                  {signatureMode === 'draw' && (
                    <button
                      onClick={() => signaturePadRef.current?.clear()}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowSignatureModal(false);
                      setStartPos(null);
                      setTypedSignature('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => saveSignature(false)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add to PDF
                  </button>
                  <button
                    onClick={() => saveSignature(true)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Add & Save for Later
                  </button>
                </div>
              </div>
            )}
            {showSavedSignatures && (
              <div className="mt-4">
                <button
                  onClick={() => {
                    setShowSignatureModal(false);
                    setStartPos(null);
                  }}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
