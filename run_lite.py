from litellm import completion

# Replace with a hosted model you have access to
resp = completion(
    model="ollama:qwen3-30b",
    messages=[{"role":"user","content":"Hello, explain reinforcement learning simply."}]
)

print(resp)
