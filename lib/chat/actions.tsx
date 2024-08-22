import 'server-only'

import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
  streamUI,
  createStreamableValue
} from 'ai/rsc'
import { openai } from '@ai-sdk/openai'

import {
  spinner,
  BotCard,
  BotMessage,
  SystemMessage,
  Stock,
  Purchase
} from '@/components/stocks'

import { z } from 'zod'
import { EventsSkeleton } from '@/components/stocks/events-skeleton'
import { Events } from '@/components/stocks/events'
import { StocksSkeleton } from '@/components/stocks/stocks-skeleton'
import { Stocks } from '@/components/stocks/stocks'
import { StockSkeleton } from '@/components/stocks/stock-skeleton'
import {
  formatNumber,
  runAsyncFnWithoutBlocking,
  sleep,
  nanoid
} from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { SpinnerMessage, UserMessage } from '@/components/stocks/message'
import { Chat, Message } from '@/lib/types'
import { auth } from '@/auth'

async function confirmPurchase(symbol: string, price: number, amount: number) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  const purchasing = createStreamableUI(
    <div className="inline-flex items-start gap-1 md:items-center">
      {spinner}
      <p className="mb-2">
        Purchasing {amount} ${symbol}...
      </p>
    </div>
  )

  const systemMessage = createStreamableUI(null)

  runAsyncFnWithoutBlocking(async () => {
    await sleep(1000)

    purchasing.update(
      <div className="inline-flex items-start gap-1 md:items-center">
        {spinner}
        <p className="mb-2">
          Purchasing {amount} ${symbol}... working on it...
        </p>
      </div>
    )

    await sleep(1000)

    purchasing.done(
      <div>
        <p className="mb-2">
          You have successfully purchased {amount} ${symbol}. Total cost:{' '}
          {formatNumber(amount * price)}
        </p>
      </div>
    )

    systemMessage.done(
      <SystemMessage>
        You have purchased {amount} shares of {symbol} at ${price}. Total cost ={' '}
        {formatNumber(amount * price)}.
      </SystemMessage>
    )

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'system',
          content: `[User has purchased ${amount} shares of ${symbol} at ${price}. Total cost = ${
            amount * price
          }]`
        }
      ]
    })
  })

  return {
    purchasingUI: purchasing.value,
    newMessage: {
      id: nanoid(),
      display: systemMessage.value
    }
  }
}

async function submitUserMessage(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  const result = await streamUI({
    model: openai('gpt-4o'),
    initial: <SpinnerMessage />,
    system: `\
    <instruction>
        You are an AI-based labor consultant designed to provide professional advice on labor issues in South Korea. The user is a Korean speaker and will communicate in Korean. Your mission is to assist the user with various labor-related inquiries such as employment contracts, wages, working hours, dismissal, and more. Ensure all responses are clear, concise, and in Korean.
    </instruction>
    
    <missions>
        <mission>
            <type>General Inquiry</type>
            <task>Ask the user what specific labor issue they need help with and provide relevant guidance.</task>
            <example>
                "안녕하세요! 저는 노무사 AI입니다. 어떤 문제가 있으신가요? ��체적으로 말씀해주시면 도와드릴 수 있습니다."
            </example>
        </mission>
        
        <mission>
            <type>Employment Contract</type>
            <task>Provide advice on employment contracts, such as drafting, reviewing, and understanding the terms.</task>
            <example>
                "근로계약서를 작성하거나 검토 중이신가요? 구체적인 내용을 알려주시면 도와드릴 수 있습니다."
            </example>
        </mission>
        
        <mission>
            <type>Wages</type>
            <task>Advise the user on wage-related issues, including wage payment, arrears, and minimum wage.</task>
            <example>
                "임금과 관련된 문제가 있으신가요? 체불 임금, 최저임금, 임금 명세서 등 구체적인 사항을 말씀해주세요."
            </example>
        </mission>
        
        <mission>
            <type>Dismissal and Resignation</type>
            <task>Provide guidance on issues related to dismissal, severance pay, and resignation procedures.</task>
            <example>
                "해고와 관련된 문제를 겪고 계신가요? 부당해고 여부를 확인하거나 퇴직금을 계산하는 데 도움이 필요하시면 알려주세요."
            </example>
        </mission>
        
        <mission>
            <type>Working Hours and Leave</type>
            <task>Assist with inquiries about working hours, overtime, leave, and break times.</task>
            <example>
                "근로시간이 지나치게 길다고 생각하시나요? 연장근로, 야근, 주 52시간제 등에 대해 상담해드릴 수 있습니다."
            </example>
        </mission>
        
        <mission>
            <type>Industrial Accident and Safety</type>
            <task>Advise the user on issues related to industrial accidents, workers' compensation insurance, and safety measures.</task>
            <example>
                "산업재해를 겪으셨나요? 산재보험 신청 절차와 보상 범위에 대해 도와드릴 수 있습니다."
            </example>
        </mission>
        
        <mission>
            <type>Legal Advice and Litigation</type>
            <task>Provide legal advice on labor laws and guide the user through litigation procedures.</task>
            <example>
                "노동법과 관련된 법률 상담이 필요하신가요? 구체적인 상황을 설명해주시면 관련 법규와 소송 절차를 안내해드리겠습니다."
            </example>
        </mission>
        
        <mission>
            <type>Consultation Records</type>
            <task>Refer to previous consultation records to provide continuous support.</task>
            <example>
                "이전에 상담하신 내역을 조회 중입니다. 같은 문제에 대한 추가 상담이 필요한가요?"
            </example>
        </mission>
        
        <mission>
            <type>Case Studies</type>
            <task>Provide information on legal judgments and similar cases relevant to the user's situation.</task>
            <example>
                "이와 비슷한 상황에서의 법적 판례를 찾고 계신가요? 관련된 사례와 법적 근거를 찾아드릴 수 있습니다."
            </example>
        </mission>
        
        <mission>
            <type>Feedback Request</type>
            <task>Ask for feedback from the user after the consultation to improve service quality.</task>
            <example>
                "이번 상담이 도움이 되셨나요? 더 나은 서비스를 위해 피드백을 남겨주시면 감사하겠습니다."
            </example>
        </mission>
    </missions>
    
    <output_format>
        <format>
            <type>text</type>
            <language>Korean</language>
            <example>
                "안녕하세요! 어떤 노동 문제를 도와드릴까요?"
            </example>
        </format>
    </output_format>

    Messages inside [] means that it's a UI element or a user event. For example:
    - "[Price of AAPL = 100]" means that an interface of the stock price of AAPL is shown to the user.
    - "[User has changed the amount of AAPL to 10]" means that the user has changed the amount of AAPL to 10 in the UI.
    
    If the user requests purchasing a stock, call \`show_stock_purchase_ui\` to show the purchase UI.
    If the user just wants the price, call \`show_stock_price\` to show the price.
    If you want to show trending stocks, call \`list_stocks\`.
    If you want to show events, call \`get_events\`.
    If the user wants to sell stock, or complete another impossible task, respond that you are a demo and cannot do that.
    
    Besides that, you can also chat with users and do some calculations if needed.`,
    messages: [
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name
      }))
    ],
    text: ({ content, done, delta }) => {
      if (!textStream) {
        textStream = createStreamableValue('')
        textNode = <BotMessage content={textStream.value} />
      }

      if (done) {
        textStream.done()
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'assistant',
              content
            }
          ]
        })
      } else {
        textStream.update(delta)
      }

      return textNode
    },
    tools: {
      calculateSeverancePay: {
        description: '퇴직금 계산하기',
        parameters: z.object({
          monthlyWage: z.number().describe('월 평균 임금'),
          yearsWorked: z.number().describe('근속 연수')
        }),
        generate: async function* ({ monthlyWage, yearsWorked }) {
          yield (
            <BotCard>
              <div>퇴직금 계산 중...</div>
            </BotCard>
          )

          await sleep(1000)

          const severancePay = monthlyWage * yearsWorked

          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'calculateSeverancePay',
                    toolCallId,
                    args: { monthlyWage, yearsWorked }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'calculateSeverancePay',
                    toolCallId,
                    result: { severancePay }
                  }
                ]
              }
            ]
          })

          return (
            <BotCard>
              <div>
                퇴직금 계산 결과: {severancePay.toLocaleString()}원
              </div>
            </BotCard>
          )
        }
      },
      calculateOvertimePay: {
        description: '초과 근무 수당 계산하기',
        parameters: z.object({
          hourlyWage: z.number().describe('시간당 임금'),
          overtimeHours: z.number().describe('초과 근무 시간')
        }),
        generate: async function* ({ hourlyWage, overtimeHours }) {
          yield (
            <BotCard>
              <div>초과 근무 수당 계산 중...</div>
            </BotCard>
          )

          await sleep(1000)

          const overtimePay = hourlyWage * 1.5 * overtimeHours

          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'calculateOvertimePay',
                    toolCallId,
                    args: { hourlyWage, overtimeHours }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'calculateOvertimePay',
                    toolCallId,
                    result: { overtimePay }
                  }
                ]
              }
            ]
          })

          return (
            <BotCard>
              <div>
                초과 근무 수당 계산 결과: {overtimePay.toLocaleString()}원
              </div>
            </BotCard>
          )
        }
      },
      calculateAnnualLeave: {
        description: '연차 휴가 일수 계산하기',
        parameters: z.object({
          workingDays: z.number().describe('근무 일수')
        }),
        generate: async function* ({ workingDays }) {
          yield (
            <BotCard>
              <div>연차 휴가 일수 계산 중...</div>
            </BotCard>
          )

          await sleep(1000)

          let annualLeave = 0
          if (workingDays >= 80) {
            annualLeave = Math.floor(workingDays / 30) + 11
          }

          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'calculateAnnualLeave',
                    toolCallId,
                    args: { workingDays }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'calculateAnnualLeave',
                    toolCallId,
                    result: { annualLeave }
                  }
                ]
              }
            ]
          })

          return (
            <BotCard>
              <div>
                연차 휴가 일수 계산 결과: {annualLeave}일
              </div>
            </BotCard>
          )
        }
      },
      checkLegalWorkingHours: {
        description: '법정 근로시간 준수 여부 확인하기',
        parameters: z.object({
          weeklyHours: z.number().describe('주간 근로시간')
        }),
        generate: async function* ({ weeklyHours }) {
          yield (
            <BotCard>
              <div>법정 근로시간 준수 여부 확인 중...</div>
            </BotCard>
          )

          await sleep(1000)

          const isLegal = weeklyHours <= 52
          const message = isLegal
            ? '법정 근로시간을 준수하고 있습니다.'
            : '법정 근로시간을 초과하고 있습니다. 주 52시간을 초과하지 않도록 주의해야 합니다.'

          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'checkLegalWorkingHours',
                    toolCallId,
                    args: { weeklyHours }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'checkLegalWorkingHours',
                    toolCallId,
                    result: { isLegal, message }
                  }
                ]
              }
            ]
          })

          return (
            <BotCard>
              <div>{message}</div>
            </BotCard>
          )
        }
      }
    }
  })

  return {
    id: nanoid(),
    display: result.value
  }
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
    confirmPurchase
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onGetUIState: async () => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const aiState = getAIState() as Chat

      if (aiState) {
        const uiState = getUIStateFromAIState(aiState)
        return uiState
      }
    } else {
      return
    }
  },
  onSetAIState: async ({ state }) => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const { chatId, messages } = state

      const createdAt = new Date()
      const userId = session.user.id as string
      const path = `/chat/${chatId}`

      const firstMessageContent = messages[0].content as string
      const title = firstMessageContent.substring(0, 100)

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path
      }

      await saveChat(chat)
    } else {
      return
    }
  }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display:
        message.role === 'tool' ? (
          message.content.map(tool => {
            return tool.toolName === 'listStocks' ? (
              <BotCard>
                {/* TODO: Infer types based on the tool result*/}
                {/* @ts-expect-error */}
                <Stocks props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPrice' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Stock props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPurchase' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Purchase props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'getEvents' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Events props={tool.result} />
              </BotCard>
            ) : null
          })
        ) : message.role === 'user' ? (
          <UserMessage>{message.content as string}</UserMessage>
        ) : message.role === 'assistant' &&
          typeof message.content === 'string' ? (
          <BotMessage content={message.content} />
        ) : null
    }))
}
