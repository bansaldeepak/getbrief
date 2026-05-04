# CodeGraph

CodeGraph builds a semantic knowledge graph of codebases for faster code exploration.

## If `.codegraph/` exists in the project

Use codegraph tools for instant lookups instead of scanning files:

| Tool | Use For |
|------|---------|
| `codegraph_search` | Find symbols by name |
| `codegraph_context` | Get relevant code context for a task |
| `codegraph_callers` | Find what calls a function |
| `codegraph_callees` | Find what a function calls |
| `codegraph_impact` | See what's affected by changing a symbol |
| `codegraph_node` | Get details + source code for a symbol |

When spawning Explore agents: tell them to use codegraph tools.

## If `.codegraph/` does NOT exist

Ask user if they'd like to run `codegraph init -i` to build a code knowledge graph.
