# ChatKit Examples & Deployed Applications Research

> Research conducted: November 2025
> OpenAI ChatKit is in Beta (launched October 2025 at DevDay)

---

## Official OpenAI Sample Applications

These are the official examples provided by OpenAI:

### 1. Advanced Samples Repository

**URL**: [github.com/openai/openai-chatkit-advanced-samples](https://github.com/openai/openai-chatkit-advanced-samples)

Each example pairs a FastAPI backend with a Vite + React frontend:

| Example                 | Description                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| **Cat Lounge**          | Virtual cat caretaker that helps improve energy, happiness, and cleanliness stats               |
| **Customer Support**    | Airline concierge with live itinerary data, timeline syncing, and domain-specific tools         |
| **News Guide**          | Foxhollow Dispatch newsroom assistant with article search, @-mentions, and page-aware responses |
| **Metro Map**           | Chat-driven metro planner with React Flow network of lines and stations                         |
| **Knowledge Assistant** | Document/knowledge base Q&A assistant                                                           |

### 2. Starter App Repository

**URL**: [github.com/openai/openai-chatkit-starter-app](https://github.com/openai/openai-chatkit-starter-app)

Minimal Next.js starter with ChatKit web component and Agent Builder integration.

### 3. Customer Service Demo

**URL**: [github.com/openai/openai-cs-agents-demo](https://github.com/openai/openai-cs-agents-demo)

Demo of a customer service use case implemented with the OpenAI Agents SDK.

### 4. Apps SDK Examples

**URL**: [github.com/openai/openai-apps-sdk-examples](https://github.com/openai/openai-apps-sdk-examples)

Example UI components and MCP servers for the Apps SDK.

---

## Enterprise Production Deployments

### Canva - Developer Support Agent

- **Use Case**: Support agent for Canva Developers community
- **Results**: Saved over two weeks of development time, integrated in under an hour
- **Quote**: "This support agent will transform the way developers engage with our docs by turning it into a conversational experience, making it easy to build apps and integrations on Canva."
- **Source**: [OpenAI AgentKit Announcement](https://openai.com/index/introducing-agentkit/)

### HubSpot - Breeze AI Assistant

- **Use Case**: Customer support agent and onboarding bots
- **Features**: Intelligently searches documentation, provides contextual answers, navigates complex knowledge bases
- **Source**: [OpenAI AgentKit Announcement](https://openai.com/index/introducing-agentkit/)

### Ramp - Buyer/Procurement Agent ("Ask Ramp")

- **Use Case**: Procurement assistant for software approvals and expense management
- **Results**: Went from blank canvas to working buyer agent in "just a couple of hours", cut iteration cycles by 70%
- **Quote**: "Agent Builder transformed what once took months of complex orchestration, custom code, and manual optimizations into just a couple of hours."
- **Source**: [OpenAI AgentKit Announcement](https://openai.com/index/introducing-agentkit/)

### LY Corporation (Japan)

- **Use Case**: Work assistant agent
- **Results**: Built with Agent Builder in less than two hours
- **Quote**: "Agent Builder allowed us to orchestrate agents in a whole new way, with engineers and subject matter experts collaborating all in one interface."
- **Source**: [OpenAI AgentKit Announcement](https://openai.com/index/introducing-agentkit/)

### Carlyle (Private Equity)

- **Use Case**: Due diligence agent
- **Results**: Cut development time by half, increased accuracy by 30%
- **Source**: [OpenAI AgentKit Announcement](https://openai.com/index/introducing-agentkit/)

### Klarna

- **Use Case**: Customer support agent
- **Results**: Handles two-thirds of all support tickets
- **Source**: Various industry reports

---

## Government & Public Sector

### UK Government Digital Service (GDS) - GOV.UK Chat

- **Use Case**: AI-powered chatbot for GOV.UK guidance
- **Technology**: OpenAI GPT-4o/GPT-4o mini with RAG (Retrieval Augmented Generation)
- **ChatKit Integration**: Custom theme matching GDS design system (#1d70b8), WCAG 2.2 Level AA accessibility
- **Status**: Private beta, testing with business users
- **Results**: 70% of users found responses useful, 65% satisfied with experience
- **Sources**:
  - [GOV.UK Chat Private Beta](https://insidegovuk.blog.gov.uk/2024/11/05/were-running-a-private-beta-of-gov-uk-chat/)
  - [Initial Findings](https://insidegovuk.blog.gov.uk/2024/01/18/the-findings-of-our-first-generative-ai-experiment-gov-uk-chat/)

---

## Community Projects & Forks

### thamok/chatkit

**URL**: [github.com/thamok/chatkit](https://github.com/thamok/chatkit)

Fork of the starter app for building with OpenAI ChatKit + Agent Builder.

### pasonk/ai-chatkit

**URL**: [github.com/pasonk/ai-chatkit](https://github.com/pasonk/ai-chatkit)

Full-stack AI agent chat tool built with LangGraph + FastAPI + Next.js + Chroma. Supports tool invocation and RAG knowledge base. Alternative architecture that doesn't use OpenAI's agent SDK.

---

## Tutorials & Guides

### Dev.to

- [I Built Customer Support Agent using OpenAI ChatKit!](https://dev.to/composiodev/i-built-customer-support-agent-using-openai-chatkit-5d88) - Multi-agent workflow with intent classification
- [How to Use OpenAI AgentKit (2025): Build, Deploy, and Optimize AI Agents](https://dev.to/therealmrmumba/how-to-use-openai-agentkit-2025-build-deploy-and-optimize-ai-agents-1p92)
- [Integrating OpenAI's ChatKit with FastAPI](https://dev.to/rajeev_3ce9f280cbae73b234/--3hhn) - Practical guide to building modern chat agents

### Medium

- [Getting Started with OpenAI ChatKit: The One Setup Step You Can't Skip](https://medium.com/@mcraddock/getting-started-with-openai-chatkit-the-one-setup-step-you-cant-skip-7d4c0110404a) - Domain allowlist setup guide
- [Building an AI News Agent with OpenAI's Agent Builder, AgentKit, and ChatKit](https://medium.com/@rajeevchandramca/building-an-ai-news-agent-with-openais-agent-builder-agentkit-and-chatkit-391816f71d70)
- [OpenAI Agent Builder: A Step-by-Step Guide For Beginners](https://medium.com/@genai.works/openai-agent-builder-a-step-by-step-guide-for-beginners-f2047aca589d)

### Other Blogs

- [Composio: OpenAI ChatKit Step-by-step Guide](https://composio.dev/blog/openai-chatkit) - Full customer support agent with Rube MCP
- [eesel AI: Practical Guide to ChatKit Widgets](https://www.eesel.ai/blog/chatkit-widgets)
- [eesel AI: ChatKit Python SDK Actions](https://www.eesel.ai/blog/chatkit-python-sdk-actions)
- [Skywork AI: How to Embed a Custom Chat UI with ChatKit](https://skywork.ai/blog/how-to-embed-custom-chatkit-chat-ui/)
- [Deploy an OpenAI Agent Builder Chatbot to your Website](https://towardsdatascience.com/deploy-an-openai-agent-builder-chatbot-to-a-website/) - Towards Data Science
- [Vercel Deployment Guide](https://alejandrodinsmore.substack.com/p/guide-how-to-deploy-an-agent-using) - 15-minute deployment with no coding

### Courses

- [Udemy: OpenAI Agent Builder & ChatKit](https://www.udemy.com/course/openai-agentbuilder/) - Build & Deploy AI Workflows

---

## Common Use Cases Identified

Based on research, ChatKit is being used for:

1. **Customer Support** - Ticket handling, FAQ responses, documentation search
2. **Developer Documentation** - Interactive docs, API guidance, code examples
3. **Internal Knowledge Assistants** - Enterprise knowledge base Q&A
4. **Onboarding Guides** - New employee/customer onboarding
5. **Research Agents** - Document analysis, data gathering
6. **Procurement/Buyer Agents** - Software approvals, expense management
7. **Due Diligence** - Document review, compliance checking
8. **Government Services** - Citizen guidance, public service navigation

---

## Official Documentation & Resources

| Resource             | URL                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| ChatKit JS SDK       | [github.com/openai/chatkit-js](https://github.com/openai/chatkit-js)                                       |
| ChatKit Python SDK   | [github.com/openai/chatkit-python](https://github.com/openai/chatkit-python)                               |
| Python SDK Docs      | [openai.github.io/chatkit-python](https://openai.github.io/chatkit-python/)                                |
| JS SDK Docs          | [openai.github.io/chatkit-js](https://openai.github.io/chatkit-js/)                                        |
| Platform Guide       | [platform.openai.com/docs/guides/chatkit](https://platform.openai.com/docs/guides/chatkit)                 |
| Widget Guide         | [platform.openai.com/docs/guides/chatkit-widgets](https://platform.openai.com/docs/guides/chatkit-widgets) |
| Theming Guide        | [platform.openai.com/docs/guides/chatkit-themes](https://platform.openai.com/docs/guides/chatkit-themes)   |
| Advanced Integration | [platform.openai.com/docs/guides/custom-chatkit](https://platform.openai.com/docs/guides/custom-chatkit)   |
| React Package (npm)  | [@openai/chatkit-react](https://www.npmjs.com/package/@openai/chatkit-react)                               |

---

## Key Takeaways

1. **Enterprise Adoption**: Major companies (Canva, HubSpot, Ramp, Carlyle, Klarna) are already using ChatKit in production
2. **Speed of Development**: Multiple testimonials cite going from zero to production in hours rather than weeks
3. **Government Interest**: UK GDS is piloting ChatKit-style solutions for public services
4. **Community Activity**: 134+ forks of chatkit-js on GitHub, active discussions on OpenAI forums
5. **Common Pattern**: FastAPI backend + React/Next.js frontend is the dominant architecture
6. **Deployment Options**: Vercel is popular for quick deployments; enterprise deployments use custom infrastructure

---

## Areas for Further Research

- Live deployed ChatKit applications accessible to the public
- Performance benchmarks and scaling characteristics
- Security implementations for enterprise use
- Multi-language/i18n implementations
- Mobile/native app integrations
