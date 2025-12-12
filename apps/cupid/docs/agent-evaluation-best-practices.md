# Agent Response Evaluation - Best Practices

> Research document for implementing agent evaluation in Cupid.
> Last updated: December 2025

---

## Executive Summary

This document outlines best practices for managing and evaluating agent responses in OpenAI Agents SDK applications. The recommended approach is a **two-level evaluation strategy**: online monitoring in production and offline testing during development.

**Recommended Stack:**
- **Langfuse** - Native OpenAI Agents SDK integration, captures full execution traces
- **LLM-as-Judge** - Use a lightweight model to evaluate narrative quality
- **DeepEval** - Open source, pytest-like syntax for unit testing LLM outputs

---

## 1. Two-Level Evaluation Strategy

### Online Evaluation (Production)
Real-time monitoring of live agent interactions:

| What to Track | How |
|---------------|-----|
| **Cost** | Token usage per step (automatic with tracing) |
| **Latency** | Execution time breakdown by agent/tool |
| **User feedback** | Thumbs up/down attached to traces |
| **Quality** | LLM-as-Judge scores outputs |

### Offline Evaluation (Development)
Systematic testing before deployment:

| What to Track | How |
|---------------|-----|
| **Dataset evaluation** | Benchmark against expected outputs |
| **Regression testing** | Run eval suites on every commit |
| **Quality thresholds** | Configure pass/fail criteria |

---

## 2. Key Metrics

| Metric | Description | Level |
|--------|-------------|-------|
| Task Completion | Did agent achieve the goal? | End-to-end |
| Tool Selection | Did agent choose correct tools? | Step |
| Reasoning Quality | Was the logic sound? | Step |
| Response Accuracy | Is output factually correct? | Response |
| Latency | Time per step and total | Performance |
| Cost | Token usage per interaction | Performance |
| User Satisfaction | Direct feedback scores | Business |

---

## 3. Evaluation Frameworks

### OpenAI Evals (Official)
- **Datasets**: Build evals with automated graders
- **Trace grading**: End-to-end assessment of agentic workflows
- **Prompt optimization**: Auto-generate improved prompts from annotations
- Built into Agents SDK via tracing

### Langfuse (Recommended)
- Native integration with OpenAI Agents SDK
- Traces capture full agent execution hierarchy
- Supports LLM-as-Judge evaluators
- User feedback collection API
- Free tier available

### DeepEval (Open Source)
- Pytest-like syntax for LLM unit testing
- Metrics: G-Eval, hallucination, answer relevancy, RAGAS
- Works with any LLM provider

---

## 4. Implementation for Cupid

### Step 1: Add Tracing (Quick Win)

```python
# In server.py - add at top of file
import logfire

logfire.configure(service_name='cupid', send_to_logfire=False)
logfire.instrument_openai_agents()
```

This single change captures all agent runs with full execution traces.

### Step 2: Create Evaluation Dataset

Build test cases covering:

```yaml
# Example: tests/eval_dataset.yaml
- name: "happy_path_first_date"
  input:
    mortal: "Zara Patel"
    match: "Jordan Kim"
    choices: ["A", "B", "A", "C"]
  expected:
    story_ends: true
    evaluation_generated: true

- name: "edge_case_rapid_continue"
  input:
    mortal: "Zara Patel"
    match: "Jordan Kim"
    choices: ["continue", "continue", "continue"]
  expected:
    no_crash: true
```

### Step 3: LLM-as-Judge for Narrative Quality

```python
# Example evaluator for narrative quality
EVALUATION_PROMPT = """
Rate this narrative response (1-5) on each criterion:

1. **Engagement**: Is it compelling and well-written?
2. **Consistency**: Does it match the character profiles?
3. **Choice Quality**: Are the player options meaningful and distinct?

## Narrative
{response}

## Character Data
Mortal: {mortal_data}
Match: {match_data}

Respond with JSON: {"engagement": N, "consistency": N, "choice_quality": N, "overall": N}
"""

async def evaluate_narrative(response: str, mortal_data: dict, match_data: dict) -> dict:
    """Run LLM-as-Judge evaluation on a narrative response."""
    result = await Runner.run(
        evaluation_agent,
        EVALUATION_PROMPT.format(
            response=response,
            mortal_data=mortal_data,
            match_data=match_data,
        ),
    )
    return result.final_output
```

---

## 5. Cupid-Specific Evaluation Criteria

### Agent-Level Evaluations

| Agent | What to Evaluate |
|-------|------------------|
| `introduction_agent` | Tone consistency, engagement hooks |
| `mortal_agent` | Character accuracy from YAML data |
| `match_agent` | Character accuracy from YAML data |
| `start_cupid_game_agent` | Narrative quality, choice generation |
| `cupid_evaluation_agent` | Summary accuracy, wit level |
| `display_choices_agent` | Choice extraction accuracy (3 options, A/B/C format) |
| `has_ended_agent` | Ending detection accuracy (false positive/negative rates) |

### End-to-End Evaluations

- Full story playthrough coherence
- Player agency impact on narrative (do choices matter?)
- Compatibility score integration into story
- Character voice consistency across chapters

---

## 6. Implementation Roadmap

### Phase 1: Observability (Week 1)
- [ ] Add Langfuse/Logfire instrumentation to `server.py`
- [ ] Capture traces for all agent runs
- [ ] Log user choices and outcomes
- [ ] Set up Langfuse dashboard

### Phase 2: Offline Evals (Week 2-3)
- [ ] Create benchmark dataset of story paths
- [ ] Define expected outputs for key scenarios
- [ ] Build pytest test suite with DeepEval
- [ ] Set up CI evaluation pipeline (GitHub Actions)

### Phase 3: Online Quality (Week 4+)
- [ ] Add user feedback mechanism (optional thumbs up/down)
- [ ] Implement LLM-as-Judge for narrative quality
- [ ] Create quality metrics dashboard
- [ ] Set up alerts for quality degradation

---

## 7. Code Patterns

### Tracing with Custom Attributes

```python
from langfuse import Langfuse

langfuse = Langfuse()

async def respond(self, thread, item, context):
    with langfuse.start_as_current_span(name="cupid-respond") as span:
        span.update_trace(
            input=item.content if item else "new_thread",
            user_id=context.user_id,
            session_id=thread.id,
            tags=["cupid", f"chapter_{thread.metadata.get('chapter', 0)}"],
            metadata={
                "mortal": thread.metadata.get("mortal_data", {}).get("name"),
                "match": thread.metadata.get("match_data", {}).get("name"),
            }
        )

        # ... existing respond logic ...

        span.update_trace(output=result)
```

### Dataset Evaluation Runner

```python
import pytest
from deepeval import assert_test
from deepeval.metrics import AnswerRelevancyMetric

@pytest.mark.parametrize("test_case", load_eval_dataset())
def test_narrative_quality(test_case):
    """Test narrative generation quality."""
    response = run_agent(test_case.input)

    metric = AnswerRelevancyMetric(threshold=0.7)
    assert_test(
        input=test_case.input,
        actual_output=response,
        expected_output=test_case.expected,
        metrics=[metric],
    )
```

---

## Sources

- [OpenAI - New Tools for Building Agents](https://openai.com/index/new-tools-for-building-agents/)
- [OpenAI Cookbook - Evaluating Agents with Langfuse](https://cookbook.openai.com/examples/agents_sdk/evaluate_agents)
- [Langfuse - Tracing and Evaluation for OpenAI-Agents SDK](https://langfuse.com/guides/cookbook/example_evaluating_openai_agents)
- [DeepEval - Open Source LLM Evaluation Framework](https://github.com/confident-ai/deepeval)
- [Confident AI - LLM Agent Evaluation Complete Guide](https://www.confident-ai.com/blog/llm-agent-evaluation-complete-guide)
- [arXiv - Survey on Evaluation of LLM-based Agents (2025)](https://arxiv.org/abs/2503.16416)
- [Maxim AI - 5 Leading Platforms for AI Agent Evals](https://www.getmaxim.ai/articles/the-5-leading-platforms-for-ai-agent-evals-in-2025/)
