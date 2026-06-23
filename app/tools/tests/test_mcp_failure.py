from app.mcp_server import call_mcp_tool


if __name__ == "__main__":
    result = call_mcp_tool(
        tool_name="predict_failure_reporting",
        arguments={
            "text": "Pompe faible pression avec tuyau bouché"
        },
    )

    print(result)