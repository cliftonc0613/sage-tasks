import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Enhanced subtask type for project templates
const enhancedSubtaskValidator = v.object({
  title: v.string(),
  timeEstimate: v.optional(v.number()), // in hours
  priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
  dueDayOffset: v.optional(v.number()), // days from project start
  phase: v.optional(v.string()), // workflow phase grouping
});

// Project template type
const projectTemplateValidator = v.object({
  name: v.string(),
  description: v.string(),
  websiteType: v.string(),
  defaultPriority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  defaultTechnology: v.optional(v.string()),
  defaultBudget: v.optional(v.string()),
  estimatedDays: v.optional(v.number()),
  estimatedHours: v.optional(v.number()),
  category: v.string(), // e.g., "business", "ecommerce", "portfolio"
  subtasks: v.array(enhancedSubtaskValidator),
});

// List all project templates
export const list = query({
  args: {},
  handler: async (ctx) => {
    const templates = await ctx.db.query("templates")
      .withIndex("by_category", (q) => q.eq("category", "web-project"))
      .collect();
    return templates.sort((a, b) => a.name.localeCompare(b.name));
  },
});

// Get templates by category
export const byCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    const templates = await ctx.db.query("templates")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
    return templates.sort((a, b) => a.name.localeCompare(b.name));
  },
});

// Get a single project template by ID
export const get = query({
  args: { id: v.id("templates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new project template
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    websiteType: v.string(),
    defaultPriority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    defaultTechnology: v.optional(v.string()),
    defaultBudget: v.optional(v.string()),
    estimatedDays: v.optional(v.number()),
    estimatedHours: v.optional(v.number()),
    category: v.string(),
    subtasks: v.array(enhancedSubtaskValidator),
  },
  handler: async (ctx, args) => {
    // Convert subtasks for the existing templates schema
    const subtaskTitles = args.subtasks.map(s => s.title);
    
    const templateId = await ctx.db.insert("templates", {
      name: args.name,
      description: args.description,
      defaultPriority: args.defaultPriority,
      defaultProject: undefined,
      subtasks: subtaskTitles, // Legacy format for compatibility
      subtasksEnhanced: args.subtasks.map(s => ({
        title: s.title,
        timeEstimate: s.timeEstimate ? s.timeEstimate * 60 : undefined, // Convert hours to minutes
        priority: s.priority,
        dueDayOffset: s.dueDayOffset,
        phase: s.phase,
      })),
      totalEstimatedDays: args.estimatedDays,
      category: "web-project",
      createdAt: new Date().toISOString(),
      // Store project-specific data in a custom format
      projectMetadata: {
        websiteType: args.websiteType,
        defaultTechnology: args.defaultTechnology,
        defaultBudget: args.defaultBudget,
        estimatedHours: args.estimatedHours,
        projectCategory: args.category,
      },
    });
    return templateId;
  },
});

// Create a project from a template
export const createProjectFromTemplate = mutation({
  args: {
    templateId: v.id("templates"),
    client: v.string(),
    contactName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    stage: v.union(
      v.literal("lead"),
      v.literal("design"),
      v.literal("development"),
      v.literal("review"),
      v.literal("live"),
      v.literal("closed")
    ),
    assignee: v.optional(v.union(v.literal("clifton"), v.literal("sage"), v.literal("unassigned"))),
    customBudget: v.optional(v.string()),
    customTechnology: v.optional(v.string()),
    launchDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");

    // Extract project metadata
    const metadata = template.projectMetadata as any;
    
    // Get max order for the stage
    const stageProjects = await ctx.db
      .query("projects")
      .withIndex("by_stage", (q) => q.eq("stage", args.stage))
      .collect();
    const order = stageProjects.length;

    // Create subtasks from template
    let subtasks = [];
    if (template.subtasksEnhanced && template.subtasksEnhanced.length > 0) {
      subtasks = template.subtasksEnhanced.map((sub) => ({
        id: crypto.randomUUID(),
        title: sub.title,
        completed: false,
      }));
    } else {
      subtasks = template.subtasks.map((title) => ({
        id: crypto.randomUUID(),
        title,
        completed: false,
      }));
    }

    // Calculate time estimate from enhanced subtasks (in hours)
    let timeEstimate: number | undefined;
    if (template.subtasksEnhanced) {
      const totalMinutes = template.subtasksEnhanced.reduce((sum, sub) => sum + (sub.timeEstimate || 0), 0);
      if (totalMinutes > 0) timeEstimate = Math.round(totalMinutes / 60); // Convert to hours
    } else if (metadata?.estimatedHours) {
      timeEstimate = metadata.estimatedHours;
    }

    const projectId = await ctx.db.insert("projects", {
      client: args.client,
      websiteType: metadata?.websiteType || template.name,
      contactName: args.contactName,
      phone: args.phone,
      email: args.email,
      website: args.website,
      stage: args.stage,
      budget: args.customBudget || metadata?.defaultBudget,
      technology: args.customTechnology || metadata?.defaultTechnology,
      launchDate: args.launchDate,
      notes: args.notes || template.description,
      priority: template.defaultPriority,
      assignee: args.assignee || "unassigned",
      subtasks,
      comments: [{
        id: crypto.randomUUID(),
        author: "system" as const,
        content: `Project created from template: ${template.name}`,
        createdAt: new Date().toISOString(),
      }],
      timeEstimate,
      timeEntries: [],
      totalTimeSpent: 0,
      order,
      createdAt: new Date().toISOString(),
    });

    return projectId;
  },
});

// Seed web development project templates
export const seedWebDevTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if web project templates already exist
    const existing = await ctx.db
      .query("templates")
      .withIndex("by_category", (q) => q.eq("category", "web-project"))
      .collect();

    if (existing.length > 0) {
      return { seeded: 0, message: "Web project templates already exist" };
    }

    const webProjectTemplates = [
      // Basic Business Website
      {
        name: "Basic Business Website",
        description: "Professional business website with essential pages and contact forms. Perfect for service-based businesses.",
        websiteType: "Business Website",
        defaultPriority: "medium" as const,
        defaultTechnology: "HTML/CSS/JS",
        defaultBudget: "$2,500 - $4,000",
        estimatedDays: 14,
        estimatedHours: 40,
        category: "business",
        subtasks: [
          { title: "Discovery & Requirements Gathering", timeEstimate: 3, priority: "high" as const, dueDayOffset: 1, phase: "Discovery" },
          { title: "Competitor Analysis", timeEstimate: 2, priority: "medium" as const, dueDayOffset: 2, phase: "Discovery" },
          { title: "Sitemap & Content Strategy", timeEstimate: 2, priority: "high" as const, dueDayOffset: 3, phase: "Planning" },
          { title: "Wireframes for Key Pages", timeEstimate: 4, priority: "high" as const, dueDayOffset: 5, phase: "Design" },
          { title: "Visual Design Mockups", timeEstimate: 6, priority: "high" as const, dueDayOffset: 8, phase: "Design" },
          { title: "Content Collection from Client", timeEstimate: 1, priority: "medium" as const, dueDayOffset: 7, phase: "Content" },
          { title: "Development Environment Setup", timeEstimate: 1, priority: "high" as const, dueDayOffset: 8, phase: "Development" },
          { title: "Homepage Development", timeEstimate: 8, priority: "high" as const, dueDayOffset: 10, phase: "Development" },
          { title: "About & Services Pages", timeEstimate: 6, priority: "high" as const, dueDayOffset: 11, phase: "Development" },
          { title: "Contact Page & Forms", timeEstimate: 3, priority: "high" as const, dueDayOffset: 12, phase: "Development" },
          { title: "Mobile Responsiveness", timeEstimate: 4, priority: "high" as const, dueDayOffset: 13, phase: "Development" },
          { title: "SEO Optimization", timeEstimate: 2, priority: "medium" as const, dueDayOffset: 13, phase: "Optimization" },
          { title: "Testing & QA", timeEstimate: 3, priority: "high" as const, dueDayOffset: 14, phase: "Testing" },
          { title: "Client Review & Revisions", timeEstimate: 2, priority: "high" as const, dueDayOffset: 15, phase: "Review" },
          { title: "Launch & Deployment", timeEstimate: 2, priority: "high" as const, dueDayOffset: 16, phase: "Launch" },
          { title: "Training & Handoff", timeEstimate: 1, priority: "medium" as const, dueDayOffset: 16, phase: "Launch" },
        ],
      },

      // E-commerce Store
      {
        name: "E-commerce Store",
        description: "Full-featured online store with product catalog, shopping cart, and payment processing.",
        websiteType: "E-commerce Store",
        defaultPriority: "high" as const,
        defaultTechnology: "Shopify/WooCommerce",
        defaultBudget: "$5,000 - $10,000",
        estimatedDays: 30,
        estimatedHours: 80,
        category: "ecommerce",
        subtasks: [
          { title: "E-commerce Strategy & Requirements", timeEstimate: 4, priority: "high" as const, dueDayOffset: 2, phase: "Discovery" },
          { title: "Platform Selection & Setup", timeEstimate: 3, priority: "high" as const, dueDayOffset: 3, phase: "Planning" },
          { title: "Product Catalog Planning", timeEstimate: 3, priority: "high" as const, dueDayOffset: 4, phase: "Planning" },
          { title: "User Flow & Wireframes", timeEstimate: 6, priority: "high" as const, dueDayOffset: 7, phase: "Design" },
          { title: "Homepage & Category Design", timeEstimate: 8, priority: "high" as const, dueDayOffset: 12, phase: "Design" },
          { title: "Product Page Design", timeEstimate: 4, priority: "high" as const, dueDayOffset: 14, phase: "Design" },
          { title: "Checkout Flow Design", timeEstimate: 4, priority: "high" as const, dueDayOffset: 16, phase: "Design" },
          { title: "Store Development & Configuration", timeEstimate: 12, priority: "high" as const, dueDayOffset: 20, phase: "Development" },
          { title: "Product Upload & Organization", timeEstimate: 8, priority: "medium" as const, dueDayOffset: 22, phase: "Content" },
          { title: "Payment Gateway Integration", timeEstimate: 4, priority: "high" as const, dueDayOffset: 23, phase: "Development" },
          { title: "Shipping & Tax Configuration", timeEstimate: 3, priority: "high" as const, dueDayOffset: 24, phase: "Development" },
          { title: "Mobile Optimization", timeEstimate: 6, priority: "high" as const, dueDayOffset: 26, phase: "Development" },
          { title: "Security & SSL Setup", timeEstimate: 2, priority: "high" as const, dueDayOffset: 27, phase: "Security" },
          { title: "Testing & Order Processing", timeEstimate: 4, priority: "high" as const, dueDayOffset: 28, phase: "Testing" },
          { title: "Client Training & Documentation", timeEstimate: 3, priority: "medium" as const, dueDayOffset: 29, phase: "Training" },
          { title: "Launch & Go-Live Support", timeEstimate: 2, priority: "high" as const, dueDayOffset: 30, phase: "Launch" },
        ],
      },

      // Landing Page
      {
        name: "Landing Page",
        description: "High-converting single page designed for specific marketing campaigns or product launches.",
        websiteType: "Landing Page",
        defaultPriority: "high" as const,
        defaultTechnology: "HTML/CSS/JS",
        defaultBudget: "$1,500 - $3,000",
        estimatedDays: 7,
        estimatedHours: 20,
        category: "marketing",
        subtasks: [
          { title: "Campaign Goals & Target Audience", timeEstimate: 2, priority: "high" as const, dueDayOffset: 1, phase: "Strategy" },
          { title: "Competitor & Market Research", timeEstimate: 2, priority: "medium" as const, dueDayOffset: 1, phase: "Research" },
          { title: "Copywriting & Messaging", timeEstimate: 3, priority: "high" as const, dueDayOffset: 2, phase: "Content" },
          { title: "Wireframe & User Flow", timeEstimate: 2, priority: "high" as const, dueDayOffset: 3, phase: "Design" },
          { title: "Visual Design & Hero Section", timeEstimate: 4, priority: "high" as const, dueDayOffset: 4, phase: "Design" },
          { title: "Call-to-Action Optimization", timeEstimate: 2, priority: "high" as const, dueDayOffset: 5, phase: "Design" },
          { title: "Page Development", timeEstimate: 3, priority: "high" as const, dueDayOffset: 6, phase: "Development" },
          { title: "Form Integration & Analytics", timeEstimate: 2, priority: "high" as const, dueDayOffset: 6, phase: "Development" },
          { title: "Mobile Responsiveness", timeEstimate: 2, priority: "high" as const, dueDayOffset: 7, phase: "Development" },
          { title: "Performance Optimization", timeEstimate: 1, priority: "medium" as const, dueDayOffset: 7, phase: "Optimization" },
          { title: "A/B Testing Setup", timeEstimate: 1, priority: "medium" as const, dueDayOffset: 7, phase: "Testing" },
          { title: "Launch & Campaign Integration", timeEstimate: 1, priority: "high" as const, dueDayOffset: 7, phase: "Launch" },
        ],
      },

      // WordPress Site
      {
        name: "WordPress Site",
        description: "Custom WordPress website with content management system and custom theme development.",
        websiteType: "WordPress Site",
        defaultPriority: "medium" as const,
        defaultTechnology: "WordPress/PHP",
        defaultBudget: "$3,000 - $6,000",
        estimatedDays: 21,
        estimatedHours: 55,
        category: "cms",
        subtasks: [
          { title: "WordPress Strategy & Planning", timeEstimate: 3, priority: "high" as const, dueDayOffset: 1, phase: "Planning" },
          { title: "Hosting & WordPress Setup", timeEstimate: 2, priority: "high" as const, dueDayOffset: 2, phase: "Setup" },
          { title: "Custom Theme Planning", timeEstimate: 2, priority: "high" as const, dueDayOffset: 3, phase: "Planning" },
          { title: "Design System & Mockups", timeEstimate: 8, priority: "high" as const, dueDayOffset: 8, phase: "Design" },
          { title: "Custom Theme Development", timeEstimate: 12, priority: "high" as const, dueDayOffset: 14, phase: "Development" },
          { title: "Custom Post Types & Fields", timeEstimate: 4, priority: "medium" as const, dueDayOffset: 16, phase: "Development" },
          { title: "Plugin Integration & Configuration", timeEstimate: 3, priority: "medium" as const, dueDayOffset: 17, phase: "Development" },
          { title: "Content Migration & Setup", timeEstimate: 4, priority: "medium" as const, dueDayOffset: 18, phase: "Content" },
          { title: "SEO Plugin Configuration", timeEstimate: 2, priority: "medium" as const, dueDayOffset: 19, phase: "Optimization" },
          { title: "Security Hardening", timeEstimate: 2, priority: "high" as const, dueDayOffset: 19, phase: "Security" },
          { title: "Performance Optimization", timeEstimate: 3, priority: "medium" as const, dueDayOffset: 20, phase: "Optimization" },
          { title: "Testing & Browser Compatibility", timeEstimate: 3, priority: "high" as const, dueDayOffset: 20, phase: "Testing" },
          { title: "Client Training & Documentation", timeEstimate: 3, priority: "medium" as const, dueDayOffset: 21, phase: "Training" },
          { title: "Backup & Maintenance Setup", timeEstimate: 1, priority: "medium" as const, dueDayOffset: 21, phase: "Setup" },
          { title: "Launch & DNS Migration", timeEstimate: 2, priority: "high" as const, dueDayOffset: 21, phase: "Launch" },
          { title: "Post-Launch Support", timeEstimate: 1, priority: "low" as const, dueDayOffset: 22, phase: "Support" },
        ],
      },

      // React/Next.js Web App
      {
        name: "React/Next.js Web App",
        description: "Modern web application built with React and Next.js framework, featuring dynamic functionality.",
        websiteType: "React/Next.js Web App",
        defaultPriority: "high" as const,
        defaultTechnology: "React/Next.js",
        defaultBudget: "$8,000 - $15,000",
        estimatedDays: 45,
        estimatedHours: 120,
        category: "webapp",
        subtasks: [
          { title: "App Architecture & Planning", timeEstimate: 6, priority: "high" as const, dueDayOffset: 3, phase: "Architecture" },
          { title: "Tech Stack & Dependency Selection", timeEstimate: 3, priority: "high" as const, dueDayOffset: 4, phase: "Planning" },
          { title: "Database Design & Setup", timeEstimate: 4, priority: "high" as const, dueDayOffset: 6, phase: "Backend" },
          { title: "API Design & Documentation", timeEstimate: 4, priority: "high" as const, dueDayOffset: 8, phase: "Backend" },
          { title: "UI/UX Design System", timeEstimate: 8, priority: "high" as const, dueDayOffset: 12, phase: "Design" },
          { title: "Component Library Creation", timeEstimate: 8, priority: "high" as const, dueDayOffset: 16, phase: "Development" },
          { title: "Authentication System", timeEstimate: 6, priority: "high" as const, dueDayOffset: 20, phase: "Development" },
          { title: "Core Features Development", timeEstimate: 24, priority: "high" as const, dueDayOffset: 30, phase: "Development" },
          { title: "API Integration", timeEstimate: 8, priority: "high" as const, dueDayOffset: 32, phase: "Integration" },
          { title: "State Management Implementation", timeEstimate: 6, priority: "medium" as const, dueDayOffset: 34, phase: "Development" },
          { title: "Responsive Design Implementation", timeEstimate: 8, priority: "high" as const, dueDayOffset: 36, phase: "Development" },
          { title: "Performance Optimization", timeEstimate: 6, priority: "medium" as const, dueDayOffset: 38, phase: "Optimization" },
          { title: "Unit & Integration Testing", timeEstimate: 8, priority: "high" as const, dueDayOffset: 40, phase: "Testing" },
          { title: "Deployment & CI/CD Setup", timeEstimate: 4, priority: "high" as const, dueDayOffset: 42, phase: "Deployment" },
          { title: "Security Testing & Audit", timeEstimate: 3, priority: "high" as const, dueDayOffset: 43, phase: "Security" },
          { title: "User Acceptance Testing", timeEstimate: 4, priority: "high" as const, dueDayOffset: 44, phase: "Testing" },
          { title: "Documentation & Training", timeEstimate: 3, priority: "medium" as const, dueDayOffset: 45, phase: "Documentation" },
          { title: "Production Launch", timeEstimate: 2, priority: "high" as const, dueDayOffset: 45, phase: "Launch" },
        ],
      },

      // Portfolio/Agency Site
      {
        name: "Portfolio/Agency Site",
        description: "Showcase website for creative professionals or agencies with portfolio galleries and case studies.",
        websiteType: "Portfolio/Agency Site",
        defaultPriority: "medium" as const,
        defaultTechnology: "HTML/CSS/JS + CMS",
        defaultBudget: "$4,000 - $7,000",
        estimatedDays: 18,
        estimatedHours: 50,
        category: "portfolio",
        subtasks: [
          { title: "Brand Strategy & Positioning", timeEstimate: 3, priority: "high" as const, dueDayOffset: 2, phase: "Strategy" },
          { title: "Portfolio Content Audit", timeEstimate: 2, priority: "medium" as const, dueDayOffset: 3, phase: "Content" },
          { title: "Site Architecture & Navigation", timeEstimate: 3, priority: "high" as const, dueDayOffset: 4, phase: "Planning" },
          { title: "Visual Design & Branding", timeEstimate: 8, priority: "high" as const, dueDayOffset: 9, phase: "Design" },
          { title: "Portfolio Gallery Design", timeEstimate: 4, priority: "high" as const, dueDayOffset: 11, phase: "Design" },
          { title: "Case Study Template Design", timeEstimate: 3, priority: "medium" as const, dueDayOffset: 12, phase: "Design" },
          { title: "Homepage Development", timeEstimate: 6, priority: "high" as const, dueDayOffset: 14, phase: "Development" },
          { title: "Portfolio Gallery Development", timeEstimate: 6, priority: "high" as const, dueDayOffset: 15, phase: "Development" },
          { title: "Case Study Pages", timeEstimate: 4, priority: "medium" as const, dueDayOffset: 16, phase: "Development" },
          { title: "About & Contact Pages", timeEstimate: 3, priority: "medium" as const, dueDayOffset: 16, phase: "Development" },
          { title: "CMS Integration for Portfolio", timeEstimate: 4, priority: "medium" as const, dueDayOffset: 17, phase: "Development" },
          { title: "Mobile & Tablet Optimization", timeEstimate: 4, priority: "high" as const, dueDayOffset: 17, phase: "Development" },
          { title: "SEO & Social Media Integration", timeEstimate: 2, priority: "medium" as const, dueDayOffset: 18, phase: "Optimization" },
          { title: "Performance & Image Optimization", timeEstimate: 2, priority: "medium" as const, dueDayOffset: 18, phase: "Optimization" },
          { title: "Content Upload & Organization", timeEstimate: 3, priority: "low" as const, dueDayOffset: 18, phase: "Content" },
          { title: "Testing & Cross-Browser Check", timeEstimate: 2, priority: "high" as const, dueDayOffset: 18, phase: "Testing" },
          { title: "Client Review & Revisions", timeEstimate: 2, priority: "medium" as const, dueDayOffset: 19, phase: "Review" },
          { title: "Launch & Analytics Setup", timeEstimate: 1, priority: "high" as const, dueDayOffset: 19, phase: "Launch" },
        ],
      },

      // Custom Web Application
      {
        name: "Custom Web Application",
        description: "Fully custom web application with complex business logic and database integration.",
        websiteType: "Custom Web Application",
        defaultPriority: "high" as const,
        defaultTechnology: "Full Stack (React/Node.js)",
        defaultBudget: "$15,000+",
        estimatedDays: 60,
        estimatedHours: 200,
        category: "custom",
        subtasks: [
          { title: "Business Requirements Analysis", timeEstimate: 8, priority: "high" as const, dueDayOffset: 3, phase: "Analysis" },
          { title: "Technical Specification Document", timeEstimate: 6, priority: "high" as const, dueDayOffset: 5, phase: "Planning" },
          { title: "System Architecture Design", timeEstimate: 8, priority: "high" as const, dueDayOffset: 8, phase: "Architecture" },
          { title: "Database Schema Design", timeEstimate: 6, priority: "high" as const, dueDayOffset: 10, phase: "Backend" },
          { title: "API Design & Documentation", timeEstimate: 6, priority: "high" as const, dueDayOffset: 12, phase: "Backend" },
          { title: "UI/UX Design & Prototyping", timeEstimate: 16, priority: "high" as const, dueDayOffset: 18, phase: "Design" },
          { title: "Frontend Framework Setup", timeEstimate: 4, priority: "high" as const, dueDayOffset: 20, phase: "Frontend" },
          { title: "Backend API Development", timeEstimate: 24, priority: "high" as const, dueDayOffset: 30, phase: "Backend" },
          { title: "Database Implementation", timeEstimate: 8, priority: "high" as const, dueDayOffset: 32, phase: "Backend" },
          { title: "Authentication & Authorization", timeEstimate: 8, priority: "high" as const, dueDayOffset: 35, phase: "Security" },
          { title: "Core Frontend Development", timeEstimate: 32, priority: "high" as const, dueDayOffset: 45, phase: "Frontend" },
          { title: "Frontend-Backend Integration", timeEstimate: 12, priority: "high" as const, dueDayOffset: 48, phase: "Integration" },
          { title: "Advanced Features Implementation", timeEstimate: 16, priority: "medium" as const, dueDayOffset: 52, phase: "Development" },
          { title: "Performance Optimization", timeEstimate: 8, priority: "medium" as const, dueDayOffset: 54, phase: "Optimization" },
          { title: "Security Testing & Audit", timeEstimate: 6, priority: "high" as const, dueDayOffset: 55, phase: "Security" },
          { title: "Comprehensive Testing Suite", timeEstimate: 12, priority: "high" as const, dueDayOffset: 57, phase: "Testing" },
          { title: "Documentation & User Guides", timeEstimate: 6, priority: "medium" as const, dueDayOffset: 58, phase: "Documentation" },
          { title: "Deployment & DevOps Setup", timeEstimate: 6, priority: "high" as const, dueDayOffset: 59, phase: "Deployment" },
          { title: "User Training & Knowledge Transfer", timeEstimate: 4, priority: "medium" as const, dueDayOffset: 60, phase: "Training" },
          { title: "Production Launch & Monitoring", timeEstimate: 4, priority: "high" as const, dueDayOffset: 60, phase: "Launch" },
        ],
      },
    ];

    // Create all templates
    let createdCount = 0;
    for (const template of webProjectTemplates) {
      const subtaskTitles = template.subtasks.map(s => s.title);
      
      await ctx.db.insert("templates", {
        name: template.name,
        description: template.description,
        defaultPriority: template.defaultPriority,
        defaultProject: undefined,
        subtasks: subtaskTitles,
        subtasksEnhanced: template.subtasks.map(s => ({
          title: s.title,
          timeEstimate: s.timeEstimate ? s.timeEstimate * 60 : undefined, // Convert hours to minutes
          priority: s.priority,
          dueDayOffset: s.dueDayOffset,
          phase: s.phase,
        })),
        totalEstimatedDays: template.estimatedDays,
        category: "web-project",
        createdAt: new Date().toISOString(),
        // Store additional project metadata
        projectMetadata: {
          websiteType: template.websiteType,
          defaultTechnology: template.defaultTechnology,
          defaultBudget: template.defaultBudget,
          estimatedHours: template.estimatedHours,
          projectCategory: template.category,
        },
      });
      createdCount++;
    }

    return { 
      seeded: createdCount, 
      message: `Created ${createdCount} web development project templates` 
    };
  },
});

// Update a project template
export const update = mutation({
  args: {
    id: v.id("templates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    websiteType: v.optional(v.string()),
    defaultPriority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    defaultTechnology: v.optional(v.string()),
    defaultBudget: v.optional(v.string()),
    estimatedDays: v.optional(v.number()),
    estimatedHours: v.optional(v.number()),
    category: v.optional(v.string()),
    subtasks: v.optional(v.array(enhancedSubtaskValidator)),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const template = await ctx.db.get(id);
    if (!template) throw new Error("Template not found");

    const updateData: any = {};

    // Handle basic fields
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.defaultPriority !== undefined) updateData.defaultPriority = updates.defaultPriority;
    if (updates.estimatedDays !== undefined) updateData.totalEstimatedDays = updates.estimatedDays;

    // Handle subtasks if provided
    if (updates.subtasks !== undefined) {
      updateData.subtasks = updates.subtasks.map(s => s.title);
      updateData.subtasksEnhanced = updates.subtasks.map(s => ({
        title: s.title,
        timeEstimate: s.timeEstimate ? s.timeEstimate * 60 : undefined,
        priority: s.priority,
        dueDayOffset: s.dueDayOffset,
        phase: s.phase,
      }));
    }

    // Handle project metadata
    const currentMetadata = (template as any).projectMetadata || {};
    updateData.projectMetadata = {
      ...currentMetadata,
      ...(updates.websiteType && { websiteType: updates.websiteType }),
      ...(updates.defaultTechnology && { defaultTechnology: updates.defaultTechnology }),
      ...(updates.defaultBudget && { defaultBudget: updates.defaultBudget }),
      ...(updates.estimatedHours && { estimatedHours: updates.estimatedHours }),
      ...(updates.category && { projectCategory: updates.category }),
    };

    await ctx.db.patch(id, updateData);
    return id;
  },
});

// Delete a project template
export const remove = mutation({
  args: { id: v.id("templates") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});