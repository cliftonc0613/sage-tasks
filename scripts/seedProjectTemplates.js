// Simple script to seed project templates
// Run this from the sage-tasks directory: node scripts/seedProjectTemplates.js

const { ConvexHttpClient } = require("convex/browser");

const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://your-convex-url");

async function seedTemplates() {
  try {
    console.log("Seeding web development project templates...");
    
    const result = await client.mutation("projectTemplates:seedWebDevTemplates");
    
    console.log("✅ Templates seeded successfully:");
    console.log(result);
    
    // List the templates to verify
    const templates = await client.query("projectTemplates:list");
    console.log(`\n📋 Created ${templates.length} templates:`);
    templates.forEach((template, index) => {
      const metadata = template.projectMetadata || {};
      console.log(`${index + 1}. ${template.name}`);
      console.log(`   - Type: ${metadata.websiteType || 'N/A'}`);
      console.log(`   - Estimated: ${metadata.estimatedHours || 'N/A'} hours`);
      console.log(`   - Budget: ${metadata.defaultBudget || 'N/A'}`);
      console.log(`   - Tasks: ${template.subtasksEnhanced?.length || template.subtasks?.length || 0}`);
      console.log("");
    });
    
  } catch (error) {
    console.error("❌ Error seeding templates:", error);
    process.exit(1);
  }
}

// Only run if called directly
if (require.main === module) {
  seedTemplates()
    .then(() => {
      console.log("🎉 Template seeding completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Template seeding failed:", error);
      process.exit(1);
    });
}

module.exports = { seedTemplates };