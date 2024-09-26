import {
  useQuery,
  getEmailTemplates,
  updateChat
} from 'wasp/client/operations';

import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { CgSpinner } from 'react-icons/cg';

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
  const [isCloudinaryLoaded, setIsCloudinaryLoaded] = useState(false);

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

const handleClearHistory = useCallback(() => {
  setChatHistory([]);
}, []);

const handleLogoUpload = useCallback((error: any, result: any) => {
  if (!error && result && result.event === "success") {
    console.log('Done! Here is the image info: ', result.info);
    setLogoUrl(result.info.secure_url);
  }
}, []);


const handlePreviewTemplate = useCallback((template: string) => {
  fetch(`/templates/${template}`)
    .then((response) => response.text())
    .then((html) => {
      setEmailContent(html);
    })
    .catch((error) => console.error("Error fetching HTML:", error));
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

if (emailTemplates.error) {
  console.error('Error fetching all email templates: ', emailTemplates.error);
}

if (emailTemplates.isLoading) {
  return <div> Loading templates...</div>
}

return (
  <div className='container mx-auto px-4 py-8'>
    <h1 className='text-4xl font-bold mb-8'>
      <span className='text-yellow-500'>AI</span> HTML Email Generator
    </h1>
    <div className='flex space-x-8'>
      <div className='w-1/2'>
        <div className='border rounded-3xl border-gray-900/10 dark:border-gray-100/10 p-6'>
          {logoUrl && (
          <div className='mb-4 flex justify-center'>
            <img src={logoUrl} alt="Uploaded logo" className="h-20 object-contain" />
          </div>
          )}
          {isCloudinaryLoaded ? (
            <LogoUploader onUpload={handleLogoUpload} />
          ) : (
            <div>Loading Cloudinary...</div>
          )}
          {emailTemplates.data && (
            <div className="mb-6">
              <TemplateSelector
                templates={emailTemplates.data}
                onPreview={handlePreviewTemplate}
              />
            </div>
          )}
          <div className='flex flex-col gap-3'>
            <input
              type='text'
              className='text-sm text-gray-600 w-full rounded-md border border-gray-200 bg-[#f5f0ff] shadow-md focus:outline-none focus:border-transparent focus:shadow-none duration-200 ease-in-out hover:shadow-none'
              placeholder='Enter your command to modify the email'
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
            />
            <button
              onClick={handleUpdateChat}
              className='min-w-[7rem] font-medium text-gray-800/90 bg-yellow-50 shadow-md ring-1 ring-inset ring-slate-200 py-2 px-4 rounded-md hover:bg-yellow-100 duration-200 ease-in-out focus:outline-none focus:shadow-none hover:shadow-none'
            >
              Update Email
            </button>
          </div>
          <div className='mt-6'>
            <h3 className='text-lg font-semibold mb-2'>Chat History</h3>
          <div className='max-h-60 overflow-y-auto'>
              {chatHistory.map((message, index) => (
                message.role === 'user' ? (
                  <div key={index} className="mb-2 text-blue-600">
                    <strong>You: </strong>
                    {message.content}
                  </div>
                ) : null
              ))}
            </div>
            <button
              onClick={handleClearHistory}
              className='mt-2 text-sm text-red-600 hover:text-red-800'
            >
              Clear History
            </button>
          </div>
          {/* <div>
            <NewTaskForm handleCreateTask={createTask} />
          </div> */}
        </div>
      </div>
      <div className='w-1/2'>
        <div className='border rounded-3xl border-gray-900/10 dark:border-gray-100/10 p-6'>
          <h3 className='text-2xl font-semibold mb-4'>HTML Email Preview</h3>
          <div className='bg-white p-4 rounded-md shadow-md'>
            {/* <div 
              style={{ 
                width: '100%', 
                maxWidth: '100%', 
                overflow: 'auto',
                wordWrap: 'break-word' 
              }} 
              dangerouslySetInnerHTML={{ __html: emailContent }} 
            /> */}
            <EmailPreview content={emailContent} isLoading={isEmailUpdating}/>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}


function LogoUploader({ onUpload }: { onUpload: (error: any, result: any) => void }) {
  const [widget, setWidget] = useState<any>(null);

  useEffect(() => {
    console.log('LogoUploader useEffect triggered');
    if (typeof window !== 'undefined' && window.cloudinary) {
      console.log('Cloudinary found, creating widget...');
      try {
        const widgetInstance = window.cloudinary.createUploadWidget(
          {
            cloudName: import.meta.env.REACT_APP_CLOUDINARY_CLOUD_NAME,
            uploadPreset: import.meta.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET
          },
          (error: any, result: any) => {
            console.log('Widget callback', error, result);
            if (error) {
              console.error('Widget error:', error);
            }
            if (result && result.event === "success") {
              console.log('Upload successful:', result.info.secure_url);
            }
            onUpload(error, result);
          }
        );
        console.log('Widget created', widgetInstance);
        setWidget(widgetInstance);
      } catch (error) {
        console.error('Error creating widget:', error);
      }
    } else {
      console.error('Cloudinary not available');
    }
  }, [onUpload]);

  const openWidget = useCallback(() => {
    console.log('Attempting to open widget', widget);
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
    <div className="mb-6">
      <button
        onClick={openWidget}
        className='min-w-[7rem] font-medium text-gray-800/90 bg-yellow-50 shadow-md ring-1 ring-inset ring-slate-200 py-2 px-4 rounded-md hover:bg-yellow-100 duration-200 ease-in-out focus:outline-none focus:shadow-none hover:shadow-none'
      >
        Upload Logo
      </button>
    </div>
  );
}


function TemplateSelector({ templates, onPreview }: {templates: string[], onPreview: (template: string) => void}) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  return (
    <div className='flex items-center gap-3'>
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
        className='min-w-[7rem] font-medium text-gray-800/90 bg-yellow-50 shadow-md ring-1 ring-inset ring-slate-200 py-2 px-4 rounded-md hover:bg-yellow-100 duration-200 ease-in-out focus:outline-none focus:shadow-none hover:shadow-none'
      >
        Preview
      </button>
    </div>
  );
}

function EmailPreview({ content, isLoading }: { content: string, isLoading: boolean}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      iframe.srcdoc = content;

      //Adjust iframe height to match content
      iframe.onload =() => {
        iframe.style.height = iframe.contentWindow?.document.body.scrollHeight + 'px';
      };
    }
  }, [content]);

  if (isLoading) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-gray-100">
        <CgSpinner className="animate-spin text-4xl text-yellow-500" />
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      title="Email Preview"
      className="w-full border-0"
      style={{ minHeight: '400px'}}
    />
  );
}

