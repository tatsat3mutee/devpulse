-- ============================================
-- 008: Content Expansion — New guides, topics, sources, YouTube educators
-- ============================================

-- 1. New topics for Cloud AI
INSERT INTO topics (name, slug, category, category_color, description)
VALUES
  ('Azure AI', 'azure-ai', 'Cloud', '#0078D4', 'Azure OpenAI, Cognitive Services, Azure AI Studio, and Microsoft cloud AI services'),
  ('AWS AI', 'aws-ai', 'Cloud', '#FF9900', 'AWS Bedrock, SageMaker, and Amazon cloud AI services'),
  ('Cloud AI Platforms', 'cloud-ai', 'Cloud', '#4285F4', 'Multi-cloud AI platforms, services comparison, and cloud ML infrastructure')
ON CONFLICT (slug) DO NOTHING;

-- 2. New knowledge guides (#12-19)
INSERT INTO knowledge_guides (title, slug, category, icon, difficulty, tags, content) VALUES
(
  'Claude Code — Terminal AI Assistant',
  'claude-code-guide',
  'ai-tools',
  '🧬',
  'intermediate',
  ARRAY['claude-code', 'anthropic', 'cli', 'agentic'],
  E'# Claude Code — Terminal AI Assistant\n\nClaude Code is Anthropic''s **agentic coding tool** that lives in your terminal. It can read your entire codebase, write and edit files, run commands, and iterate autonomously.\n\n## Getting Started\n\n```bash\nnpm install -g @anthropic-ai/claude-code\ncd your-project\nclaude\n```\n\n## Key Capabilities\n\n### 1. Full Codebase Context\n- Reads your project structure, files, and git history\n- Understands monorepos and multi-language projects\n- Uses CLAUDE.md files for project-specific instructions\n\n### 2. Agentic Loops\n- Plans multi-step tasks autonomously\n- Writes code, runs tests, fixes errors in a loop\n- Asks for permission before destructive actions\n\n### 3. Tool Use\n- **File operations**: read, write, edit files\n- **Shell commands**: run builds, tests, git\n- **Search**: grep across codebase\n- **MCP servers**: connect to external tools\n\n## Workflows\n\n| Workflow | Command |\n|----------|--------|\n| Fix a bug | ``claude "fix the failing test in auth.ts"`` |\n| Refactor | ``claude "refactor the API layer to use async/await"`` |\n| Add feature | ``claude "add pagination to the /api/items endpoint"`` |\n| Code review | ``cat diff.patch \\| claude "review this PR"`` |\n\n## CLAUDE.md — Project Memory\n\nCreate a `CLAUDE.md` at your project root to give Claude persistent context:\n```markdown\n# Project: MyApp\n- Stack: React + Express + PostgreSQL\n- Test command: npm test\n- Build command: npm run build\n- Style: Prefer functional components, TypeScript strict mode\n```\n\n## Best Practices\n\n1. **Start with clear goals** — describe what you want, not how\n2. **Use CLAUDE.md** — saves tokens and improves accuracy\n3. **Commit before big changes** — easy to revert\n4. **Review diffs** — always check what Claude changed\n5. **Combine with Copilot** — use Claude Code for big tasks, Copilot for inline edits'
),
(
  'LLM Fine-Tuning (LoRA, QLoRA, PEFT)',
  'llm-fine-tuning',
  'ai-tools',
  '🎯',
  'advanced',
  ARRAY['fine-tuning', 'lora', 'qlora', 'peft', 'training'],
  E'# LLM Fine-Tuning (LoRA, QLoRA, PEFT)\n\nFine-tuning adapts a pre-trained LLM to your specific task or domain. Modern parameter-efficient techniques make this accessible even on consumer GPUs.\n\n## Why Fine-Tune?\n\n- **Domain adaptation** — teach the model your company''s terminology\n- **Output format** — enforce consistent JSON, markdown, or structured outputs\n- **Task specialization** — improve accuracy on narrow tasks (classification, extraction)\n- **Cost reduction** — a fine-tuned smaller model can outperform a larger general model\n\n## Techniques\n\n### LoRA (Low-Rank Adaptation)\n- Freezes the base model weights\n- Adds small trainable matrices (rank decomposition)\n- Typically 0.1-1% of original parameters\n- Fast training, easy to swap adapters\n\n### QLoRA (Quantized LoRA)\n- Loads base model in 4-bit quantization\n- Applies LoRA on top of quantized weights\n- **Fine-tune a 70B model on a single 24GB GPU**\n- Uses NormalFloat4 (NF4) data type\n\n### PEFT (Parameter-Efficient Fine-Tuning)\n- Hugging Face library wrapping LoRA, prefix tuning, adapters\n- Unified API for all PEFT methods\n- Integrates with Transformers and TRL\n\n## Training Pipeline\n\n```\n1. Prepare dataset (instruction/response pairs)\n2. Choose base model (Llama 3, Mistral, Phi-3)\n3. Configure LoRA (rank, alpha, target modules)\n4. Train with TRL SFTTrainer or Axolotl\n5. Evaluate on held-out test set\n6. Merge adapter into base model\n7. Deploy with vLLM or Ollama\n```\n\n## Tools\n\n| Tool | Purpose |\n|------|---------|\n| Hugging Face TRL | Training library with SFT, DPO, RLHF |\n| Axolotl | Simplified fine-tuning config |\n| Unsloth | 2x faster LoRA training |\n| LitGPT | Lightning AI fine-tuning |\n| OpenAI Fine-tuning API | Hosted fine-tuning for GPT models |\n\n## Best Practices\n\n1. **Start with few-shot prompting** — fine-tune only if prompting isn''t enough\n2. **Quality over quantity** — 1K excellent examples > 100K noisy ones\n3. **Use evals** — measure before and after fine-tuning\n4. **Keep base model frozen** — LoRA/QLoRA prevents catastrophic forgetting\n5. **Version your datasets** — reproducibility is critical'
),
(
  'RAG & Vectorless RAG',
  'rag-guide',
  'ai-tools',
  '🔍',
  'intermediate',
  ARRAY['rag', 'retrieval', 'vector-search', 'embeddings', 'context'],
  E'# RAG & Vectorless RAG\n\nRetrieval-Augmented Generation (RAG) grounds LLM responses in external data by **retrieving relevant documents** before generating an answer.\n\n## Classic RAG Pipeline\n\n```\nQuery → Embed → Vector Search → Retrieved Chunks → LLM → Answer\n```\n\n### Components\n1. **Document Ingestion** — split docs into chunks, compute embeddings\n2. **Vector Store** — Pinecone, Weaviate, Chroma, pgvector\n3. **Retrieval** — similarity search (cosine, dot product)\n4. **Augmentation** — inject retrieved context into the prompt\n5. **Generation** — LLM produces grounded answer\n\n## Vectorless RAG\n\nNewer approaches skip vector embeddings entirely:\n\n### BM25 / Full-Text Search\n- Classic keyword-based retrieval\n- Works surprisingly well for structured documents\n- No embedding model needed\n\n### ColBERT / Late Interaction\n- Token-level similarity instead of document-level\n- Better precision on technical queries\n- Tools: RAGatouille, Vespa\n\n### Graph RAG\n- Build knowledge graphs from documents\n- Retrieve subgraphs for multi-hop reasoning\n- Tools: Microsoft GraphRAG, Neo4j\n\n### Contextual Retrieval (Anthropic)\n- Adds document-level context to each chunk before indexing\n- 67% reduction in retrieval failures\n- Works with any retrieval method\n\n## Hybrid Approach\n\nBest results typically combine multiple retrieval methods:\n```\nQuery → BM25 + Vector Search → Reranker (Cohere/Jina) → Top-K → LLM\n```\n\n## Evaluation\n\n| Metric | What it Measures |\n|--------|------------------|\n| Retrieval Precision | % of retrieved docs that are relevant |\n| Retrieval Recall | % of relevant docs that are retrieved |\n| Answer Faithfulness | Does the answer stick to retrieved context? |\n| Answer Relevance | Does the answer address the query? |\n\n## Best Practices\n\n1. **Chunk wisely** — semantic chunking > fixed-size\n2. **Always rerank** — improves precision by 10-30%\n3. **Hybrid search** — BM25 + vectors cover each other''s weaknesses\n4. **Eval continuously** — track retrieval quality over time\n5. **Start simple** — pgvector + BM25 before complex setups'
),
(
  'Awesome Copilot — Skills, Agents & Plugins',
  'awesome-copilot-guide',
  'copilot',
  '🧩',
  'intermediate',
  ARRAY['copilot', 'skills', 'agents', 'plugins', 'awesome-copilot'],
  E'# Awesome Copilot — Skills, Agents & Plugins\n\nGitHub Copilot is more than code completions. With **custom agents, skills, and instruction files**, you can tailor Copilot to your team''s workflows.\n\n## Custom Instructions\n\n### .github/copilot-instructions.md\nProject-level instructions that apply to every Copilot interaction:\n```markdown\n- Use TypeScript strict mode\n- Prefer functional components in React\n- Follow our API naming convention: /api/v1/{resource}\n- Always include error handling with proper HTTP status codes\n```\n\n### .instructions.md Files\nScoped instructions that apply to specific file patterns via `applyTo` frontmatter:\n```yaml\n---\napplyTo: \"**/*.test.ts\"\n---\nUse vitest for testing. Prefer `describe/it` blocks.\nAlways mock external dependencies.\n```\n\n## Custom Agents (.agent.md)\n\nCreate specialized agent modes:\n```yaml\n---\nname: reviewer\ndescription: Code review specialist\ntools:\n  - read_file\n  - grep_search\n  - semantic_search\n---\nYou are a code reviewer. Analyze code for:\n- Security vulnerabilities\n- Performance issues\n- Code style violations\n- Missing tests\n```\n\n## Skills (SKILL.md)\n\nSkills provide domain-specific capabilities:\n```yaml\n---\nname: api-design\ndescription: REST API design patterns\n---\n# API Design Skill\nFollow RESTful conventions...\n```\n\n## awesome-copilot Repository\n\nThe `github/awesome-copilot` repo curates community-contributed:\n- **Instructions** — coding standards, frameworks, languages\n- **Agents** — specialized workflow agents\n- **Skills** — domain knowledge packages\n\n## Best Practices\n\n1. **Start with instructions** — lowest effort, highest impact\n2. **One agent per workflow** — don''t overload a single agent\n3. **Test your agents** — verify they use the right tools\n4. **Share with your team** — commit to `.github/` for project-wide use\n5. **Iterate on prompts** — refine based on actual Copilot behavior'
),
(
  'Azure AI Services for Developers',
  'azure-ai-services',
  'cloud',
  '☁️',
  'intermediate',
  ARRAY['azure', 'azure-openai', 'cognitive-services', 'cloud-ai'],
  E'# Azure AI Services for Developers\n\nMicrosoft Azure provides a comprehensive suite of AI services from pre-built APIs to custom model deployment.\n\n## Azure OpenAI Service\n\nAccess GPT-4o, GPT-4, GPT-3.5 Turbo, and DALL-E through Azure:\n- **Enterprise security** — VNet, private endpoints, managed identity\n- **Content filtering** — built-in safety filters\n- **Regional deployment** — data residency compliance\n- **Provisioned throughput** — guaranteed capacity\n\n### Quick Start\n```python\nfrom openai import AzureOpenAI\n\nclient = AzureOpenAI(\n    azure_endpoint=\"https://your-resource.openai.azure.com/\",\n    api_key=os.environ[\"AZURE_OPENAI_API_KEY\"],\n    api_version=\"2024-02-01\"\n)\n\nresponse = client.chat.completions.create(\n    model=\"gpt-4o\",\n    messages=[{\"role\": \"user\", \"content\": \"Hello!\"}]\n)\n```\n\n## Azure AI Studio\n\nUnified platform for building AI apps:\n- **Prompt flow** — visual prompt engineering and chaining\n- **Model catalog** — deploy OpenAI, Llama, Mistral, Phi models\n- **Evaluation** — built-in eval metrics and datasets\n- **RAG** — integrated vector search with Azure AI Search\n\n## Key Services\n\n| Service | Use Case |\n|---------|---------|\n| Azure OpenAI | Chat, completions, embeddings |\n| Azure AI Search | Vector + hybrid search for RAG |\n| Azure AI Document Intelligence | Extract data from documents |\n| Azure AI Speech | Speech-to-text, text-to-speech |\n| Azure AI Vision | Image analysis, OCR |\n| Azure AI Content Safety | Content moderation |\n\n## Spring Boot + Azure AI\n\nFor Java developers using Spring Boot:\n```xml\n<dependency>\n    <groupId>com.azure.spring</groupId>\n    <artifactId>spring-cloud-azure-starter-openai</artifactId>\n</dependency>\n```\n\n## Best Practices\n\n1. **Use managed identity** — avoid API keys in production\n2. **Enable content filtering** — required for enterprise\n3. **Monitor with Azure Monitor** — track token usage and latency\n4. **Use provisioned throughput** — for production workloads\n5. **Stay in-region** — minimize latency and comply with data residency'
),
(
  'AWS AI & Bedrock Guide',
  'aws-ai-bedrock',
  'cloud',
  '🟧',
  'intermediate',
  ARRAY['aws', 'bedrock', 'sagemaker', 'cloud-ai'],
  E'# AWS AI & Bedrock Guide\n\nAmazon Web Services provides AI capabilities from managed model APIs to full ML training infrastructure.\n\n## Amazon Bedrock\n\nManaged service for foundation models:\n- **Model choice** — Claude, Llama, Mistral, Titan, Stable Diffusion\n- **Knowledge Bases** — managed RAG with S3 and OpenSearch\n- **Agents** — build agentic workflows with tool use\n- **Guardrails** — content filtering and topic blocking\n- **Fine-tuning** — customize models on your data\n\n### Quick Start\n```python\nimport boto3\n\nclient = boto3.client(\"bedrock-runtime\", region_name=\"us-east-1\")\n\nresponse = client.converse(\n    modelId=\"anthropic.claude-3-5-sonnet-20241022-v2:0\",\n    messages=[{\"role\": \"user\", \"content\": [{\"text\": \"Hello!\"}]}]\n)\n```\n\n## Amazon SageMaker\n\nFull ML lifecycle platform:\n- **Training** — distributed training on GPU clusters\n- **Endpoints** — real-time and batch inference\n- **JumpStart** — pre-trained model hub\n- **Studio** — notebook IDE with built-in experiments\n\n## Key Services\n\n| Service | Use Case |\n|---------|---------|\n| Bedrock | Foundation model APIs |\n| SageMaker | Custom model training & deployment |\n| Kendra | Enterprise search (RAG) |\n| Comprehend | NLP: entities, sentiment, language |\n| Rekognition | Image & video analysis |\n| Polly | Text-to-speech |\n| Transcribe | Speech-to-text |\n| CodeWhisperer | AI code assistant (now Amazon Q) |\n\n## Amazon Q Developer\n\nAWS''s AI coding assistant (successor to CodeWhisperer):\n- IDE integration (VS Code, JetBrains)\n- Code generation and transformation\n- AWS service integration\n- Security scanning\n\n## Best Practices\n\n1. **Use IAM roles** — never hardcode credentials\n2. **Choose the right model** — Bedrock for API, SageMaker for custom\n3. **Enable CloudWatch** — monitor invocations and latency\n4. **Use VPC endpoints** — keep traffic private\n5. **Evaluate models** — Bedrock has built-in evaluation tools'
),
(
  'Karpathy''s AI from Scratch',
  'karpathy-ai-from-scratch',
  'ai-tools',
  '🧠',
  'advanced',
  ARRAY['karpathy', 'neural-nets', 'from-scratch', 'nanoGPT', 'education'],
  E'# Karpathy''s AI from Scratch\n\nAndrej Karpathy (founding member of OpenAI, former Tesla AI director) creates exceptional educational content that teaches neural networks **from the ground up**.\n\n## Key Repositories\n\n### nanoGPT\nThe simplest, fastest repository for training medium-sized GPTs:\n- ~300 lines of PyTorch code\n- Train a character-level language model\n- Reproduce GPT-2 (124M) on OpenWebText\n- Understand transformer architecture hands-on\n\n### micrograd\nTiny autograd engine + neural net library:\n- Backpropagation in ~100 lines\n- Build understanding of gradients and chain rule\n- Foundation for understanding PyTorch internals\n\n### minbpe\nMinimal byte-pair encoding tokenizer:\n- Understand how LLMs tokenize text\n- GPT-4 tokenizer from scratch\n- Essential for understanding model inputs\n\n### llm.c\nLLM training in pure C/CUDA:\n- No Python, no PyTorch — just raw CUDA kernels\n- GPT-2 training from scratch\n- Understand what frameworks abstract away\n\n## YouTube Series: \"Neural Networks: Zero to Hero\"\n\n| Episode | Topic |\n|---------|-------|\n| 1 | Micrograd — backprop from scratch |\n| 2 | Makemore — character-level language model |\n| 3 | Building GPT from scratch |\n| 4 | Tokenization (BPE) |\n| 5 | GPT-2 reproducing |\n\n## Learning Path\n\n1. **Start with micrograd** — understand backprop\n2. **Watch the Zero to Hero series** — build intuition\n3. **Implement nanoGPT** — train your own GPT\n4. **Study minbpe** — understand tokenization\n5. **Explore llm.c** — see the raw computation\n\n## Why This Matters\n\nUnderstanding AI from first principles makes you a better:\n- **AI Engineer** — debug model behavior, not just API calls\n- **Prompt Engineer** — understand why models behave as they do\n- **ML Engineer** — optimize training and inference\n- **Builder** — make better architectural decisions'
),
(
  'Spring Boot + Azure AI Integration',
  'spring-boot-azure-ai',
  'cloud',
  '🍃',
  'intermediate',
  ARRAY['spring-boot', 'azure', 'java', 'spring-ai', 'azure-openai'],
  E'# Spring Boot + Azure AI Integration\n\nBuild AI-powered Java applications with Spring Boot and Azure AI services.\n\n## Spring AI Framework\n\nSpring AI provides a portable abstraction for AI model integration:\n\n```xml\n<dependency>\n    <groupId>org.springframework.ai</groupId>\n    <artifactId>spring-ai-azure-openai-spring-boot-starter</artifactId>\n</dependency>\n```\n\n### Configuration\n```yaml\nspring:\n  ai:\n    azure:\n      openai:\n        api-key: ${AZURE_OPENAI_API_KEY}\n        endpoint: ${AZURE_OPENAI_ENDPOINT}\n        chat:\n          options:\n            deployment-name: gpt-4o\n            temperature: 0.7\n```\n\n### Chat Completion\n```java\n@RestController\npublic class ChatController {\n    private final ChatClient chatClient;\n\n    public ChatController(ChatClient.Builder builder) {\n        this.chatClient = builder.build();\n    }\n\n    @GetMapping(\"/chat\")\n    public String chat(@RequestParam String message) {\n        return chatClient.prompt()\n            .user(message)\n            .call()\n            .content();\n    }\n}\n```\n\n## RAG with Azure AI Search\n\n```java\n@Bean\nChatClient chatClient(ChatClient.Builder builder,\n                       VectorStore vectorStore) {\n    return builder\n        .defaultAdvisors(\n            new QuestionAnswerAdvisor(vectorStore)\n        )\n        .build();\n}\n```\n\n## Azure Services Integration\n\n| Azure Service | Spring Starter |\n|---------------|---------------|\n| Azure OpenAI | spring-ai-azure-openai |\n| Azure AI Search | spring-ai-azure-store |\n| Azure Blob Storage | spring-cloud-azure-starter-storage-blob |\n| Azure Key Vault | spring-cloud-azure-starter-keyvault |\n\n## Deployment on Azure\n\n### Azure Container Apps\n```bash\naz containerapp up \\\n  --name my-spring-ai-app \\\n  --source . \\\n  --env-vars AZURE_OPENAI_API_KEY=secretref:openai-key\n```\n\n### Azure Spring Apps\n```bash\naz spring app deploy \\\n  --name my-app \\\n  --artifact-path target/app.jar\n```\n\n## Best Practices\n\n1. **Use Spring AI abstractions** — switch between OpenAI/Azure/Ollama easily\n2. **Externalize config** — Azure Key Vault for secrets\n3. **Use managed identity** — passwordless auth to Azure services\n4. **Add observability** — Micrometer + Azure Monitor\n5. **Test with Ollama locally** — swap to Azure for production'
);

-- 3. New YouTube sources (educators)
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active)
VALUES
  ('Krish Naik', 'YouTube', 'education', 'https://www.youtube.com/channel/UCNU_lfiiWBdtULKOw6X0Dig', 'youtube', true),
  ('Codedamn (Mehul Mohan)', 'YouTube', 'education', 'https://www.youtube.com/channel/UCJUmfpY2OKJXCR3oPhVaFg', 'youtube', true),
  ('Andrej Karpathy', 'YouTube', 'education', 'https://www.youtube.com/channel/UCXUPKJO5MZQN11PqgIvyuvQ', 'youtube', true),
  ('Code With Harry', 'YouTube', 'education', 'https://www.youtube.com/channel/UCeVMnSShP_Iviwkknt83cwQ', 'youtube', true),
  ('3Blue1Brown', 'YouTube', 'education', 'https://www.youtube.com/channel/UCYO_jab_esuFRV4b17AJtAw', 'youtube', true),
  ('Abhishek Thakur', 'YouTube', 'education', 'https://www.youtube.com/channel/UCBPRJjIWfyNG4X-CRbnv78A', 'youtube', true),
  ('Tech With Tim', 'YouTube', 'education', 'https://www.youtube.com/channel/UC4JX40jDee_tINbkjycV4Sg', 'youtube', true)
ON CONFLICT DO NOTHING;

-- 4. Cloud AI sources (RSS, Reddit, GitHub)
INSERT INTO sources (name, platform, category, url, fetcher_key, is_active)
VALUES
  ('Azure AI Blog', 'Microsoft', 'news', 'https://techcommunity.microsoft.com/t5/ai-azure-ai-services-blog/bg-p/Azure-AI-Services-blog/label-name/Azure%20OpenAI', 'rss', true),
  ('AWS Machine Learning Blog', 'AWS', 'news', 'https://aws.amazon.com/blogs/machine-learning/feed/', 'rss', true),
  ('r/azuredevops', 'Reddit', 'social', 'https://www.reddit.com/r/azuredevops', 'reddit', true),
  ('r/aws', 'Reddit', 'social', 'https://www.reddit.com/r/aws', 'reddit', true),
  ('Azure AI Samples (GitHub)', 'GitHub', 'code', 'https://github.com/Azure-Samples?q=ai&type=&language=&sort=', 'github-trending', true),
  ('AWS Generative AI (GitHub)', 'GitHub', 'code', 'https://github.com/aws-samples?q=generative-ai&type=&language=&sort=', 'github-trending', true)
ON CONFLICT DO NOTHING;
