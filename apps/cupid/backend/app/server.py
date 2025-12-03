"""CupidServer implements the ChatKitServer interface for the Cupid Deluxe matchmaking game."""

from __future__ import annotations

import logging
import yaml
from datetime import datetime
from pathlib import Path
from typing import Annotated, Any, AsyncIterator

from agents import Runner
from chatkit.agents import AgentContext, stream_agent_response
from chatkit.server import ChatKitServer
from chatkit.types import (
    Action,
    Attachment,
    InferenceOptions,
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
from .agents.cupid_game_agent import cupid_game_agent
from .agents.cupid_evaluation_agent import cupid_evaluation_agent
from .agents.display_mortal_agent import display_mortal_agent, DisplayMortalContext
from .agents.display_match_agent import display_match_agent, DisplayMatchContext
from .agents.display_continue_card_agent import display_continue_card_agent, display_continue_card_agent_game
from .agents.display_compatibility_card_agent import display_compatibility_card_agent, DisplayCompatibilityCardContext
from .agents.display_choices_agent import display_choices_agent
from .agents.game_dashboard_agent import game_dashboard_agent, GameDashboardContext
from .agents.evaluate_scene_score_agent import evaluate_scene_score_agent
from .agents.has_ended_agent import has_ended_agent

from .memory_store import MemoryStore
from .request_context import RequestContext
from .thread_item_converter import BasicThreadItemConverter

# Import widget builders
from .widgets.profilecard_widget import build_profilecard_widget
from .widgets.continue_card_widget import build_continue_card_widget
from .widgets.choice_list_widget import build_choice_list_widget
from .widgets.compatibility_analysis_widget import build_compatibility_analysis_widget
from .widgets.compatibility_snapshot_widget import build_compatibility_snapshot_widget

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

        # Convert data to string format for agent instructions
        self.mortal_data_str = yaml.dump(self.mortal_data, default_flow_style=False)
        self.match_data_str = yaml.dump(self.match_data, default_flow_style=False)
        self.compatibility_data_str = yaml.dump(self.compatibility_data, default_flow_style=False)

    def _generate_widget_id(self, thread: ThreadMetadata) -> str:
        """Generate a unique widget ID."""
        return f"widget_{thread.id}_{datetime.now().timestamp()}"

    async def _set_chapter(
        self,
        thread: ThreadMetadata,
        context: RequestContext,
        chapter: int,
    ) -> None:
        """Update chapter in both context and thread.metadata, then persist."""
        context["chapter"] = chapter
        if thread.metadata is None:
            thread.metadata = {}
        thread.metadata["chapter"] = chapter
        await self.store.save_thread(thread, context)

    async def action(
        self,
        thread: ThreadMetadata,
        action: Action[str, Any],
        sender: WidgetItem | None,
        context: RequestContext,
    ) -> AsyncIterator[ThreadStreamEvent]:
        """Handle widget actions (Continue button, Choice selection)."""

        message_text = "Continue"  # Default

        if action.type == "continue":
            # Continue button clicked
            message_text = "Continue"
        elif action.type == "choice.select":
            # Choice item selected - format as "A - Title"
            key = action.payload.get("key", "")
            title = action.payload.get("title", "")
            message_text = f"{key} - {title}"
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

        # Initialize or load state from thread.metadata (persisted across requests)
        if thread.metadata is None:
            thread.metadata = {}

        if "chapter" not in thread.metadata:
            thread.metadata["chapter"] = 0
            thread.metadata["mortal_data"] = self.mortal_data
            thread.metadata["match_data"] = self.match_data
            thread.metadata["compatibility_data"] = self.compatibility_data
            thread.metadata["current_compatibility"] = self.compatibility_data.get("overall_compatibility", 69)
            thread.metadata["scene_number"] = 1
            # Save the initial state
            await self.store.save_thread(thread, context)

        # Copy metadata to context for compatibility with existing code
        context["chapter"] = thread.metadata.get("chapter", 0)
        context["mortal_data"] = thread.metadata.get("mortal_data", self.mortal_data)
        context["match_data"] = thread.metadata.get("match_data", self.match_data)
        context["compatibility_data"] = thread.metadata.get("compatibility_data", self.compatibility_data)
        context["current_compatibility"] = thread.metadata.get("current_compatibility", 69)
        context["scene_number"] = thread.metadata.get("scene_number", 1)

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

        # Get current chapter
        chapter = context.get("chapter", 0)
        logger.info(f"Processing chapter {chapter}")

        if chapter == 0:
            # Chapter 0: Introduction + DisplayMortal + ProfileCard widget
            await self._handle_chapter_0(thread, input_items, agent_context, context)

        elif chapter == 1:
            # Chapter 1: Mortal narrative + DisplayMatch + ProfileCard widget
            await self._handle_chapter_1(thread, input_items, agent_context, context)

        elif chapter == 2:
            # Chapter 2: Match narrative + DisplayContinueCard
            await self._handle_chapter_2(thread, input_items, agent_context, context)

        elif chapter == 3:
            # Chapter 3: DisplayCompatibilityCard + CompatibilityAnalysis + DisplayContinueCard
            await self._handle_chapter_3(thread, input_items, agent_context, context)

        elif chapter == 4:
            # Chapter 4: StartCupidGame + DisplayChoices
            await self._handle_chapter_4(thread, input_items, agent_context, context)

        elif chapter == 5:
            # Chapter 5: Game loop - EvaluateSceneScore -> GameDashboard -> CupidGame -> HasEnded
            await self._handle_chapter_5(thread, input_items, agent_context, context)

        else:
            # Chapter 6+: CupidEvaluation (final)
            await self._handle_chapter_final(thread, input_items, agent_context, context)

        # Yield all queued events
        for event in self._pending_events:
            yield event
        self._pending_events = []

    # Event queue for yielding
    _pending_events: list[ThreadStreamEvent] = []

    def _queue_event(self, event: ThreadStreamEvent) -> None:
        """Queue an event to be yielded."""
        self._pending_events.append(event)

    async def _handle_chapter_0(
        self,
        thread: ThreadMetadata,
        input_items: list,
        agent_context: CupidAgentContext,
        context: RequestContext,
    ) -> None:
        """Chapter 0: Introduction + DisplayMortal + ProfileCard widget."""
        logger.info("Chapter 0: Introduction")

        # Run Introduction agent
        result = Runner.run_streamed(introduction_agent, input_items, context=agent_context)
        async for event in stream_agent_response(agent_context, result):
            self._queue_event(event)

        # Run DisplayMortal agent (pass minimal input - only needs context data, not conversation history)
        display_context = DisplayMortalContext(state_mortal=self.mortal_data_str)
        display_result = await Runner.run(
            display_mortal_agent,
            "display",
            context=display_context,
        )

        # Build and stream ProfileCard widget
        profile_data = display_result.final_output.model_dump()
        profilecard_widget = build_profilecard_widget(profile_data)
        widget_item = WidgetItem(
            thread_id=thread.id,
            id=self._generate_widget_id(thread),
            created_at=datetime.now(),
            widget=profilecard_widget,
            copy_text=f"{profile_data['name']}, {int(profile_data['age'])}, {profile_data['occupation']}",
        )
        self._queue_event(ThreadItemDoneEvent(item=widget_item))

        # Increment chapter and persist
        await self._set_chapter(thread, context, 1)

    async def _handle_chapter_1(
        self,
        thread: ThreadMetadata,
        input_items: list,
        agent_context: CupidAgentContext,
        context: RequestContext,
    ) -> None:
        """Chapter 1: Mortal narrative + DisplayMatch + ProfileCard widget."""
        logger.info("Chapter 1: Mortal narrative")

        # Run Mortal agent with context
        mortal_context = MortalContext(state_mortal=self.mortal_data_str)
        result = Runner.run_streamed(mortal_agent, input_items, context=mortal_context)
        async for event in stream_agent_response(agent_context, result):
            self._queue_event(event)

        # Run DisplayMatch agent (pass [] - only needs context data, not conversation history)
        display_context = DisplayMatchContext(state_match=self.match_data_str)
        display_result = await Runner.run(
            display_match_agent,
            "display",
            context=display_context,
        )

        # Build and stream ProfileCard widget for match
        profile_data = display_result.final_output.model_dump()
        profilecard_widget = build_profilecard_widget(profile_data)
        widget_item = WidgetItem(
            thread_id=thread.id,
            id=self._generate_widget_id(thread),
            created_at=datetime.now(),
            widget=profilecard_widget,
            copy_text=f"{profile_data['name']}, {int(profile_data['age'])}, {profile_data['occupation']}",
        )
        self._queue_event(ThreadItemDoneEvent(item=widget_item))

        # Increment chapter and persist
        await self._set_chapter(thread, context, 2)

    async def _handle_chapter_2(
        self,
        thread: ThreadMetadata,
        input_items: list,
        agent_context: CupidAgentContext,
        context: RequestContext,
    ) -> None:
        """Chapter 2: Match narrative + DisplayContinueCard."""
        logger.info("Chapter 2: Match narrative")

        # Run Match agent with context
        match_context = MatchContext(state_match=self.match_data_str)
        result = Runner.run_streamed(match_agent, input_items, context=match_context)
        async for event in stream_agent_response(agent_context, result):
            self._queue_event(event)

        # Run DisplayContinueCard agent (pass [] - just outputs fixed message)
        display_result = await Runner.run(
            display_continue_card_agent,
            "display",
        )

        # Build and stream Continue Card widget
        card_data = display_result.final_output.model_dump()
        continue_widget = build_continue_card_widget(card_data["confirmation_message"])
        widget_item = WidgetItem(
            thread_id=thread.id,
            id=self._generate_widget_id(thread),
            created_at=datetime.now(),
            widget=continue_widget,
        )
        self._queue_event(ThreadItemDoneEvent(item=widget_item))

        # Increment chapter and persist
        await self._set_chapter(thread, context, 3)

    async def _handle_chapter_3(
        self,
        thread: ThreadMetadata,
        input_items: list,
        agent_context: CupidAgentContext,
        context: RequestContext,
    ) -> None:
        """Chapter 3: DisplayCompatibilityCard + CompatibilityAnalysis widget + DisplayContinueCard."""
        logger.info("Chapter 3: Compatibility analysis")

        # Run DisplayCompatibilityCard agent (pass [] - only needs context data)
        compat_context = DisplayCompatibilityCardContext(state_compatibility=self.compatibility_data_str)
        display_result = await Runner.run(
            display_compatibility_card_agent,
            "display",
            context=compat_context,
        )

        # Build and stream CompatibilityAnalysis widget
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
        self._queue_event(ThreadItemDoneEvent(item=widget_item))

        # Run DisplayContinueCard (game start version - pass [] - just outputs fixed message)
        continue_result = await Runner.run(
            display_continue_card_agent_game,
            "display",
        )

        # Build and stream Continue Card widget
        card_data = continue_result.final_output.model_dump()
        continue_widget = build_continue_card_widget(card_data["confirmation_message"])
        widget_item = WidgetItem(
            thread_id=thread.id,
            id=self._generate_widget_id(thread),
            created_at=datetime.now(),
            widget=continue_widget,
        )
        self._queue_event(ThreadItemDoneEvent(item=widget_item))

        # Increment chapter and persist
        await self._set_chapter(thread, context, 4)

    async def _handle_chapter_4(
        self,
        thread: ThreadMetadata,
        input_items: list,
        agent_context: CupidAgentContext,
        context: RequestContext,
    ) -> None:
        """Chapter 4: StartCupidGame narrative + DisplayChoices widget."""
        logger.info("Chapter 4: Start Cupid Game")

        # Run StartCupidGame agent
        result = Runner.run_streamed(start_cupid_game_agent, input_items, context=agent_context)
        async for event in stream_agent_response(agent_context, result):
            self._queue_event(event)

        # Run DisplayChoices agent
        choices_result = await Runner.run(
            display_choices_agent,
            input_items,
        )

        # Build and stream Choice list widget
        choices_data = choices_result.final_output.model_dump()
        choices_widget = build_choice_list_widget(choices_data["items"])
        widget_item = WidgetItem(
            thread_id=thread.id,
            id=self._generate_widget_id(thread),
            created_at=datetime.now(),
            widget=choices_widget,
        )
        self._queue_event(ThreadItemDoneEvent(item=widget_item))

        # Increment chapter and persist
        await self._set_chapter(thread, context, 5)

    async def _handle_chapter_5(
        self,
        thread: ThreadMetadata,
        input_items: list,
        agent_context: CupidAgentContext,
        context: RequestContext,
    ) -> None:
        """Chapter 5: Game loop - EvaluateSceneScore -> GameDashboard -> CupidGame -> HasEnded."""
        logger.info(f"Chapter 5: Game loop - Scene {context.get('scene_number', 1)}")

        # Run EvaluateSceneScore agent
        score_result = await Runner.run(
            evaluate_scene_score_agent,
            input_items,
        )
        score_data = score_result.final_output.model_dump()
        score = score_data.get("score", "0")

        # Update current compatibility
        try:
            score_delta = int(score)
            context["current_compatibility"] = max(0, min(100, context["current_compatibility"] + score_delta))
        except (ValueError, TypeError):
            pass

        # Run GameDashboard agent (pass [] - only needs context data)
        dashboard_context = GameDashboardContext(
            state_compatibility=self.compatibility_data_str,
            input_output_parsed_score=score,
        )
        dashboard_result = await Runner.run(
            game_dashboard_agent,
            "display",
            context=dashboard_context,
        )

        # Build and stream Compatibility Snapshot widget
        dashboard_data = dashboard_result.final_output.model_dump()
        snapshot_widget = build_compatibility_snapshot_widget(
            scene=dashboard_data["scene"],
            compatibility=int(dashboard_data["compatibility"]),
            delta=dashboard_data["delta"],
            bars=dashboard_data["bars"],
            pills=dashboard_data["pills"],
        )
        widget_item = WidgetItem(
            thread_id=thread.id,
            id=self._generate_widget_id(thread),
            created_at=datetime.now(),
            widget=snapshot_widget,
        )
        self._queue_event(ThreadItemDoneEvent(item=widget_item))

        # Run CupidGame agent for narrative
        game_result = Runner.run_streamed(cupid_game_agent, input_items, context=agent_context)
        async for event in stream_agent_response(agent_context, game_result):
            self._queue_event(event)

        # Run HasEnded agent to check if game is over
        ended_result = await Runner.run(
            has_ended_agent,
            input_items,
        )
        ended_data = ended_result.final_output.model_dump()

        if ended_data.get("has_ended", False):
            # Game is over - move to evaluation and persist
            await self._set_chapter(thread, context, 6)
        else:
            # Continue game loop - show choices
            choices_result = await Runner.run(
                display_choices_agent,
                input_items,
            )

            # Build and stream Choice list widget
            choices_data = choices_result.final_output.model_dump()
            choices_widget = build_choice_list_widget(choices_data["items"])
            widget_item = WidgetItem(
                thread_id=thread.id,
                id=self._generate_widget_id(thread),
                created_at=datetime.now(),
                widget=choices_widget,
            )
            self._queue_event(ThreadItemDoneEvent(item=widget_item))

            # Increment scene number
            context["scene_number"] = context.get("scene_number", 1) + 1

    async def _handle_chapter_final(
        self,
        thread: ThreadMetadata,
        input_items: list,
        agent_context: CupidAgentContext,
        context: RequestContext,
    ) -> None:
        """Chapter 6+: CupidEvaluation (final)."""
        logger.info("Chapter 6+: Final Evaluation")

        # Run CupidEvaluation agent
        result = Runner.run_streamed(cupid_evaluation_agent, input_items, context=agent_context)
        async for event in stream_agent_response(agent_context, result):
            self._queue_event(event)

    async def to_message_content(self, _input: Attachment) -> ResponseInputContentParam:
        raise RuntimeError("File attachments are not supported.")


def create_chatkit_server() -> CupidServer:
    """Return a configured ChatKit server instance."""
    return CupidServer()
