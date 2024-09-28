import {
  useQuery,
  getEmailTemplates,
  updateChat
} from 'wasp/client/operations';

import { useRef, useCallback, useEffect, useState } from 'react';
import { CgSpinner } from 'react-icons/cg';
import GrapesJsEditor from './GrapesJsEditor';
import 'grapesjs/dist/css/grapes.min.css';

declare global {
  interface Window {
    cloudinary: any;
  }
}

export default function DemoAppPage() {
  const [emailContent, setEmailContent] = useState<string>('');
  const [chatHistory, setChatHistory]= useState<Array<{ role: string; content: string}>>([]);
  const [userMessage, setUserMessage] = useState<string>('');
  const emailTemplates = useQuery(getEmailTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isEmailUpdating, setIsEmailUpdating] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('')
  const [primaryColor, setPrimaryColor] = useState<string>('');
  const [secondaryColor, setSecondaryColor] = useState<string>('');
  const [brandTone, setBrandTone] = useState<string>('');
  const [otherDetails, setOtherDetails] = useState<string>('');
  const [isCloudinaryLoaded, setIsCloudinaryLoaded] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<Array<{name: string, url: string}>>([]);
  const [isGrapesJsEditorOpen, setIsGrapesJsEditorOpen] = useState(false);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  const handleUpdateChat = useCallback(async () => {
    setIsEmailUpdating(true); //Start loading in Email preview screen
    try {
      const result = await updateChat({
        systemPrompt: 'You are an AI assistant that helps with email template modifications. Stick to only responsive HTML email responses. Nothing else at the start or the end, not even html tags',
        receiverProfileDetails: 'Default receiver',
        senderProfileDetails: 'Default sender',
        purpose: 'Email modification',
        userMessage,
        logoUrl: logoUrl,
        userChatHistory: chatHistory.filter(message => message.role === 'user'),
        emailContent
      });

      if (result.success) {
        setEmailContent(result.response);
        setChatHistory(prev => [...prev, {role: 'user', content: userMessage}, {role: 'assistant', content: result.response}]);
        setUserMessage('');
      }
    } catch (error) {
      console.error('Error updating chat: ', error);
    } finally {
      setIsEmailUpdating(false); //Stop loading regardless of success or failure
    }
}, [userMessage, selectedTemplate]);

// Add this new function
const handleSyncWithBrand = () => {
  // Implement the logic to sync with brand
  console.log('Syncing with brand...');
};

const handleClearHistory = useCallback(() => {
  setChatHistory([]);
}, []);

const handleLogoUpload = useCallback((error: any, result: any) => {
  if (!error && result && result.event === "success") {
    console.log('Done! Here is the image info: ', result.info);
    setLogoUrl(result.info.secure_url);
  }
}, []);

const handleTemplateUpload = useCallback((error: any, result: any) => {
  if (!error && result && result.event === "success") {
    console.log('Template uploaded successfully:', result.info);
    setCustomTemplates(prev => [...prev, {name: result.info.original_filename, url: result.info.secure_url}]);
  }
}, []);


const handlePreviewTemplate = useCallback((template: string) => {
  const customTemplate = customTemplates.find(t => t.name === template);
  if (customTemplate) {
    // This is a custom template uploaded to Cloudinary
    fetch(customTemplate.url)
      .then((response) => response.text())
      .then((html) => {
        setEmailContent(html);
      })
      .catch((error) => console.error("Error fetching custom template:", error));
  } else {
    // This is a pre-existing template
    fetch(`/templates/${template}`)
      .then((response) => response.text())
      .then((html) => {
        setEmailContent(html);
      })
      .catch((error) => console.error("Error fetching pre-existing template:", error));
  }
}, [customTemplates]);

const handleEditWithGrapesJs = useCallback(() => {
  setIsGrapesJsEditorOpen(true);
}, []);

const handleGrapesJsSave = useCallback((html: string) => {
  setEmailContent(html);
  setIsGrapesJsEditorOpen(false);
}, []);

const handleGrapesJsClose = useCallback(() => {
  setIsGrapesJsEditorOpen(false);
}, []);

useEffect(() => {
  if (typeof window !== 'undefined' && !window.cloudinary) {
    console.log('Cloudinary script not found, attempting to load...');
    const script = document.createElement('script');
    script.src = 'https://upload-widget.cloudinary.com/global/all.js';
    script.async = true;
    script.onload = () => {
      console.log('Cloudinary script loaded successfully');
      setIsCloudinaryLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Cloudinary script');
    };
    document.body.appendChild(script);
  } else if (window.cloudinary) {
    console.log('Cloudinary script already loaded');
    setIsCloudinaryLoaded(true);
  }
}, []);

useEffect(() => {
  if (chatHistoryRef.current) {
    chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
  }
}, [chatHistory]);

if (emailTemplates.error) {
  console.error('Error fetching all email templates: ', emailTemplates.error);
}

if (emailTemplates.isLoading) {
  return <div> Loading templates...</div>
}

return (
  <div className='mx-auto py-8 h-screen flex flex-col'>
    <h1 className='text-3xl font-bold mb-8'>
      <span className='text-yellow-500'>AI</span> HTML Email Generator
    </h1>
    <div className='flex gap-4 flex-grow overflow-hidden'>
      <div className='w-[34%] flex flex-col h-full'>
        <div className='border rounded-3xl border-gray-900/10 dark:border-gray-100/10 p-6 flex flex-col h-full overflow-auto'>
          <div className='flex items-center justify-between mb-4'>
            {isCloudinaryLoaded ? (
              <TemplateUploader onUpload={handleTemplateUpload} />
            ) : (
              <div>Loading Cloudinary...</div>
            )}
            {emailTemplates.data && (
              <TemplateSelector
                templates={[...emailTemplates.data, ...customTemplates.map(t => t.name)]}
                onPreview={handlePreviewTemplate}
              />
            )}
          </div>
          {logoUrl && (
            <div className='mb-4 flex justify-center'>
              <img src={logoUrl} alt="Uploaded logo" className="h-20 object-contain" />
            </div>
          )}
          <BrandSync 
            primaryColor={primaryColor}
            setPrimaryColor={setPrimaryColor}
            secondaryColor={secondaryColor}
            setSecondaryColor={setSecondaryColor}
            logoUrl={logoUrl}
            setLogoUrl={setLogoUrl}
            brandTone={brandTone}
            setBrandTone={setBrandTone}
            otherDetails={otherDetails}
            setOtherDetails={setOtherDetails}
          />
          <button
            onClick={handleSyncWithBrand}
            className='min-w-[7rem] font-medium text-gray-800/90 bg-yellow-50 shadow-md ring-1 ring-inset ring-slate-200 py-2 px-4 rounded-md hover:bg-yellow-100 duration-200 ease-in-out focus:outline-none focus:shadow-none hover:shadow-none'
          >
            Sync with Brand
          </button>
          <div className='flex flex-col gap-3'>
          <div className='flex-grow flex flex-col overflow-hidden p-4'>
              <h3 className='text-lg font-semibold mb-2'>Chat History</h3>
              <div className='flex-grow overflow-y-auto mb-4' ref={chatHistoryRef}>
                {chatHistory.map((message, index) => (
                  <div key={index} className={`mb-2 ${message.role === 'user' ? 'text-blue-600' : 'text-green-600'}`}>
                    <strong>{message.role === 'user' ? 'You: ' : 'AI: '}</strong>
                    {message.content}
                  </div>
                ))}
              </div>
              
            </div>
          </div>
          <div className='flex-shrink-0 mt-auto sticky bottom-0 bg-white p-4 border-t border-gray-200'>
            <div className="text-right">
              <button
                onClick={handleClearHistory}
                className='mt-2 text-sm text-red-600 hover:text-red-800'
              >
                Clear History
              </button>
            </div>
            <input
              type='text'
              className='text-sm text-gray-600 w-full rounded-md border border-gray-200 bg-[#f5f0ff] shadow-md focus:outline-none focus:border-transparent focus:shadow-none duration-200 ease-in-out hover:shadow-none'
              placeholder='Enter your command to modify the email'
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
            />
            <button
              onClick={handleUpdateChat}
              className='mt-2 w-full font-medium text-gray-800/90 bg-yellow-50 shadow-md ring-1 ring-inset ring-slate-200 py-2 px-4 rounded-md hover:bg-yellow-100 duration-200 ease-in-out focus:outline-none focus:shadow-none hover:shadow-none'
            >
              Update Email
            </button>
          </div>
        </div>
      </div>
      <div className='w-[60%] flex flex-col'>
        <div className='border rounded-3xl border-gray-900/10 dark:border-gray-100/10 p-6 flex flex-col h-full'>
          <div className='flex justify-between items-center mb-4'>
            <h3 className='text-2xl font-semibold'>HTML Email Preview</h3>
            {emailContent && (
              <button
                onClick={handleEditWithGrapesJs}
                className="min-w-[7rem] font-medium text-gray-800/90 bg-yellow-50 shadow-md ring-1 ring-inset ring-slate-200 py-2 px-4 rounded-md hover:bg-yellow-100 duration-200 ease-in-out focus:outline-none focus:shadow-none hover:shadow-none"
              >
                Edit
              </button>
            )}
          </div>
          <div className='bg-white p-4 rounded-md shadow-md flex-grow overflow-hidden'>
            <EmailPreview 
              content={emailContent} 
              isLoading={isEmailUpdating}
            />
          </div>
        </div>
      </div>
    </div>
    {isGrapesJsEditorOpen && (
      <div className="fixed inset-0 z-50 bg-white">
        <GrapesJsEditor
          initialContent={emailContent}
          onSave={handleGrapesJsSave}
          onClose={handleGrapesJsClose}
        />
      </div>
    )}
  </div>
);


function BrandSync({
  primaryColor, setPrimaryColor,
  secondaryColor, setSecondaryColor,
  logoUrl, setLogoUrl,
  brandTone, setBrandTone,
  otherDetails, setOtherDetails
}: {
  primaryColor: string, setPrimaryColor: (primaryColor: string) => void,
  secondaryColor: string, setSecondaryColor: (secondaryColor: string) => void,
  logoUrl: string, setLogoUrl: (logoUrl: string) => void,
  brandTone: string, setBrandTone: (brandTone: string) => void,
  otherDetails: string, setOtherDetails: (otherDetails: string) => void
}) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-2">Brand Details</h3>
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Primary Color"
          value={primaryColor}
          onChange={(e) => setPrimaryColor(e.target.value)}
          className='text-sm text-gray-600 w-full rounded-md border border-gray-200 bg-[#f5f0ff] shadow-md focus:outline-none focus:border-transparent focus:shadow-none duration-200 ease-in-out hover:shadow-none'
        />
        <input
          type="text"
          placeholder="Secondary Color"
          value={secondaryColor}
          onChange={(e) => setSecondaryColor(e.target.value)}
          className='text-sm text-gray-600 w-full rounded-md border border-gray-200 bg-[#f5f0ff] shadow-md focus:outline-none focus:border-transparent focus:shadow-none duration-200 ease-in-out hover:shadow-none'
        />
        <input
          type="text"
          placeholder="Logo URL"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          className='text-sm text-gray-600 w-full rounded-md border border-gray-200 bg-[#f5f0ff] shadow-md focus:outline-none focus:border-transparent focus:shadow-none duration-200 ease-in-out hover:shadow-none'
        />
        <input
          type="text"
          placeholder="Brand Tone"
          value={brandTone}
          onChange={(e) => setBrandTone(e.target.value)}
          className='text-sm text-gray-600 w-full rounded-md border border-gray-200 bg-[#f5f0ff] shadow-md focus:outline-none focus:border-transparent focus:shadow-none duration-200 ease-in-out hover:shadow-none'
        />
        <textarea
          placeholder="Other Details"
          value={otherDetails}
          onChange={(e) => setOtherDetails(e.target.value)}
          className='p-2 text-sm text-gray-600 w-full rounded-md border border-gray-200 bg-[#f5f0ff] shadow-md focus:outline-none focus:border-transparent focus:shadow-none duration-200 ease-in-out hover:shadow-none'
        />
      </div>
    </div>
  );
}

function TemplateUploader({ onUpload }: { onUpload: (error: any, result: any) => void }) {
  const [widget, setWidget] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.cloudinary) {
      try {
        const widgetInstance = window.cloudinary.createUploadWidget(
          {
            cloudName: import.meta.env.REACT_APP_CLOUDINARY_CLOUD_NAME,
            uploadPreset: import.meta.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET,
            sources: ['local'],
            multiple: false,
            maxFiles: 1,
            resourceType: 'raw',
            allowedFormats: ['html'],
          },
          (error: any, result: any) => {
            if (error) {
              console.error('Widget error:', error);
            }
            if (result && result.event === "success") {
              console.log('Upload successful:', result.info.secure_url);
            }
            onUpload(error, result);
          }
        );
        setWidget(widgetInstance);
      } catch (error) {
        console.error('Error creating widget:', error);
      }
    } else {
      console.error('Cloudinary not available');
    }
  }, [onUpload]);

  const openWidget = useCallback(() => {
    if (widget) {
      try {
        widget.open();
      } catch (error) {
        console.error('Error opening widget:', error);
      }
    } else {
      console.error('Widget not initialized');
    }
  }, [widget]);

  return (
    <div className="mr-4">
      <button onClick={openWidget} className='p-2 bg-yellow-50 rounded-md'>
        <img src="/upload-icon.png" alt="Upload HTML" className="w-6 h-6" />
      </button>
    </div>
  );
}

function TemplateSelector({ templates, onPreview }: {
  templates: string[], 
  onPreview: (template: string) => void
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  return (
    <div className='flex items-center gap-2'>
      <select
        className='text-sm text-gray-600 flex-grow rounded-md border border-gray-200 bg-[#f5f0ff] shadow-md focus:outline-none focus:border-transparent focus:shadow-none duration-200 ease-in-out hover:shadow-none'
        value={selectedTemplate}
        onChange={(e) => setSelectedTemplate(e.target.value)}
      >
        <option value="">Select a template</option>
        {templates.map((template) => (
          <option key={template} value={template}>{template}</option>
        ))}
      </select>
      <button
        type='button'
        onClick={() => onPreview(selectedTemplate)}
        disabled={!selectedTemplate}
        className='whitespace-nowrap font-medium text-gray-800/90 bg-yellow-50 shadow-md ring-1 ring-inset ring-slate-200 py-2 px-4 rounded-md hover:bg-yellow-100 duration-200 ease-in-out focus:outline-none focus:shadow-none hover:shadow-none'
      >
        Preview
      </button>
    </div>
  );
}

function EmailPreview({ content, isLoading}: { content: string, isLoading: boolean}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      iframe.srcdoc = content;
    }
  }, [content]);

  const handleCopyContent = useCallback(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        const selection = iframe.contentWindow.getSelection();
        const range = iframe.contentWindow.document.createRange();
        range.selectNodeContents(iframe.contentWindow.document.body);
        selection?.removeAllRanges();
        selection?.addRange(range);
        try {
          iframe.contentWindow.document.execCommand('copy');
          alert('Content copied to clipboard!');
        } catch (err) {
          console.error('Failed to copy text: ', err);
          alert('Failed to copy content. Please try manually selecting and copying.');
        } finally {
          selection?.removeAllRanges();
        }
      }    
    }
  }, []);

  const handleDownloadHTML = useCallback(() => {
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'email_template.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <CgSpinner className="animate-spin text-4xl text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-auto">
        <iframe
          ref={iframeRef}
          title="Email Preview"
          className="w-full h-full border-0"
        />
      </div>
      {content && (
        <div className="mt-4 flex justify-end space-x-4 sticky bottom-0 bg-white p-2 border-t">
          <button
            onClick={handleCopyContent}
            className="min-w-[7rem] font-medium text-gray-800/90 bg-yellow-50 shadow-md ring-1 ring-inset ring-slate-200 py-2 px-4 rounded-md hover:bg-yellow-100 duration-200 ease-in-out focus:outline-none focus:shadow-none hover:shadow-none"
          >
            Copy Content
          </button>
          <button
            onClick={handleDownloadHTML}
            className="min-w-[7rem] font-medium text-gray-800/90 bg-yellow-50 shadow-md ring-1 ring-inset ring-slate-200 py-2 px-4 rounded-md hover:bg-yellow-100 duration-200 ease-in-out focus:outline-none focus:shadow-none hover:shadow-none"
          >
            Download HTML
          </button>
        </div>
      )}
    </div>
  );
}
}