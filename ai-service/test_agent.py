import asyncio
from agent import create_agent_executor
from langchain_core.messages import HumanMessage

async def main():
    executor = create_agent_executor("fake_token")
    messages = [HumanMessage(content="What is my portfolio summary?")]
    
    async for event in executor.astream_events({"messages": messages}, version="v2"):
        if event["event"] == "on_chat_model_stream":
            chunk = event["data"]["chunk"]
            if chunk.content:
                print(chunk.content, end="", flush=True)
            if chunk.tool_calls:
                print(f"\n[TOOL CALL] {chunk.tool_calls}")

if __name__ == "__main__":
    asyncio.run(main())
