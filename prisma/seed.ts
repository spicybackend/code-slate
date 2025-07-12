import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create test organization
  const testOrg = await prisma.organization.upsert({
    where: { slug: "test-org" },
    update: {},
    create: {
      name: "Test Organization",
      slug: "test-org",
      verified: true,
    },
  });

  console.log("✅ Created test organization");

  // Hash the password
  const hashedPassword = await hashPassword("P@ssw0rd!");

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@example.com",
      password: hashedPassword,
      role: "ADMIN",
      organizationId: testOrg.id,
      emailVerified: new Date(),
    },
  });

  console.log("✅ Created admin user");

  // Create a sample code challenge
  const challenge = await prisma.challenge.create({
    data: {
      title: "FizzBuzz Challenge",
      description:
        "Write a program that prints the numbers from 1 to 100. But for multiples of three print 'Fizz' instead of the number and for the multiples of five print 'Buzz'. For numbers which are multiples of both three and five print 'FizzBuzz'.",
      instructions: `
# FizzBuzz Challenge

Write a function that takes a number n and returns an array of strings from 1 to n where:
- For multiples of 3, use "Fizz"
- For multiples of 5, use "Buzz"
- For multiples of both 3 and 5, use "FizzBuzz"
- For all other numbers, use the number as a string

## Example
\`\`\`
fizzBuzz(15) should return:
["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz", "11", "Fizz", "13", "14", "FizzBuzz"]
\`\`\`

## Requirements
- Write your solution in JavaScript or TypeScript
- Include proper error handling
- Add comments explaining your logic
      `.trim(),
      timeLimit: 30, // 30 minutes
      status: "ACTIVE",
      organizationId: testOrg.id,
      creatorId: adminUser.id,
    },
  });

  console.log("✅ Created sample challenge");

  // Create a sample candidate
  const candidate = await prisma.candidate.create({
    data: {
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "+1-555-0123",
      position: "Frontend Developer",
      token: "candidate-token-123",
      challengeId: challenge.id,
    },
  });

  console.log("✅ Created sample candidate");

  // Create a sample submission with some keystroke events
  const submission = await prisma.submission.create({
    data: {
      content: `function fizzBuzz(n) {
  const result = [];

  for (let i = 1; i <= n; i++) {
    if (i % 15 === 0) {
      result.push("FizzBuzz");
    } else if (i % 3 === 0) {
      result.push("Fizz");
    } else if (i % 5 === 0) {
      result.push("Buzz");
    } else {
      result.push(i.toString());
    }
  }

  return result;
}`,
      status: "SUBMITTED",
      challengeId: challenge.id,
      candidateId: candidate.id,
      startedAt: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago
      submittedAt: new Date(),
      totalTimeSpent: 1500, // 25 minutes in seconds
    },
  });

  console.log("✅ Created sample submission");

  // Create some sample keystroke events
  const baseTime = new Date(Date.now() - 25 * 60 * 1000);

  const events = [
    {
      type: "FOCUS_IN" as const,
      timestamp: new Date(baseTime.getTime()),
      windowFocus: true,
      submissionId: submission.id,
    },
    {
      type: "TYPING" as const,
      timestamp: new Date(baseTime.getTime() + 1000),
      cursorStart: 0,
      cursorEnd: 0,
      content: "f",
      windowFocus: true,
      submissionId: submission.id,
    },
    {
      type: "TYPING" as const,
      timestamp: new Date(baseTime.getTime() + 1100),
      cursorStart: 1,
      cursorEnd: 1,
      content: "u",
      windowFocus: true,
      submissionId: submission.id,
    },
    {
      type: "TYPING" as const,
      timestamp: new Date(baseTime.getTime() + 1200),
      cursorStart: 2,
      cursorEnd: 2,
      content: "n",
      windowFocus: true,
      submissionId: submission.id,
    },
    {
      type: "FOCUS_OUT" as const,
      timestamp: new Date(baseTime.getTime() + 300000), // 5 minutes later
      windowFocus: false,
      submissionId: submission.id,
    },
    {
      type: "FOCUS_IN" as const,
      timestamp: new Date(baseTime.getTime() + 360000), // 6 minutes later
      windowFocus: true,
      submissionId: submission.id,
    },
  ];

  await prisma.keystrokeEvent.createMany({
    data: events,
  });

  console.log("✅ Created sample keystroke events");

  // Create a sample comment
  await prisma.comment.create({
    data: {
      content:
        "Great solution! Clean and efficient implementation of the FizzBuzz algorithm. Good use of the modulo operator and proper handling of the combined case.",
      submissionId: submission.id,
      authorId: adminUser.id,
    },
  });

  console.log("✅ Created sample comment");

  console.log("🎉 Seeding completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
