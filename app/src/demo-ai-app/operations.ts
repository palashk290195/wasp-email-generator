import type { Task, GptResponse } from 'wasp/entities';
import type {
  GenerateGptResponse,
  CreateTask,
  DeleteTask,
  UpdateTask,
  GetGptResponses,
  GetAllTasksByUser,
  GetEmailTemplates,
  UpdateChat
} from 'wasp/server/operations';
import { HttpError } from 'wasp/server';
import { GeneratedSchedule } from './schedule';
import OpenAI from 'openai';
// import { promises as fs } from 'fs';
// import path from 'path';

const openai = setupOpenAI();
function setupOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    return new HttpError(500, 'OpenAI API key is not set');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

//#region Actions
type GptPayload = {
  hours: string;
};

export const generateGptResponse: GenerateGptResponse<GptPayload, GeneratedSchedule> = async ({ hours }, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const tasks = await context.entities.Task.findMany({
    where: {
      user: {
        id: context.user.id,
      },
    },
  });

  const parsedTasks = tasks.map(({ description, time }) => ({
    description,
    time,
  }));

  try {
    // check if openai is initialized correctly with the API key
    if (openai instanceof Error) {
      throw openai;
    }

    const hasCredits = context.user.credits > 0;
    const hasValidSubscription =
      !!context.user.subscriptionStatus &&
      context.user.subscriptionStatus !== 'deleted' &&
      context.user.subscriptionStatus !== 'past_due';
    const canUserContinue = hasCredits || hasValidSubscription;

    if (!canUserContinue) {
      throw new HttpError(402, 'User has not paid or is out of credits');
    } else {
      console.log('decrementing credits');
      await context.entities.User.update({
        where: { id: context.user.id },
        data: {
          credits: {
            decrement: 1,
          },
        },
      });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // you can use any model here, e.g. 'gpt-3.5-turbo', 'gpt-4', etc.
      messages: [
        {
          role: 'system',
          content:
            'you are an expert daily planner. you will be given a list of main tasks and an estimated time to complete each task. You will also receive the total amount of hours to be worked that day. Your job is to return a detailed plan of how to achieve those tasks by breaking each task down into at least 3 subtasks each. MAKE SURE TO ALWAYS CREATE AT LEAST 3 SUBTASKS FOR EACH MAIN TASK PROVIDED BY THE USER! YOU WILL BE REWARDED IF YOU DO.',
        },
        {
          role: 'user',
          content: `I will work ${hours} hours today. Here are the tasks I have to complete: ${JSON.stringify(
            parsedTasks
          )}. Please help me plan my day by breaking the tasks down into actionable subtasks with time and priority status.`,
        },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'parseTodaysSchedule',
            description: 'parses the days tasks and returns a schedule',
            parameters: {
              type: 'object',
              properties: {
                mainTasks: {
                  type: 'array',
                  description: 'Name of main tasks provided by user, ordered by priority',
                  items: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        description: 'Name of main task provided by user',
                      },
                      priority: {
                        type: 'string',
                        enum: ['low', 'medium', 'high'],
                        description: 'task priority',
                      },
                    },
                  },
                },
                subtasks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      description: {
                        type: 'string',
                        description:
                          'detailed breakdown and description of sub-task related to main task. e.g., "Prepare your learning session by first reading through the documentation"',
                      },
                      time: {
                        type: 'number',
                        description: 'time allocated for a given subtask in hours, e.g. 0.5',
                      },
                      mainTaskName: {
                        type: 'string',
                        description: 'name of main task related to subtask',
                      },
                    },
                  },
                },
              },
              required: ['mainTasks', 'subtasks', 'time', 'priority'],
            },
          },
        },
      ],
      tool_choice: {
        type: 'function',
        function: {
          name: 'parseTodaysSchedule',
        },
      },
      temperature: 1,
    });

    const gptArgs = completion?.choices[0]?.message?.tool_calls?.[0]?.function.arguments;

    if (!gptArgs) {
      throw new HttpError(500, 'Bad response from OpenAI');
    }

    console.log('gpt function call arguments: ', gptArgs);

    await context.entities.GptResponse.create({
      data: {
        user: { connect: { id: context.user.id } },
        content: JSON.stringify(gptArgs),
      },
    });

    return JSON.parse(gptArgs);
  } catch (error: any) {
    if (!context.user.subscriptionStatus && error?.statusCode != 402) {
      await context.entities.User.update({
        where: { id: context.user.id },
        data: {
          credits: {
            increment: 1,
          },
        },
      });
    }
    console.error(error);
    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || 'Internal server error';
    throw new HttpError(statusCode, errorMessage);
  }
};

export const createTask: CreateTask<Pick<Task, 'description'>, Task> = async ({ description }, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const task = await context.entities.Task.create({
    data: {
      description,
      user: { connect: { id: context.user.id } },
    },
  });

  return task;
};

export const updateTask: UpdateTask<Partial<Task>, Task> = async ({ id, isDone, time }, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const task = await context.entities.Task.update({
    where: {
      id,
    },
    data: {
      isDone,
      time,
    },
  });

  return task;
};

export const deleteTask: DeleteTask<Pick<Task, 'id'>, Task> = async ({ id }, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const task = await context.entities.Task.delete({
    where: {
      id,
    },
  });

  return task;
};

export const updateChat: UpdateChat<{
  systemPrompt: string;
  receiverProfileDetails: string;
  senderProfileDetails: string;
  purpose: string;
  userMessage: string;
  logoUrl: string;
  userChatHistory: Array<{ role: string; content: string }>;
  emailContent: string;
}, { success: boolean; response: string }> = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const hours = 24;
  try {
    // check if openai is initialized correctly with the API key
    if (openai instanceof Error) {
      throw openai;
    }

    // const hasCredits = context.user.credits > 0;
    // const hasValidSubscription =
    //   !!context.user.subscriptionStatus &&
    //   context.user.subscriptionStatus !== 'deleted' &&
    //   context.user.subscriptionStatus !== 'past_due';
    // const canUserContinue = hasCredits || hasValidSubscription;

    // if (!canUserContinue) {
    //   throw new HttpError(402, 'User has not paid or is out of credits');
    // } else {
    //   console.log('decrementing credits');
    //   await context.entities.User.update({
    //     where: { id: context.user.id },
    //     data: {
    //       credits: {
    //         decrement: 1,
    //       },
    //     },
    //   });
    // }
    const { systemPrompt, receiverProfileDetails, senderProfileDetails, purpose, userMessage, logoUrl, userChatHistory, emailContent } = args;
    console.log('update chat start ', systemPrompt);
    const messages = [
      {
        role: 'system',
        content: `${systemPrompt}\nReceiver Profile: ${receiverProfileDetails}\nSender Profile: ${senderProfileDetails}\nPurpose: ${purpose}\nLogo URL: ${logoUrl}`,
      },
      ...userChatHistory.map(message => ({
        role: message.role as 'user' | 'assistant',
        content: message.content
      })),
      {
        role: 'assistant',
        content: emailContent,
      },
      {
        role: 'user',
        content: userMessage,
      },
    ];
    console.log('update chat messages ', messages);
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // you can use any model here, e.g. 'gpt-3.5-turbo', 'gpt-4', etc.
      messages: messages.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      })),
      tools: [
        {
          type: 'function',
          function: {
            name: 'search_unsplash',
            description: 'Provide an image URL. Only call this function when there is a new requirement or replacement of image, don\'t call when image position needs to be changed.',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search query for the image'
                }
              },
              required: ['query']
            }
          }
        }
      ],
      temperature: 0,
    });
    console.log('update chat response ', response);

    // const gptArgs = completion?.choices[0]?.message?.tool_calls?.[0]?.function.arguments;

    // if (!gptArgs) {
    //   throw new HttpError(500, 'Bad response from OpenAI');
    // }

    // console.log('gpt function call arguments: ', gptArgs);

    // await context.entities.GptResponse.create({
    //   data: {
    //     user: { connect: { id: context.user.id } },
    //     content: JSON.stringify(gptArgs),
    //   },
    // });

    // return JSON.parse(gptArgs);
    const message = response.choices[0].message;
    let aiResponse: string = '';

    if (message.tool_calls) {
      console.log('update chat tool call ', message);
      const toolCall = message.tool_calls[0];
      if (toolCall.function.name === 'search_unsplash') {
        const toolArgs = JSON.parse(toolCall.function.arguments);
        const imageUrl = await searchUnsplash(toolArgs.query);
        
        // const functionCallResultMessage = {
        //   role: 'tool',
        //   content: JSON.stringify({
        //     query: toolArgs.query,
        //     image_url: imageUrl
        //   }),
        //   tool_call_id: toolCall.id
        // };

        // messages.push({ ...message, content: message.content ?? '' });
        // messages.push(functionCallResultMessage);

        // console.log('tool call messages ', messages);

        const secondResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            ...messages.map(msg => ({
              role: msg.role as 'system' | 'user' | 'assistant',
              content: msg.content
            })),
            {
              role: 'assistant',
              content: message.content ?? '',
              function_call: {
                name: 'search_unsplash',
                arguments: JSON.stringify({
                  query: toolArgs.query
                })
              }
            },
            {
              role: 'function',
              name: 'search_unsplash',
              content: JSON.stringify({
                query: toolArgs.query,
                image_url: imageUrl
              })
            }
          ],
          temperature: 0
        });

        aiResponse = secondResponse.choices[0].message.content ?? '';
      }
    } else {
      console.log('update chat no tool call ', message);
      aiResponse = message.content ?? '';
    }
    // Note: You might want to update the chat history in the database or state management here

    // TODO Save chat command to database
    // await context.entities.ChatCommand.create({
    //   data: {
    //     user: { connect: { id: context.user.id } },
    //     command: userMessage,
    //     response: aiResponse,
    //   }
    // });
    console.log('update chat final return ', aiResponse);
    return { success: true, response: aiResponse };
  } catch (error: any) {
    // if (!context.user.subscriptionStatus && error?.statusCode != 402) {
    //   await context.entities.User.update({
    //     where: { id: context.user.id },
    //     data: {
    //       credits: {
    //         increment: 1,
    //       },
    //     },
    //   });
    // }
    console.error('Error in updateChat: ', error);
    throw new HttpError(500, 'An unexpected error occured: ${error.message}');
  }
};
//#endregion

//#region Queries
export const getGptResponses: GetGptResponses<void, GptResponse[]> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }
  return context.entities.GptResponse.findMany({
    where: {
      user: {
        id: context.user.id,
      },
    },
  });
};

export const getAllTasksByUser: GetAllTasksByUser<void, Task[]> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }
  return context.entities.Task.findMany({
    where: {
      user: {
        id: context.user.id,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const getEmailTemplates: GetEmailTemplates<void, string[]> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  return ["EBooks.html", "Elephants.html", "Fashion Gallery.html", "Flash Sale.html", "Grand Opening.html", "Outdoors.html", "Sports Equipment.html"];
  
  // try {
  //   const templatesDir = path.join(__dirname, '..', '..', '..', 'public', 'templates');
  //   const files = await fs.readdir(templatesDir);
  //   console.log("files ", files);
  //   return files.filter((file: string) => path.extname(file).toLowerCase() === '.html');
  // } catch (error) {
  //   console.error('Error reading template directory:', error);
  //   throw new HttpError(500, 'Unable to fetch email templates');
  // }
};

async function searchUnsplash(query: string): Promise<string> {
  const response = await fetch(`https://api.unsplash.com/search/photos?query=${query}&client_id=${process.env.UNSPLASH_ACCESS_KEY}`);
  const data = await response.json();
  return data.results[0].urls.regular;
}

//#endregion