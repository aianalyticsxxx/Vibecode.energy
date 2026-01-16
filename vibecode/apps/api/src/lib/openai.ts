import OpenAI from 'openai';

export interface ModerationAnalysis {
  isSafe: boolean;
  overallConfidence: number;
  categories: {
    nsfw: number;
    violence: number;
    hate: number;
    harassment: number;
    selfHarm: number;
    drugs: number;
    illegal: number;
  };
  reasoning: string;
  modelVersion: string;
  processingTimeMs: number;
}

export interface ModerationError {
  error: string;
  retryable: boolean;
}

const MODERATION_PROMPT = `Analyze this image for content policy violations. You must return a valid JSON object with the following structure:

{
  "is_safe": boolean,
  "overall_confidence": number between 0.0 and 1.0 representing the highest violation confidence,
  "categories": {
    "nsfw": number between 0.0 and 1.0,
    "violence": number between 0.0 and 1.0,
    "hate": number between 0.0 and 1.0,
    "harassment": number between 0.0 and 1.0,
    "self_harm": number between 0.0 and 1.0,
    "drugs": number between 0.0 and 1.0,
    "illegal": number between 0.0 and 1.0
  },
  "reasoning": "brief explanation of your assessment"
}

Category definitions:
- nsfw: Sexual or adult content, nudity, sexually suggestive poses
- violence: Graphic violence, gore, weapons used threateningly, death
- hate: Hate symbols, slurs, discriminatory imagery, extremist content
- harassment: Targeted harassment, bullying, doxxing, threats
- self_harm: Self-harm promotion, suicide content, eating disorders
- drugs: Illegal drug use, drug paraphernalia, drug promotion
- illegal: Clearly illegal activities (theft, fraud, etc.)

Score guidelines:
- 0.0-0.3: No violation or very unlikely
- 0.3-0.5: Minor concern, likely acceptable
- 0.5-0.7: Moderate concern, needs human review
- 0.7-0.9: High concern, likely violation
- 0.9-1.0: Clear violation, should be blocked

Return ONLY the JSON object, no additional text.`;

export class OpenAIClient {
  private client: OpenAI;
  private model: string;
  private maxRetries: number;
  private baseDelay: number;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.client = new OpenAI({ apiKey });
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.maxRetries = 3;
    this.baseDelay = 1000;
  }

  async analyzeImage(imageUrl: string): Promise<ModerationAnalysis | ModerationError> {
    const startTime = Date.now();

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: MODERATION_PROMPT },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                    detail: 'low', // Use low detail for faster/cheaper analysis
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
          temperature: 0.1, // Low temperature for consistent results
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          return { error: 'Empty response from OpenAI', retryable: true };
        }

        // Parse JSON response
        const parsed = this.parseResponse(content);
        if ('error' in parsed) {
          return parsed;
        }

        const processingTimeMs = Date.now() - startTime;

        return {
          isSafe: parsed.is_safe,
          overallConfidence: parsed.overall_confidence,
          categories: {
            nsfw: parsed.categories.nsfw ?? 0,
            violence: parsed.categories.violence ?? 0,
            hate: parsed.categories.hate ?? 0,
            harassment: parsed.categories.harassment ?? 0,
            selfHarm: parsed.categories.self_harm ?? 0,
            drugs: parsed.categories.drugs ?? 0,
            illegal: parsed.categories.illegal ?? 0,
          },
          reasoning: parsed.reasoning || '',
          modelVersion: this.model,
          processingTimeMs,
        };
      } catch (err) {
        const error = err as Error & { status?: number; code?: string };

        // Check if retryable
        if (error.status === 429 || error.code === 'rate_limit_exceeded') {
          // Rate limited - wait with exponential backoff
          const delay = this.baseDelay * Math.pow(2, attempt);
          await this.sleep(delay);
          continue;
        }

        if (error.status === 500 || error.status === 503) {
          // Server error - retry
          const delay = this.baseDelay * Math.pow(2, attempt);
          await this.sleep(delay);
          continue;
        }

        // Non-retryable error
        return {
          error: error.message || 'Unknown OpenAI error',
          retryable: false,
        };
      }
    }

    return { error: 'Max retries exceeded', retryable: true };
  }

  private parseResponse(content: string):
    | { is_safe: boolean; overall_confidence: number; categories: Record<string, number>; reasoning: string }
    | ModerationError {
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { error: 'No JSON found in response', retryable: false };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (typeof parsed.is_safe !== 'boolean') {
        return { error: 'Missing or invalid is_safe field', retryable: false };
      }
      if (typeof parsed.overall_confidence !== 'number') {
        return { error: 'Missing or invalid overall_confidence field', retryable: false };
      }
      if (!parsed.categories || typeof parsed.categories !== 'object') {
        return { error: 'Missing or invalid categories field', retryable: false };
      }

      // Clamp confidence values to 0-1 range
      parsed.overall_confidence = Math.max(0, Math.min(1, parsed.overall_confidence));
      for (const key of Object.keys(parsed.categories)) {
        parsed.categories[key] = Math.max(0, Math.min(1, parsed.categories[key] || 0));
      }

      return parsed;
    } catch {
      return { error: 'Failed to parse JSON response', retryable: false };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let openaiClient: OpenAIClient | null = null;

export function getOpenAIClient(): OpenAIClient {
  if (!openaiClient) {
    openaiClient = new OpenAIClient();
  }
  return openaiClient;
}
