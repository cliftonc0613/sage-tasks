# Project Templates for Pipeline

This document describes the Project Templates functionality added to the Sage Tasks Pipeline.

## Overview

Project Templates allow you to quickly create new web development projects with pre-defined subtasks, time estimates, and project details. This streamlines project creation and ensures consistency across similar project types.

## Features

### Template Categories

1. **Business Websites** - Professional service-based business sites
2. **E-commerce** - Online stores with product catalogs and payments
3. **Marketing & Landing** - Campaign-focused single pages
4. **CMS & WordPress** - Content management system sites
5. **Web Applications** - React/Next.js apps and custom applications
6. **Portfolio & Creative** - Showcase sites for professionals/agencies

### Available Templates

1. **Basic Business Website** (40h, $2,500-$4,000)
   - 16 tasks covering discovery through launch
   - Perfect for service-based businesses

2. **E-commerce Store** (80h, $5,000-$10,000)
   - 16 tasks for complete online store setup
   - Includes payment integration and product management

3. **Landing Page** (20h, $1,500-$3,000)
   - 12 tasks focused on conversion optimization
   - Ideal for marketing campaigns

4. **WordPress Site** (55h, $3,000-$6,000)
   - 16 tasks for custom theme development
   - Includes CMS setup and training

5. **React/Next.js Web App** (120h, $8,000-$15,000)
   - 18 tasks for full-stack application development
   - Covers architecture through deployment

6. **Portfolio/Agency Site** (50h, $4,000-$7,000)
   - 18 tasks for creative showcase websites
   - Includes portfolio galleries and case studies

7. **Custom Web Application** (200h, $15,000+)
   - 20 tasks for complex business applications
   - Full development lifecycle coverage

## Implementation

### Files Added/Modified

- `convex/projectTemplates.ts` - CRUD operations for project templates
- `src/app/pipeline/page.tsx` - Added template selection UI to project modal

### Key Functions

- `projectTemplates.list` - Get all project templates
- `projectTemplates.createProjectFromTemplate` - Create project from template
- `projectTemplates.seedWebDevTemplates` - Initialize default templates

## Usage

### For Users

1. **Creating a Project with Template:**
   - Click "New Project" in Pipeline
   - Select a template from the dropdown
   - Review template details and estimated hours
   - Choose "Create with Template" for quick setup
   - Or "Customize & Create" to modify before creating

2. **Template Information:**
   - Each template shows estimated hours and budget range
   - Preview includes description and sample tasks
   - Templates are organized by category for easy browsing

### For Developers

1. **Seeding Templates:**
   ```javascript
   // In the Pipeline interface, click "Setup Templates" if no templates exist
   // Or call the mutation directly:
   await seedWebDevTemplates();
   ```

2. **Adding New Templates:**
   ```javascript
   await createProjectTemplate({
     name: "My Custom Template",
     description: "Template description",
     websiteType: "Custom Website Type",
     defaultPriority: "medium",
     defaultTechnology: "HTML/CSS/JS",
     defaultBudget: "$3,000",
     estimatedDays: 14,
     estimatedHours: 40,
     category: "custom",
     subtasks: [
       {
         title: "Task 1",
         timeEstimate: 4, // hours
         priority: "high",
         dueDayOffset: 1,
         phase: "Planning"
       },
       // ... more subtasks
     ]
   });
   ```

## Template Structure

Each template includes:

- **Basic Info:** Name, description, website type
- **Estimates:** Time (hours/days) and budget ranges
- **Technology:** Default tech stack suggestion
- **Subtasks:** Detailed task list with:
  - Time estimates (in hours)
  - Priority levels
  - Due day offsets from project start
  - Workflow phases (Planning, Design, Development, etc.)

## Workflow Phases

Templates organize tasks into logical phases:

- **Discovery/Planning** - Requirements and strategy
- **Design** - Mockups, wireframes, visual design
- **Development** - Coding and implementation
- **Testing** - QA, browser testing, user testing
- **Launch** - Deployment and go-live
- **Training** - Client education and handoff

## Benefits

1. **Consistency** - Standardized approach to similar projects
2. **Time Savings** - No need to recreate common task lists
3. **Better Estimates** - Historical data improves accuracy
4. **Completeness** - Reduces forgotten tasks or phases
5. **Client Clarity** - Clear scope and timeline expectations

## Future Enhancements

Potential improvements for the template system:

- Custom template creation from existing projects
- Template versioning and updates
- Client-specific template variations
- Integration with time tracking for estimate refinement
- Template usage analytics and optimization