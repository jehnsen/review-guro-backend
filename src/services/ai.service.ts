/**
 * AI Service
 * Handles AI-powered explanations for questions
 *
 * This is a MOCK implementation that simulates AI response generation.
 * In production, this would integrate with OpenAI API or similar service.
 */

import { Question } from '@prisma/client';
import { config } from '../config/env';

interface AIExplanationResult {
  explanation: string;
  tokensUsed: number;
}

class AIService {
  private readonly isConfigured: boolean;

  constructor() {
    this.isConfigured = Boolean(config.openai.apiKey);
  }

  /**
   * Generate AI-powered explanation for a question
   *
   * MOCK IMPLEMENTATION:
   * In production, this would:
   * 1. Build a prompt with question context
   * 2. Call OpenAI API (GPT-4 or similar)
   * 3. Parse and return the response
   *
   * @param question - The question to explain
   * @returns AI-generated explanation
   */
  async generateExplanation(question: Question): Promise<AIExplanationResult> {
    // In production, we would check for API key and call OpenAI
    if (!this.isConfigured) {
      return this.generateMockExplanation(question);
    }

    // PLACEHOLDER: OpenAI Integration
    // const response = await openai.chat.completions.create({
    //   model: 'gpt-4',
    //   messages: [
    //     { role: 'system', content: 'You are a helpful tutor...' },
    //     { role: 'user', content: `Explain this question: ${question.questionText}` }
    //   ]
    // });
    // return { explanation: response.choices[0].message.content, tokensUsed: response.usage.total_tokens };

    return this.generateMockExplanation(question);
  }

  /**
   * Generate a mock explanation for development/testing
   * Simulates what an AI would return
   */
  private generateMockExplanation(question: Question): AIExplanationResult {
    const categoryExplanations: Record<string, string> = {
      VERBAL_ABILITY: `
**Understanding the Question:**
This verbal ability question tests your comprehension and language skills.

**Step-by-Step Analysis:**
1. First, carefully read the question and identify the key concepts.
2. Analyze each option and eliminate obviously incorrect choices.
3. Look for context clues within the question text.
4. The correct answer aligns with proper grammar, meaning, or logical sequence.

**Why the Correct Answer Works:**
The correct option demonstrates proper understanding of vocabulary, grammar rules, or reading comprehension principles.

**Tips for Similar Questions:**
- Read all options before answering
- Look for keywords that indicate the expected answer type
- Practice with similar question patterns
      `.trim(),

      NUMERICAL_ABILITY: `
**Understanding the Problem:**
This numerical ability question tests your mathematical reasoning and calculation skills.

**Step-by-Step Solution:**
1. Identify what the question is asking for.
2. List the given information and any formulas needed.
3. Set up the equation or calculation method.
4. Solve systematically, showing each step.
5. Verify your answer makes logical sense.

**Key Concepts Used:**
This problem involves basic arithmetic operations, percentages, ratios, or algebraic thinking.

**Tips for Similar Problems:**
- Double-check your calculations
- Estimate the answer first to verify reasonableness
- Practice mental math for faster solving
      `.trim(),

      ANALYTICAL_ABILITY: `
**Understanding the Question:**
This analytical ability question tests your logical reasoning and problem-solving skills.

**Analysis Approach:**
1. Identify the pattern or logical relationship.
2. Break down complex information into smaller parts.
3. Look for sequences, cause-effect relationships, or classification patterns.
4. Apply logical deduction to eliminate wrong answers.

**Reasoning Process:**
By analyzing the given information systematically, we can identify the underlying logic that leads to the correct answer.

**Tips for Similar Questions:**
- Draw diagrams or tables if helpful
- Work backwards from the options when stuck
- Practice identifying common logical patterns
      `.trim(),

      GENERAL_INFORMATION: `
**Understanding the Question:**
This general information question tests your knowledge of facts, current events, or common knowledge.

**Key Information:**
This topic relates to Philippine history, government, geography, or general knowledge areas commonly covered in civil service exams.

**Context and Explanation:**
The correct answer is based on established facts, historical events, or official information from reliable sources.

**Tips for Similar Questions:**
- Stay updated with current events
- Review Philippine constitution and government structure
- Study historical events and important dates
      `.trim(),

      CLERICAL_ABILITY: `
**Understanding the Question:**
This clerical ability question tests your attention to detail, accuracy, and organizational skills.

**Step-by-Step Approach:**
1. Carefully read and compare all given information.
2. Pay close attention to spelling, numbers, and sequences.
3. Identify patterns in filing, coding, or alphabetizing.
4. Double-check your answer against the original data.

**Key Skills Tested:**
- Accuracy in data comparison
- Alphabetical/numerical ordering
- Attention to detail
- Following systematic procedures

**Tips for Similar Questions:**
- Take your time - accuracy matters more than speed
- Use your finger to track while comparing
- Practice with filing and coding exercises
      `.trim(),
    };

    const explanation =
      categoryExplanations[question.category] ||
      `
**Explanation:**
This question tests your understanding of ${question.category.replace(/_/g, ' ').toLowerCase()}.

**Key Points:**
- Read the question carefully
- Analyze each option
- Eliminate obviously wrong answers
- Choose the most logical option

**Remember:** Practice regularly to improve your performance in this category.
      `.trim();

    return {
      explanation: `
${explanation}

---
*This explanation was generated to help you understand the concept better. For the best preparation, practice with more questions in this category.*
      `.trim(),
      tokensUsed: 0, // Mock - no actual API call
    };
  }

  /**
   * Generate a simplified explanation for quick review
   */
  async generateSimplifiedExplanation(question: Question): Promise<string> {
    const result = await this.generateExplanation(question);

    // In production, we would call the API with a "simplify" prompt
    // For now, return a shortened version
    return result.explanation.split('\n\n')[0] || result.explanation;
  }
}

export const aiService = new AIService();
