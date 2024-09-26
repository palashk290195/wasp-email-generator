import { type Task } from 'wasp/entities';

import {
  generateGptResponse,
  deleteTask,
  updateTask,
  createTask,
  useQuery,
  getAllTasksByUser,
  getEmailTemplates,
  updateChat
} from 'wasp/client/operations';

import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { CgSpinner } from 'react-icons/cg';
import { TiDelete } from 'react-icons/ti';
import type { GeneratedSchedule, MainTask, SubTask } from './schedule';
import { cn } from '../client/cn';

export default function DemoAppPage() {
  const [emailContent, setEmailContent] = useState<string>('');
  const [chatHistory, setChatHistory]= useState<Array<{ role: string; content: string}>>([]);
  const [userMessage, setUserMessage] = useState<string>('');
  const emailTemplates = useQuery(getEmailTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isEmailUpdating, setIsEmailUpdating] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('')

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
        window.alert("success");
        setEmailContent(result.response);
        window.alert(result.response);
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

const handleLogoUpload = useCallback((uploadedLogoUrl: string) => {
  setLogoUrl(uploadedLogoUrl);
}, []);

const handlePreviewTemplate = useCallback((template: string) => {
  fetch(`/templates/${template}`)
    .then((response) => response.text())
    .then((html) => {
      setEmailContent(html);
    })
    .catch((error) => console.error("Error fetching HTML:", error));
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
          <LogoUploader onUpload={handleLogoUpload}/>
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


function LogoUploader({onUpload}: {onUpload: (logoUrl: string) => void}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && typeof e.target.result === 'string') {
          setPreviewUrl(e.target.result);
          onUpload(e.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="mb-6">
      <div className='flex items-center gap-3'>
        <div className="relative flex-grow">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex items-center">
            <span className="flex-shrink-0 px-4 py-2 bg-gray-200 text-gray-700 rounded-l-md">Choose file</span>
            <span className="flex-grow px-4 py-2 bg-[#f5f0ff] text-gray-600 rounded-r-md border border-gray-200">
              {selectedFile ? selectedFile.name : "Upload logo"}
            </span>
          </div>
        </div>
        <button
          type='button'
          className='min-w-[7rem] font-medium text-gray-800/90 bg-yellow-50 shadow-md ring-1 ring-inset ring-slate-200 py-2 px-4 rounded-md hover:bg-yellow-100 duration-200 ease-in-out focus:outline-none focus:shadow-none hover:shadow-none'
        >
          Upload
        </button>
      </div>
      {selectedFile && (
        <div className="mt-2 text-sm text-gray-600">
          Selected file: {selectedFile.name}
        </div>
      )}
      {previewUrl && (
        <div className="mt-4">
          <img src={previewUrl} alt="Uploaded logo" className="h-20 w-20 object-contain" />
        </div>
      )}
    </div>
  );
}

// function LogoUploader({onUpload}: {onUpload: (logoUrl: string) => void}) {
//   const [selectedFile, setSelectedFile] = useState<File | null>(null);

//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files && e.target.files[0]) {
//       setSelectedFile(e.target.files[0]);
//     }
//   };

//   const handleUpload = () => {
//     if (selectedFile) {
//       const reader = new FileReader();
//       reader.onload = (e) => {
//         if (e.target && typeof e.target.result === 'string') {
//           onUpload(e.target.result);
//         }
//       };
//       reader.readAsDataURL(selectedFile);
//     }
//   };

//   return (
//     <div className="mb-6">
//       <h3 className='text-lg font-semibold mb-2'>Upload Logo</h3>
//       <div className='flex items-center gap-3'>
//         <input
//           type="file"
//           accept="image/*"
//           onChange={handleFileChange}
//           className="text-sm text-gray-600 flex-grow rounded-md border border-gray-200 bg-[#f5f0ff] shadow-md focus:outline-none focus:border-transparent focus:shadow-none duration-200 ease-in-out hover:shadow-none"
//         />
//         <button
//           type='button'
//           onClick={handleUpload}
//           disabled={!selectedFile}
//           className='min-w-[7rem] font-medium text-gray-800/90 bg-yellow-50 shadow-md ring-1 ring-inset ring-slate-200 py-2 px-4 rounded-md hover:bg-yellow-100 duration-200 ease-in-out focus:outline-none focus:shadow-none hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed'
//         >
//           Upload
//         </button>
//       </div>
//       {selectedFile && (
//         <div className="mt-2 text-sm text-gray-600">
//           Selected file: {selectedFile.name}
//         </div>
//       )}
//     </div>
//   );
// }

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

function NewTaskForm({ handleCreateTask }: { handleCreateTask: typeof createTask }) {
  const [description, setDescription] = useState<string>('');
  const [todaysHours, setTodaysHours] = useState<string>('8');
  const [response, setResponse] = useState<GeneratedSchedule | null>({
    mainTasks: [
      {
        name: 'Respond to emails',
        priority: 'high',
      },
      {
        name: 'Learn WASP',
        priority: 'low',
      },
      {
        name: 'Read a book',
        priority: 'medium',
      },
    ],
    subtasks: [
      {
        description: 'Read introduction and chapter 1',
        time: 0.5,
        mainTaskName: 'Read a book',
      },
      {
        description: 'Read chapter 2 and take notes',
        time: 0.3,
        mainTaskName: 'Read a book',
      },
      {
        description: 'Read chapter 3 and summarize key points',
        time: 0.2,
        mainTaskName: 'Read a book',
      },
      {
        description: 'Check and respond to important emails',
        time: 1,
        mainTaskName: 'Respond to emails',
      },
      {
        description: 'Organize and prioritize remaining emails',
        time: 0.5,
        mainTaskName: 'Respond to emails',
      },
      {
        description: 'Draft responses to urgent emails',
        time: 0.5,
        mainTaskName: 'Respond to emails',
      },
      {
        description: 'Watch tutorial video on WASP',
        time: 0.5,
        mainTaskName: 'Learn WASP',
      },
      {
        description: 'Complete online quiz on the basics of WASP',
        time: 1.5,
        mainTaskName: 'Learn WASP',
      },
      {
        description: 'Review quiz answers and clarify doubts',
        time: 1,
        mainTaskName: 'Learn WASP',
      },
    ],
  });
  const [isPlanGenerating, setIsPlanGenerating] = useState<boolean>(false);

  const { data: tasks, isLoading: isTasksLoading } = useQuery(getAllTasksByUser);

  const handleSubmit = async () => {
    try {
      await handleCreateTask({ description });
      setDescription('');
    } catch (err: any) {
      window.alert('Error: ' + (err.message || 'Something went wrong'));
    }
  };

  const handleGeneratePlan = async () => {
    try {
      setIsPlanGenerating(true);
      const response = await generateGptResponse({
        hours: todaysHours,
      });
      if (response) {
        setResponse(response);
      }
    } catch (err: any) {
      window.alert('Error: ' + (err.message || 'Something went wrong'));
    } finally {
      setIsPlanGenerating(false);
    }
  };

  return (
    <div className='flex flex-col justify-center gap-10'>
      <div className='flex flex-col gap-3'>
        <div className='flex items-center justify-between gap-3'>
          <input
            type='text'
            id='description'
            className='text-sm text-gray-600 w-full rounded-md border border-gray-200 bg-[#f5f0ff] shadow-md focus:outline-none focus:border-transparent focus:shadow-none duration-200 ease-in-out hover:shadow-none'
            placeholder='Add a request to modify email'
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSubmit();
              }
            }}
          />
          <button
            type='button'
            onClick={handleSubmit}
            className='min-w-[7rem] font-medium text-gray-800/90 bg-yellow-50 shadow-md ring-1 ring-inset ring-slate-200 py-2 px-4 rounded-md hover:bg-yellow-100 duration-200 ease-in-out focus:outline-none focus:shadow-none hover:shadow-none'
          >
            Submit
          </button>
        </div>
      </div>

      <div className='space-y-10 col-span-full'>
        {isTasksLoading && <div>Loading...</div>}
        {tasks!! && tasks.length > 0 ? (
          <div className='space-y-4'>
            {tasks.map((task: Task) => (
              <Todo key={task.id} id={task.id} isDone={task.isDone} description={task.description} time={task.time} />
            ))}
            <div className='flex flex-col gap-3'>
              <div className='flex items-center justify-between gap-3'>
                <label htmlFor='time' className='text-sm text-gray-600 dark:text-gray-300 text-nowrap font-semibold'>
                  How many hours will you work today?
                </label>
                <input
                  type='number'
                  id='time'
                  step={0.5}
                  min={1}
                  max={24}
                  className='min-w-[7rem] text-gray-800/90 text-center font-medium rounded-md border border-gray-200 bg-yellow-50 hover:bg-yellow-100 shadow-md focus:outline-none focus:border-transparent focus:shadow-none duration-200 ease-in-out hover:shadow-none'
                  value={todaysHours}
                  onChange={(e) => setTodaysHours(e.currentTarget.value)}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className='text-gray-600 text-center'>Add tasks to begin</div>
        )}
      </div>

      <button
        type='button'
        disabled={isPlanGenerating || tasks?.length === 0}
        onClick={() => handleGeneratePlan()}
        className='flex items-center justify-center min-w-[7rem] font-medium text-gray-800/90 bg-yellow-50 shadow-md ring-1 ring-inset ring-slate-200 py-2 px-4 rounded-md hover:bg-yellow-100 duration-200 ease-in-out focus:outline-none focus:shadow-none hover:shadow-none disabled:opacity-70 disabled:cursor-not-allowed'
      >
        {isPlanGenerating ? (
          <>
            <CgSpinner className='inline-block mr-2 animate-spin' />
            Generating...
          </>
        ) : (
          'Generate Schedule'
        )}
      </button>

      {!!response && (
        <div className='flex flex-col'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Today's Schedule</h3>

          <TaskTable schedule={response} />
        </div>
      )}
    </div>
  );
}

type TodoProps = Pick<Task, 'id' | 'isDone' | 'description' | 'time'>;

function Todo({ id, isDone, description, time }: TodoProps) {
  const handleCheckboxChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await updateTask({
      id,
      isDone: e.currentTarget.checked,
    });
  };

  const handleTimeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await updateTask({
      id,
      time: e.currentTarget.value,
    });
  };

  const handleDeleteClick = async () => {
    await deleteTask({ id });
  };

  return (
    <div className='flex items-center justify-between bg-purple-50 rounded-lg border border-gray-200 p-2 w-full'>
      <div className='flex items-center justify-between gap-5 w-full'>
        <div className='flex items-center gap-3'>
          <input
            type='checkbox'
            className='ml-1 form-checkbox bg-purple-300 checked:bg-purple-300 rounded border-purple-400 duration-200 ease-in-out hover:bg-purple-400 hover:checked:bg-purple-600 focus:ring focus:ring-purple-300 focus:checked:bg-purple-400 focus:ring-opacity-50 text-black'
            checked={isDone}
            onChange={handleCheckboxChange}
          />
          <span
            className={cn('text-slate-600', {
              'line-through text-slate-500': isDone,
            })}
          >
            {description}
          </span>
        </div>
        <div className='flex items-center gap-2'>
          <input
            id='time'
            type='number'
            min={0.5}
            step={0.5}
            className={cn(
              'w-18 h-8 text-center text-slate-600 text-xs rounded border border-gray-200 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-purple-300 focus:ring-opacity-50',
              {
                'pointer-events-none opacity-50': isDone,
              }
            )}
            value={time}
            onChange={handleTimeChange}
          />
          <span
            className={cn('italic text-slate-600 text-xs', {
              'text-slate-500': isDone,
            })}
          >
            hrs
          </span>
        </div>
      </div>
      <div className='flex items-center justify-end w-15'>
        <button className='p-1' onClick={handleDeleteClick} title='Remove task'>
          <TiDelete size='20' className='text-red-600 hover:text-red-700' />
        </button>
      </div>
    </div>
  );
}

function TaskTable({ schedule }: { schedule: GeneratedSchedule }) {
  return (
    <div className='flex flex-col gap-6 py-6'>
      <table className='table-auto w-full border-separate border border-spacing-2 rounded-md border-slate-200 shadow-sm'>
        {!!schedule.mainTasks ? (
          schedule.mainTasks
            .map((mainTask) => <MainTaskTable key={mainTask.name} mainTask={mainTask} subtasks={schedule.subtasks} />)
            .sort((a, b) => {
              const priorityOrder = ['low', 'medium', 'high'];
              if (a.props.mainTask.priority && b.props.mainTask.priority) {
                return (
                  priorityOrder.indexOf(b.props.mainTask.priority) - priorityOrder.indexOf(a.props.mainTask.priority)
                );
              } else {
                return 0;
              }
            })
        ) : (
          <div className='text-slate-600 text-center'>OpenAI didn't return any Main Tasks. Try again.</div>
        )}
      </table>

      {/* ))} */}
    </div>
  );
}

function MainTaskTable({ mainTask, subtasks }: { mainTask: MainTask; subtasks: SubTask[] }) {
  return (
    <>
      <thead>
        <tr>
          <th
            className={cn(
              'flex items-center justify-between gap-5 py-4 px-3 text-slate-800 border rounded-md border-slate-200 bg-opacity-70',
              {
                'bg-red-100': mainTask.priority === 'high',
                'bg-green-100': mainTask.priority === 'low',
                'bg-yellow-100': mainTask.priority === 'medium',
              }
            )}
          >
            <span>{mainTask.name}</span>
            <span className='opacity-70 text-xs font-medium italic'> {mainTask.priority} priority</span>
          </th>
        </tr>
      </thead>
      {!!subtasks ? (
        subtasks.map((subtask) => {
          if (subtask.mainTaskName === mainTask.name) {
            return (
              <tbody key={subtask.description}>
                <tr>
                  <td
                    className={cn(
                      'flex items-center justify-between gap-4 py-2 px-3 text-slate-600 border rounded-md border-purple-100 bg-opacity-60',
                      {
                        'bg-red-50': mainTask.priority === 'high',
                        'bg-green-50': mainTask.priority === 'low',
                        'bg-yellow-50': mainTask.priority === 'medium',
                      }
                    )}
                  >
                    <SubtaskTable description={subtask.description} time={subtask.time} />
                  </td>
                </tr>
              </tbody>
            );
          }
        })
      ) : (
        <div className='text-slate-600 text-center'>OpenAI didn't return any Subtasks. Try again.</div>
      )}
    </>
  );
}

function SubtaskTable({ description, time }: { description: string; time: number }) {
  const [isDone, setIsDone] = useState<boolean>(false);

  const convertHrsToMinutes = (time: number) => {
    if (time === 0) return 0;
    const hours = Math.floor(time);
    const minutes = Math.round((time - hours) * 60);
    return `${hours > 0 ? hours + 'hr' : ''} ${minutes > 0 ? minutes + 'min' : ''}`;
  };

  const minutes = useMemo(() => convertHrsToMinutes(time), [time]);

  return (
    <>
      <input
        type='checkbox'
        className='ml-1 form-checkbox bg-purple-500 checked:bg-purple-300 rounded border-purple-600 duration-200 ease-in-out hover:bg-purple-600 hover:checked:bg-purple-600 focus:ring focus:ring-purple-300 focus:checked:bg-purple-400 focus:ring-opacity-50'
        checked={isDone}
        onChange={(e) => setIsDone(e.currentTarget.checked)}
      />
      <span
        className={cn('leading-tight justify-self-start w-full text-slate-600', {
          'line-through text-slate-500 opacity-50': isDone,
        })}
      >
        {description}
      </span>
      <span
        className={cn('text-slate-600 text-right', {
          'line-through text-slate-500 opacity-50': isDone,
        })}
      >
        {minutes}
      </span>
    </>
  );
}
