import React, { useEffect, useRef } from 'react';

import 'grapesjs/dist/css/grapes.min.css';

interface GrapesJsEditorProps {
  initialContent: string;
  onSave: (html: string) => void;
  onClose: () => void;
}

const GrapesJsEditor: React.FC<GrapesJsEditorProps> = ({ initialContent, onSave, onClose }) => {
  const editorRef = useRef<any>(null);

  useEffect(() => {
    const initEditor = async () => {
      const grapesjs = (await import('grapesjs')).default;
      const gjsPresetWebpage = (await import('grapesjs-preset-webpage')).default;
      const gjsPresetNewsletter = (await import('grapesjs-preset-newsletter')).default;

      if (!editorRef.current) {
        editorRef.current = grapesjs.init({
          container: '#gjs',
          plugins: [gjsPresetWebpage, gjsPresetNewsletter],
          pluginsOpts: {
            gjsPresetNewsletter: {
              // ... newsletter preset options (same as before)
            }
          },
          fromElement: false,
          components: initialContent,
          style: initialContent,
          storageManager: false,
          canvas: {
            styles: [
              'https://fonts.googleapis.com/css?family=Roboto',
              'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css'
            ],
          },
          assetManager: {
            upload: false
          },
        });

        // Add save button
        editorRef.current.Panels.addButton('options', {
          id: 'save-button',
          className: 'fa fa-floppy-o',
          command: 'save-command',
          attributes: { title: 'Save' }
        });

        // Add close button
        editorRef.current.Panels.addButton('options', {
          id: 'close-button',
          className: 'fa fa-times',
          command: 'close-command',
          attributes: { title: 'Close' }
        });

        // Save command
        editorRef.current.Commands.add('save-command', {
          run: function(editor: any) {
            const html = editor.getHtml();
            const css = editor.getCss();
            const fullHtml = `
              <style>${css}</style>
              ${html}
            `;
            onSave(fullHtml);
          }
        });

        // Close command
        editorRef.current.Commands.add('close-command', {
          run: function() {
            onClose();
          }
        });
      }
    };

    initEditor();

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [initialContent, onSave, onClose]);

  return <div id="gjs" style={{ height: '100vh' }}></div>;
};

export default GrapesJsEditor;