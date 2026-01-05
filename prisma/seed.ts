/**
 * Database Seed Script
 * Populates the database with sample Civil Service exam questions
 *
 * Run with: npm run seed
 */

import { PrismaClient, Difficulty, QuestionCategory } from '@prisma/client';

const prisma = new PrismaClient();

interface QuestionSeed {
  category: QuestionCategory;
  difficulty: Difficulty;
  questionText: string;
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
  explanationText: string;
}

const questions: QuestionSeed[] = [
  // Question 1: Verbal Ability
  {
    category: QuestionCategory.VERBAL_ABILITY,
    difficulty: Difficulty.EASY,
    questionText: 'Choose the word that is most similar in meaning to "DILIGENT":',
    options: [
      { id: 'a', text: 'Lazy' },
      { id: 'b', text: 'Hardworking' },
      { id: 'c', text: 'Careless' },
      { id: 'd', text: 'Indifferent' },
    ],
    correctOptionId: 'b',
    explanationText:
      'DILIGENT means showing care and effort in one\'s work or duties. The word most similar in meaning is "Hardworking" as it also describes someone who puts consistent effort into their tasks.',
  },

  // Question 2: Numerical Ability
  {
    category: QuestionCategory.NUMERICAL_ABILITY,
    difficulty: Difficulty.MEDIUM,
    questionText:
      'A store offers a 20% discount on an item originally priced at ₱500. What is the discounted price?',
    options: [
      { id: 'a', text: '₱400' },
      { id: 'b', text: '₱450' },
      { id: 'c', text: '₱380' },
      { id: 'd', text: '₱420' },
    ],
    correctOptionId: 'a',
    explanationText:
      'To calculate 20% of ₱500: ₱500 × 0.20 = ₱100 (discount amount). The discounted price is: ₱500 - ₱100 = ₱400.',
  },

  // Question 3: Analytical Ability
  {
    category: QuestionCategory.ANALYTICAL_ABILITY,
    difficulty: Difficulty.MEDIUM,
    questionText:
      'If all roses are flowers and some flowers fade quickly, which statement must be true?',
    options: [
      { id: 'a', text: 'All roses fade quickly' },
      { id: 'b', text: 'Some roses may fade quickly' },
      { id: 'c', text: 'No roses fade quickly' },
      { id: 'd', text: 'All flowers are roses' },
    ],
    correctOptionId: 'b',
    explanationText:
      'Since all roses are flowers, and some flowers fade quickly, it is possible (but not certain) that some roses are among those flowers that fade quickly. Therefore, "Some roses may fade quickly" is the only statement that must be true.',
  },

  // Question 4: General Information
  {
    category: QuestionCategory.GENERAL_INFORMATION,
    difficulty: Difficulty.EASY,
    questionText: 'What is the capital city of the Philippines?',
    options: [
      { id: 'a', text: 'Cebu City' },
      { id: 'b', text: 'Davao City' },
      { id: 'c', text: 'Manila' },
      { id: 'd', text: 'Quezon City' },
    ],
    correctOptionId: 'c',
    explanationText:
      'Manila is the capital city of the Philippines. While Quezon City is the most populous city in Metro Manila, Manila is the official capital as designated by the Philippine Constitution.',
  },

  // Question 5: Clerical Ability
  {
    category: QuestionCategory.CLERICAL_ABILITY,
    difficulty: Difficulty.HARD,
    questionText:
      'Arrange the following names in alphabetical order:\n1. Santos, Maria C.\n2. Santos, Mario A.\n3. Santos, Maria A.\n4. Santino, Maria B.',
    options: [
      { id: 'a', text: '4, 3, 1, 2' },
      { id: 'b', text: '4, 1, 3, 2' },
      { id: 'c', text: '3, 1, 4, 2' },
      { id: 'd', text: '4, 3, 2, 1' },
    ],
    correctOptionId: 'a',
    explanationText:
      'When alphabetizing, compare last names first, then first names, then middle initials. "Santino" comes before "Santos". Among the "Santos" entries, "Maria A." comes before "Maria C." (by middle initial), which comes before "Mario A." (Maria before Mario). The correct order is: 4 (Santino, Maria B.), 3 (Santos, Maria A.), 1 (Santos, Maria C.), 2 (Santos, Mario A.).',
  },
];

async function main(): Promise<void> {
  console.log('🌱 Starting database seed...\n');

  // Clear existing questions (optional - comment out if you want to keep existing data)
  await prisma.userProgress.deleteMany();
  await prisma.question.deleteMany();
  console.log('🧹 Cleared existing questions and progress data\n');

  // Insert questions
  for (const question of questions) {
    const created = await prisma.question.create({
      data: {
        category: question.category,
        difficulty: question.difficulty,
        questionText: question.questionText,
        options: question.options,
        correctOptionId: question.correctOptionId,
        explanationText: question.explanationText,
      },
    });

    console.log(`✅ Created question: ${created.id}`);
    console.log(`   Category: ${created.category}`);
    console.log(`   Difficulty: ${created.difficulty}`);
    console.log(`   Question: ${created.questionText.substring(0, 50)}...`);
    console.log('');
  }

  console.log('========================================');
  console.log(`🎉 Seed completed! Created ${questions.length} questions.`);
  console.log('========================================');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
