import Foundation
import Agent3MD

// MARK: - Run

let cliArgs = Array(CommandLine.arguments.dropFirst())
if cliArgs.first == "route", cliArgs.count >= 3 {
    let src = try String(contentsOfFile: cliArgs[1], encoding: .utf8)
    let probe = try Agent(source: src)
    if let top = probe.route(cliArgs[2...].joined(separator: " ")).first {
        print("\(top.skill.name) score=\(top.score) hits=[\(top.hits.joined(separator: ","))]")
    } else {
        print("(none)")
    }
    exit(0)
}

// Resolve agent.3md relative to this source file, so it works regardless of cwd.
let here = URL(fileURLWithPath: #filePath)
let agentURL = here
    .deletingLastPathComponent()  // Agent3MDCLI
    .deletingLastPathComponent()  // Sources
    .deletingLastPathComponent()  // swift
    .deletingLastPathComponent()  // loaders
    .deletingLastPathComponent()  // agent-3md
    .appendingPathComponent("agent.3md")

let source = try String(contentsOf: agentURL, encoding: .utf8)
let agent = try Agent(source: source)

print(String(repeating: "=", count: 60))
print("MANIFEST (Swift loader)")
print("  name:   \(agent.name)")
if agent.model != "unknown" { print("  model:  \(agent.model)") }
print("  tools:  \(agent.tools.joined(separator: ", "))")
print("  skills: \(agent.skills.count) -> \(agent.skills.map(\.name).joined(separator: ", "))")
print(String(repeating: "=", count: 60))

let request = "find every TODO in the source"
print("\nroute(\"\(request)\"):")
if let top = agent.route(request).first {
    print("  -> \(top.skill.name)  (matched: \(top.hits.joined(separator: ", ")))")
    if let tool = top.skill.tool {
        let cmd = fillCommand(tool, ["pattern": "TODO", "path": "src"])
        print("  command: \(cmd)")
    }
}

print("\nget(\"search\") (progressive disclosure, first 4 lines):")
if let search = agent.get("search") {
    let typed = search.inputSchema.map { "\($0.name):\($0.type)\($0.required ? "" : "?")" }.joined(separator: ", ")
    print("    tool=\(search.tool ?? "(none)"), inputs=\(typed)")
    for line in search.body.split(separator: "\n", omittingEmptySubsequences: false).prefix(4) {
        print("    \(line)")
    }
}
