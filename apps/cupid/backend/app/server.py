"""CupidServer implements the ChatKitServer interface for the Cupid Deluxe matchmaking game."""

from __future__ import annotations

import logging
import yaml
from datetime import datetime
from pathlib import Path
from typing import Annotated, Any, AsyncIterator

from agents import Runner
from langfuse import propagate_attributes
from chatkit.agents import AgentContext, stream_agent_response
from chatkit.server import ChatKitServer
from chatkit.types import (
    Action,
    Attachment,
    HiddenContextItem,
    InferenceOptions,
    ProgressUpdateEvent,
    ThreadItemDoneEvent,
    ThreadMetadata,
    ThreadStreamEvent,
    UserMessageItem,
    UserMessageTextContent,
    WidgetItem,
)
from openai.types.responses import ResponseInputContentParam
from pydantic import Field

# Import all agents
from .agents.introduction_agent import introduction_agent
from .agents.mortal_agent import mortal_agent, MortalContext
from .agents.match_agent import match_agent, MatchContext
from .agents.start_cupid_game_agent import start_cupid_game_agent
from .agents.cupid_evaluation_agent import cupid_evaluation_agent
from .agents.end_agent import end_agent
from .agents.display_mortal_agent import display_mortal_agent, DisplayMortalContext
from .agents.display_match_agent import display_match_agent, DisplayMatchContext
# Note: display_continue_card_agent removed - using direct widget calls for static messages
from .agents.display_compatibility_card_agent import display_compatibility_card_agent, DisplayCompatibilityCardContext
from .agents.compatibility_analysis_agent import compatibility_analysis_agent
from .agents.display_choices_agent import display_choices_agent, DisplayChoicesContext
from .agents.has_ended_agent import has_ended_agent, HasEndedContext

from .memory_store import MemoryStore
from .request_context import RequestContext
from .thread_item_converter import BasicThreadItemConverter

# Import widget builders
from .widgets.profilecard_widget import build_profilecard_widget
from .widgets.continue_card_widget import build_continue_card_widget
from .widgets.choice_list_widget import build_choice_list_widget
from .widgets.compatibility_analysis_widget import build_compatibility_analysis_widget

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CupidAgentContext(AgentContext):
    """Context for the Cupid game agent."""

    store: Annotated[MemoryStore, Field(exclude=True)]
    request_context: RequestContext


class CupidServer(ChatKitServer[RequestContext]):
    """ChatKit server for Cupid Deluxe romantic matchmaking game."""

    def __init__(self) -> None:
        self.store: MemoryStore = MemoryStore()
        super().__init__(self.store)
        self.thread_item_converter = BasicThreadItemConverter()

        # Load character and compatibility data from YAML files
        data_dir = Path(__file__).parent / "data"
        with open(data_dir / "mortal.yaml", "r", encoding="utf-8") as f:
            self.mortal_data = yaml.safe_load(f)
        with open(data_dir / "match.yaml", "r", encoding="utf-8") as f:
            self.match_data = yaml.safe_load(f)
        with open(data_dir / "compatibility.yaml", "r", encoding="utf-8") as f:
            self.compatibility_data = yaml.safe_load(f)

        # Pre-compute YAML strings for default data (used when thread.metadata data matches)
        self._default_mortal_str = yaml.dump(self.mortal_data, default_flow_style=False)
        self._default_match_str = yaml.dump(self.match_data, default_flow_style=False)
        self._default_compatibility_str = yaml.dump(self.compatibility_data, default_flow_style=False)

    def _get_data_strings(self, thread: ThreadMetadata) -> tuple[str, str, str]:
        """Get YAML data strings for agents, using thread.metadata if different from defaults.

        This allows per-thread couple data in the future while optimizing for the common case
        where all threads use the same default couple.
        """
        metadata = thread.metadata or {}

        # Check if thread has custom data (future: different couples per thread)
        mortal_data = metadata.get("mortal_data", self.mortal_data)
        match_data = metadata.get("match_data", self.match_data)
        compat_data = metadata.get("compatibility_data", self.compatibility_data)

        # Use pre-computed strings if data matches defaults (optimization)
        mortal_str = self._default_mortal_str if mortal_data is self.mortal_data else yaml.dump(mortal_data, default_flow_style=False)
        match_str = self._default_match_str if match_data is self.match_data else yaml.dump(match_data, default_flow_style=False)
        compat_str = self._default_compatibility_str if compat_data is self.compatibility_data else yaml.dump(compat_data, default_flow_style=False)

        return mortal_str, match_str, compat_str

    def _generate_widget_id(self, thread: ThreadMetadata) -> str:
        """Generate a unique widget ID."""
        return f"widget_{thread.id}_{datetime.now().timestamp()}"

    async def _set_chapter(
        self,
        thread: ThreadMetadata,
        context: RequestContext,
        chapter: int,
    ) -> None:
        """Update chapter in thread.metadata and persist."""
        if thread.metadata is None:
            thread.metadata = {}
        thread.metadata["chapter"] = chapter
        await self.store.save_thread(thread, context)

    async def _maybe_update_thread_title(
        self,
        thread: ThreadMetadata,
        context: RequestContext,
    ) -> None:
        """Set thread title to 'Mortal & Match' format on first message."""
        if thread.title is not None:
            return

        metadata = thread.metadata or {}
        mortal_data = metadata.get("mortal_data")
        match_data = metadata.get("match_data")

        if mortal_data and match_data:
            mortal_first = mortal_data.get("name", "").split()[0]
            match_first = match_data.get("name", "").split()[0]
            thread.title = f"{mortal_first} & {match_first}"
            await self.store.save_thread(thread, context=context)

    async def action(
        self,
        thread: ThreadMetadata,
        action: Action[str, Any],
        sender: WidgetItem | None,
        context: RequestContext,
    ) -> AsyncIterator[ThreadStreamEvent]:
        """Handle widget actions (Continue button, Choice selection)."""

        message_text = "Continue"  # Default
        choice_key = None
        choice_title = None

        if action.type == "continue":
            # Continue button clicked
            message_text = "Continue"
        elif action.type == "choice.select":
            # Choice item selected - format as "A - Title"
            choice_key = action.payload.get("key", "")
            choice_title = action.payload.get("title", "")
            message_text = f"{choice_key} - {choice_title}"
        elif action.type == "conversation.message":
            # Legacy support for conversation.message
            message_text = action.payload.get("text", "Continue")

        # Create a user message item
        user_message = UserMessageItem(
            thread_id=thread.id,
            id=self.store.generate_item_id("message", thread, context),
            created_at=datetime.now(),
            content=[UserMessageTextContent(text=message_text)],
            inference_options=InferenceOptions(),
        )

        # Add the message to the store
        await self.store.add_thread_item(thread.id, user_message, context)

        # If a choice was selected, add hidden context for agent awareness
        if choice_key and choice_title:
            hidden_item = HiddenContextItem(
                id=self.store.generate_item_id("message", thread, context),
                thread_id=thread.id,
                created_at=datetime.now(),
                content=f"<PLAYER_CHOICE>{choice_key}: {choice_title}</PLAYER_CHOICE>",
            )
            await self.store.add_thread_item(thread.id, hidden_item, context)

        # Yield the message event
        yield ThreadItemDoneEvent(item=user_message)

        # Call respond to generate the next chapter
        async for event in self.respond(thread, user_message, context):
            yield event

    async def respond(
        self,
        thread: ThreadMetadata,
        item: UserMessageItem | None,
        context: RequestContext,
    ) -> AsyncIterator[ThreadStreamEvent]:
        """Handle conversation turns with chapter-based logic."""

        # Initialize state in thread.metadata (authoritative source, persists across requests)
        if thread.metadata is None:
            thread.metadata = {}

        if "chapter" not in thread.metadata:
            thread.metadata["chapter"] = 0

            # Check for match session ID in context (populated from header by main.py)
            match_data_loaded = False
            if context.match_session_id:
                from .match_session_store import match_session_store
                match_selection = match_session_store.retrieve(context.match_session_id)

                if match_selection:
                    thread.metadata["selected_match_id"] = match_selection.get("selected_match_id")
                    thread.metadata["mortal_data"] = match_selection.get("mortal_data", self.mortal_data)
                    thread.metadata["match_data"] = match_selection.get("match_data", self.match_data)
                    thread.metadata["compatibility_data"] = match_selection.get("compatibility_data", self.compatibility_data)
                    match_data_loaded = True
                    logger.info(f"Using match data from session: {context.match_session_id}")

            if not match_data_loaded:
                # Legacy: use default files (backwards compatibility)
                logger.info("Using default match data (legacy mode)")
                thread.metadata["mortal_data"] = self.mortal_data
                thread.metadata["match_data"] = self.match_data
                thread.metadata["compatibility_data"] = self.compatibility_data

            thread.metadata["current_compatibility"] = thread.metadata.get(
                "compatibility_data", {}
            ).get("overall_compatibility", 69)
            await self.store.save_thread(thread, context)

        # Set thread title on first message (format: "Mortal & Match")
        await self._maybe_update_thread_title(thread, context)

        # Create base agent context
        agent_context = CupidAgentContext(
            thread=thread,
            store=self.store,
            request_context=context,
        )

        # Load all thread items for conversation history
        items_page = await self.store.load_thread_items(
            thread.id,
            after=None,
            limit=100,
            order="desc",
            context=context,
        )

        # Reverse to get chronological order
        items = list(reversed(items_page.data))

        # Convert to agent input format
        input_items = await self.thread_item_converter.to_agent_input(items)

        # Get current chapter from thread.metadata (authoritative source)
        chapter = thread.metadata.get("chapter", 0)
        logger.info(f"Processing chapter {chapter}")

        # Wrap agent calls with Langfuse tracing metadata
        # This attaches session_id, user_id, tags, and custom metadata to all traces
        with propagate_attributes(
            session_id=thread.id,
            user_id=context.match_session_id or "anonymous",
            tags=[f"chapter_{chapter}", "cupid"],
            metadata={
                "mortal": thread.metadata.get("mortal_data", {}).get("name"),
                "match": thread.metadata.get("match_data", {}).get("name"),
                "compatibility": thread.metadata.get("current_compatibility"),
            }
        ):
            # Yield events directly from chapter handlers (enables streaming)
            if chapter == 0:
                async for event in self._handle_chapter_0(thread, input_items, agent_context, context):
                    yield event

            elif chapter == 1:
                async for event in self._handle_chapter_1(thread, input_items, agent_context, context):
                    yield event

            elif chapter == 2:
                async for event in self._handle_chapter_2(thread, input_items, agent_context, context):
                    yield event

            elif chapter == 3:
                async for event in self._handle_chapter_3(thread, input_items, agent_context, context):
                    yield event

            elif chapter == 4:
                async for event in self._handle_chapter_4(thread, input_items, agent_context, context):
                    yield event

            elif chapter == 5:
                async for event in self._handle_chapter_5(thread, input_items, agent_context, context):
                    yield event

            else:
                async for event in self._handle_chapter_final(thread, input_items, agent_context, context):
                    yield event

    async def _handle_chapter_0(
        self,
        thread: ThreadMetadata,
        input_items: list,
        agent_context: CupidAgentContext,
        context: RequestContext,
    ) -> AsyncIterator[ThreadStreamEvent]:
        """Chapter 0: Introduction + DisplayMortal + ProfileCard widget."""
        logger.info("Chapter 0: Introduction")

        # Get thread-specific data strings
        mortal_str, match_str, compat_str = self._get_data_strings(thread)

        # Agent Builder pattern: accumulate conversation after each agent
        conversation_history = list(input_items)

        # Show progress indicator
        yield ProgressUpdateEvent(text="Introducing Cupid...")

        # Run Introduction agent - stream events directly
        result = Runner.run_streamed(introduction_agent, conversation_history, context=agent_context)
        async for event in stream_agent_response(agent_context, result):
            yield event
        conversation_history.extend([item.to_input_item() for item in result.new_items])

        # Run DisplayMortal agent (pass minimal input - only needs context data, not conversation history)
        display_context = DisplayMortalContext(state_mortal=mortal_str)
        display_result = await Runner.run(
            display_mortal_agent,
            "display",
            context=display_context,
        )

        # Build and yield ProfileCard widget
        profile_data = display_result.final_output.model_dump()
        profilecard_widget = build_profilecard_widget(profile_data)
        widget_item = WidgetItem(
            thread_id=thread.id,
            id=self._generate_widget_id(thread),
            created_at=datetime.now(),
            widget=profilecard_widget,
            copy_text=f"{profile_data['name']}, {int(profile_data['age'])}, {profile_data['occupation']}",
        )
        yield ThreadItemDoneEvent(item=widget_item)

        # Increment chapter and persist
        await self._set_chapter(thread, context, 1)

    async def _handle_chapter_1(
        self,
        thread: ThreadMetadata,
        input_items: list,
        agent_context: CupidAgentContext,
        context: RequestContext,
    ) -> AsyncIterator[ThreadStreamEvent]:
        """Chapter 1: Mortal narrative + DisplayMatch + ProfileCard widget."""
        logger.info("Chapter 1: Mortal narrative")

        # Get thread-specific data strings
        mortal_str, match_str, compat_str = self._get_data_strings(thread)

        # Agent Builder pattern: accumulate conversation after each agent
        conversation_history = list(input_items)

        # Show progress indicator
        yield ProgressUpdateEvent(text="Presenting your mortal...")

        # Run Mortal agent with context - stream events directly
        mortal_context = MortalContext(state_mortal=mortal_str)
        result = Runner.run_streamed(mortal_agent, conversation_history, context=mortal_context)
        async for event in stream_agent_response(agent_context, result):
            yield event
        conversation_history.extend([item.to_input_item() for item in result.new_items])

        # Run DisplayMatch agent (pass [] - only needs context data, not conversation history)
        display_context = DisplayMatchContext(state_match=match_str)
        display_result = await Runner.run(
            display_match_agent,
            "display",
            context=display_context,
        )

        # Build and yield ProfileCard widget for match
        profile_data = display_result.final_output.model_dump()
        profilecard_widget = build_profilecard_widget(profile_data)
        widget_item = WidgetItem(
            thread_id=thread.id,
            id=self._generate_widget_id(thread),
            created_at=datetime.now(),
            widget=profilecard_widget,
            copy_text=f"{profile_data['name']}, {int(profile_data['age'])}, {profile_data['occupation']}",
        )
        yield ThreadItemDoneEvent(item=widget_item)

        # Increment chapter and persist
        await self._set_chapter(thread, context, 2)

    async def _handle_chapter_2(
        self,
        thread: ThreadMetadata,
        input_items: list,
        agent_context: CupidAgentContext,
        context: RequestContext,
    ) -> AsyncIterator[ThreadStreamEvent]:
        """Chapter 2: Match narrative + DisplayContinueCard."""
        logger.info("Chapter 2: Match narrative")

        # Get thread-specific data strings
        mortal_str, match_str, compat_str = self._get_data_strings(thread)

        # Agent Builder pattern: accumulate conversation after each agent
        conversation_history = list(input_items)

        # Show progress indicator
        yield ProgressUpdateEvent(text="Presenting the match...")

        # Run Match agent with context - stream events directly
        match_context = MatchContext(state_match=match_str)
        result = Runner.run_streamed(match_agent, conversation_history, context=match_context)
        async for event in stream_agent_response(agent_context, result):
            yield event
        conversation_history.extend([item.to_input_item() for item in result.new_items])

        # Build Continue Card widget directly (no need for agent - fixed message)
        continue_widget = build_continue_card_widget("Ready to see their compatibility?")
        widget_item = WidgetItem(
            thread_id=thread.id,
            id=self._generate_widget_id(thread),
            created_at=datetime.now(),
            widget=continue_widget,
        )
        yield ThreadItemDoneEvent(item=widget_item)

        # Increment chapter and persist
        await self._set_chapter(thread, context, 3)

    async def _handle_chapter_3(
        self,
        thread: ThreadMetadata,
        input_items: list,
        agent_context: CupidAgentContext,
        context: RequestContext,
    ) -> AsyncIterator[ThreadStreamEvent]:
        """Chapter 3: DisplayCompatibilityCard + CompatibilityAnalysis narrative + DisplayContinueCard."""
        logger.info("Chapter 3: Compatibility analysis")

        # Get thread-specific data strings
        mortal_str, match_str, compat_str = self._get_data_strings(thread)

        # Agent Builder pattern: accumulate conversation after each agent
        conversation_history = list(input_items)

        # Show progress indicator
        yield ProgressUpdateEvent(text="Analyzing compatibility...")

        # Run DisplayCompatibilityCard agent (pass [] - only needs context data)
        compat_context = DisplayCompatibilityCardContext(state_compatibility=compat_str)
        display_result = await Runner.run(
            display_compatibility_card_agent,
            "display",
            context=compat_context,
        )

        # Build and yield CompatibilityAnalysis widget
        compat_data = display_result.final_output.model_dump()
        compat_widget = build_compatibility_analysis_widget(
            title=compat_data["title"],
            subtitle=compat_data["subtitle"],
            overall=int(compat_data["overall"]),
            items=compat_data["items"],
        )
        widget_item = WidgetItem(
            thread_id=thread.id,
            id=self._generate_widget_id(thread),
            created_at=datetime.now(),
            widget=compat_widget,
        )
        yield ThreadItemDoneEvent(item=widget_item)

        # Run CompatibilityAnalysis agent - streams The Big Four narrative
        analysis_result = Runner.run_streamed(compatibility_analysis_agent, conversation_history, context=agent_context)
        async for event in stream_agent_response(agent_context, analysis_result):
            yield event
        conversation_history.extend([item.to_input_item() for item in analysis_result.new_items])

        # Build Continue Card widget directly (no need for agent - fixed message)
        continue_widget = build_continue_card_widget("Ok, we can start the story. Ready for the meet-cute?")
        widget_item = WidgetItem(
            thread_id=thread.id,
            id=self._generate_widget_id(thread),
            created_at=datetime.now(),
            widget=continue_widget,
        )
        yield ThreadItemDoneEvent(item=widget_item)

        # Increment chapter and persist
        await self._set_chapter(thread, context, 4)

    async def _handle_chapter_4(
        self,
        thread: ThreadMetadata,
        input_items: list,
        agent_context: CupidAgentContext,
        context: RequestContext,
    ) -> AsyncIterator[ThreadStreamEvent]:
        """Chapter 4: StartCupidGame narrative + HasEnded check + DisplayChoices or ContinueCard."""
        logger.info("Chapter 4: Start Cupid Game")

        # Agent Builder pattern: accumulate conversation after each agent
        conversation_history = list(input_items)

        # Show progress indicator
        yield ProgressUpdateEvent(text="Starting the date...")

        # Run StartCupidGame agent - stream events directly
        result = Runner.run_streamed(start_cupid_game_agent, conversation_history, context=agent_context)
        async for event in stream_agent_response(agent_context, result):
            yield event
        conversation_history.extend([item.to_input_item() for item in result.new_items])

        # Extract last assistant message content for HasEnded check
        last_narrative_content = ""
        for item in reversed(conversation_history):
            role = item.get("role") if isinstance(item, dict) else getattr(item, "role", None)
            if role == "assistant":
                content = item.get("content") if isinstance(item, dict) else getattr(item, "content", None)
                text_content = ""
                if isinstance(content, list):
                    for block in content:
                        if isinstance(block, dict) and block.get("type") == "output_text":
                            text_content = block.get("text", "")
                            break
                        elif hasattr(block, "text"):
                            text_content = block.text
                            break
                elif isinstance(content, str):
                    text_content = content
                # Use this message if it looks like narrative (not structured output)
                if text_content and not text_content.startswith("{"):
                    last_narrative_content = text_content
                    break

        # Run HasEnded agent to check if story has concluded
        hasended_context = HasEndedContext(narrative_content=last_narrative_content)
        ended_result = await Runner.run(
            has_ended_agent,
            "analyze",
            context=hasended_context,
        )
        ended_data = ended_result.final_output.model_dump()
        logger.info(f"HasEnded result: {ended_data}, narrative length: {len(last_narrative_content)}")

        if ended_data.get("has_ended", False):
            # Story has ended - show Continue Card with evaluation prompt
            continue_widget = build_continue_card_widget(
                "Ok, our story has ended. Would you like to see your evaluation? I have notes."
            )
            widget_item = WidgetItem(
                thread_id=thread.id,
                id=self._generate_widget_id(thread),
                created_at=datetime.now(),
                widget=continue_widget,
            )
            yield ThreadItemDoneEvent(item=widget_item)

            # Move to evaluation chapter
            await self._set_chapter(thread, context, 5)
        else:
            # Story continues - show choices
            choices_context = DisplayChoicesContext(message_content=last_narrative_content)
            choices_result = await Runner.run(
                display_choices_agent,
                "extract",
                context=choices_context,
            )

            # Build and yield Choice list widget
            choices_data = choices_result.final_output.model_dump()
            choices_widget = build_choice_list_widget(choices_data["items"])
            widget_item = WidgetItem(
                thread_id=thread.id,
                id=self._generate_widget_id(thread),
                created_at=datetime.now(),
                widget=choices_widget,
            )
            yield ThreadItemDoneEvent(item=widget_item)

            # Stay in chapter 4 (loop) - don't increment chapter

    async def _handle_chapter_5(
        self,
        thread: ThreadMetadata,
        input_items: list,
        agent_context: CupidAgentContext,
        context: RequestContext,
    ) -> AsyncIterator[ThreadStreamEvent]:
        """Chapter 5: CupidEvaluation - final evaluation of the date."""
        logger.info("Chapter 5: Cupid Evaluation")

        # Show progress indicator
        yield ProgressUpdateEvent(text="Preparing your evaluation...")

        # Run CupidEvaluation agent - stream events directly
        result = Runner.run_streamed(cupid_evaluation_agent, input_items, context=agent_context)
        async for event in stream_agent_response(agent_context, result):
            yield event

        # Move to final chapter (End agent)
        await self._set_chapter(thread, context, 6)

    async def _handle_chapter_final(
        self,
        thread: ThreadMetadata,
        input_items: list,
        agent_context: CupidAgentContext,
        context: RequestContext,
    ) -> AsyncIterator[ThreadStreamEvent]:
        """Chapter 6+: End agent - final thank you and restart prompt."""
        logger.info("Chapter 6+: End")

        # Show progress indicator
        yield ProgressUpdateEvent(text="Wrapping up...")

        # Run End agent - stream events directly
        result = Runner.run_streamed(end_agent, input_items, context=agent_context)
        async for event in stream_agent_response(agent_context, result):
            yield event

    async def to_message_content(self, _input: Attachment) -> ResponseInputContentParam:
        raise RuntimeError("File attachments are not supported.")


def create_chatkit_server() -> CupidServer:
    """Return a configured ChatKit server instance."""
    return CupidServer()
