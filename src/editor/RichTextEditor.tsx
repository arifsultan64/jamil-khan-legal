import React, { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Image as ImageIcon,
  Indent,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Outdent,
  Quote,
  Redo,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo,
} from 'lucide-react';
import { estimateReadingTimeMinutes, stripHtml } from '../utils/formatters';
import { getDriveImageRenderUrl } from '../utils/driveUrls';
import { GoogleDrivePickerModal } from '../components/admin/GoogleDrivePickerModal';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onBlurSave?: (html: string) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  onBlurSave,
}) => {
  const [linkModal, setLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageModal, setImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [drivePickerOpen, setDrivePickerOpen] = useState(false);
  const [footnoteNum, setFootnoteNum] = useState(1);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
      Image.configure({ inline: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Subscript,
      Superscript,
    ],
    content: value || '',
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    onBlur: ({ editor: ed }) => {
      if (onBlurSave) onBlurSave(ed.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  const wordCount = (() => {
    const text = stripHtml(editor.getHTML());
    return text ? text.split(/\s+/).length : 0;
  })();

  const btnCls = (active = false) =>
    `p-2 min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded border text-xs font-medium transition-colors cursor-pointer ${
      active
        ? 'bg-[#0F2342] text-white border-[#0F2342]'
        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
    }`;

  const applyLink = () => {
    if (linkUrl.trim()) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl.trim() }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setLinkUrl('');
    setLinkModal(false);
  };

  const applyImage = () => {
    if (imageUrl.trim()) {
      editor.chain().focus().setImage({ src: getDriveImageRenderUrl(imageUrl.trim()) }).run();
    }
    setImageUrl('');
    setImageModal(false);
  };

  const insertFootnoteMarker = () => {
    editor.chain().focus().insertContent(`<sup>[${footnoteNum}]</sup>`).run();
    setFootnoteNum((n) => n + 1);
  };

  return (
    <div className="border border-slate-300 rounded-md bg-white overflow-hidden">
      {/* Word-Processor Style Toolbar */}
      <div className="bg-[#F8FAFC] border-b border-slate-200 p-2 flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => editor.chain().focus().undo().run()} className={btnCls()} title="Undo" aria-label="Undo">
          <Undo className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} className={btnCls()} title="Redo" aria-label="Redo">
          <Redo className="w-4 h-4" />
        </button>

        <span className="w-px h-6 bg-slate-300 mx-0.5" aria-hidden="true" />

        <select
          aria-label="Heading level"
          value={
            editor.isActive('heading', { level: 1 })
              ? 'h1'
              : editor.isActive('heading', { level: 2 })
              ? 'h2'
              : editor.isActive('heading', { level: 3 })
              ? 'h3'
              : editor.isActive('heading', { level: 4 })
              ? 'h4'
              : 'p'
          }
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'p') editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: Number(v.replace('h', '')) as 1 | 2 | 3 | 4 }).run();
          }}
          className="h-9 px-2 text-xs font-medium bg-white border border-slate-200 rounded text-slate-700"
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
        </select>

        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnCls(editor.isActive('bold'))} title="Bold" aria-label="Bold">
          <Bold className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnCls(editor.isActive('italic'))} title="Italic" aria-label="Italic">
          <Italic className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnCls(editor.isActive('underline'))} title="Underline" aria-label="Underline">
          <UnderlineIcon className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={btnCls(editor.isActive('strike'))} title="Strikethrough" aria-label="Strikethrough">
          <Strikethrough className="w-4 h-4" />
        </button>

        <span className="w-px h-6 bg-slate-300 mx-0.5" aria-hidden="true" />

        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnCls(editor.isActive('bulletList'))} title="Bullet List" aria-label="Bullet List">
          <List className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnCls(editor.isActive('orderedList'))} title="Numbered List" aria-label="Numbered List">
          <ListOrdered className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().sinkListItem('listItem').run()} className={btnCls()} title="Indent List" aria-label="Indent List">
          <Indent className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().liftListItem('listItem').run()} className={btnCls()} title="Outdent List" aria-label="Outdent List">
          <Outdent className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnCls(editor.isActive('blockquote'))} title="Blockquote" aria-label="Blockquote">
          <Quote className="w-4 h-4" />
        </button>

        <span className="w-px h-6 bg-slate-300 mx-0.5" aria-hidden="true" />

        <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btnCls(editor.isActive({ textAlign: 'left' }))} title="Align Left" aria-label="Align Left">
          <AlignLeft className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btnCls(editor.isActive({ textAlign: 'center' }))} title="Align Center" aria-label="Align Center">
          <AlignCenter className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btnCls(editor.isActive({ textAlign: 'right' }))} title="Align Right" aria-label="Align Right">
          <AlignRight className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={btnCls(editor.isActive({ textAlign: 'justify' }))} title="Justify" aria-label="Justify">
          <AlignJustify className="w-4 h-4" />
        </button>

        <span className="w-px h-6 bg-slate-300 mx-0.5" aria-hidden="true" />

        <button type="button" onClick={() => editor.chain().focus().toggleSuperscript().run()} className={btnCls(editor.isActive('superscript'))} title="Superscript" aria-label="Superscript">
          <SuperscriptIcon className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleSubscript().run()} className={btnCls(editor.isActive('subscript'))} title="Subscript" aria-label="Subscript">
          <SubscriptIcon className="w-4 h-4" />
        </button>
        <button type="button" onClick={insertFootnoteMarker} className={`${btnCls()} px-2.5`} title="Insert Footnote Citation Marker">
          Fn[{footnoteNum}]
        </button>

        <span className="w-px h-6 bg-slate-300 mx-0.5" aria-hidden="true" />

        <button type="button" onClick={() => setLinkModal((s) => !s)} className={btnCls(editor.isActive('link'))} title="Insert Hyperlink" aria-label="Insert Hyperlink">
          <LinkIcon className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => setImageModal((s) => !s)} className={btnCls()} title="Insert Image" aria-label="Insert Image">
          <ImageIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className={btnCls(editor.isActive('table'))}
          title="Insert 3x3 Table"
          aria-label="Insert Table"
        >
          <TableIcon className="w-4 h-4" />
        </button>
        {editor.isActive('table') && (
          <>
            <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} className={`${btnCls()} px-2`}>+Row</button>
            <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} className={`${btnCls()} px-2`}>+Col</button>
            <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} className={`${btnCls()} px-2 text-red-700`}>Del Table</button>
          </>
        )}
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btnCls()} title="Horizontal Rule" aria-label="Horizontal Rule">
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Inline Link Input */}
      {linkModal && (
        <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 min-w-[200px] px-3 py-1.5 text-xs border border-slate-300 rounded bg-white"
          />
          <button type="button" onClick={applyLink} className="px-3 py-1.5 text-xs font-medium text-white bg-[#0F2342] rounded cursor-pointer">
            Apply Link
          </button>
          <button type="button" onClick={() => setLinkModal(false)} className="px-3 py-1.5 text-xs text-slate-600 cursor-pointer">
            Cancel
          </button>
        </div>
      )}

      {/* Inline Image URL Input */}
      {imageModal && (
        <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Paste image or Google Drive URL, or browse Drive..."
            className="flex-1 min-w-[200px] px-3 py-1.5 text-xs border border-slate-300 rounded bg-white"
          />
          <button
            type="button"
            onClick={() => setDrivePickerOpen(true)}
            className="px-3 py-1.5 text-xs font-medium text-[#0F2342] bg-[#F4F0E8] border border-slate-300 rounded cursor-pointer"
          >
            Browse / Upload Drive
          </button>
          <button type="button" onClick={applyImage} className="px-3 py-1.5 text-xs font-medium text-white bg-[#0F2342] rounded cursor-pointer">
            Insert Image
          </button>
          <button type="button" onClick={() => setImageModal(false)} className="px-3 py-1.5 text-xs text-slate-600 cursor-pointer">
            Cancel
          </button>
        </div>
      )}

      {/* Editor Surface */}
      <div className="p-4 sm:p-6 legal-prose min-h-[380px] max-h-[650px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      {/* Footer Word Count */}
      <div className="bg-[#F8FAFC] border-t border-slate-200 px-4 py-2 flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
        <span>{wordCount} words</span>
        <span>Est. {estimateReadingTimeMinutes(editor.getHTML())} min read</span>
      </div>

      <GoogleDrivePickerModal
        isOpen={drivePickerOpen}
        onClose={() => setDrivePickerOpen(false)}
        accept=".jpg,.jpeg,.png,.webp"
        visibility="public"
        initialFilter="images"
        onSelected={(info) => {
          editor.chain().focus().setImage({ src: getDriveImageRenderUrl(info.url), alt: info.fileName }).run();
          setImageModal(false);
          setImageUrl('');
        }}
      />
    </div>
  );
};
