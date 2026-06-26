// A Swift reference loader for the agent3md/1 standard. One 3md file is a whole
// agent: plane 0 is the identity, every other plane is a skill. Uses the
// canonical ThreeMD parser and mirrors the TypeScript loader contract.
@preconcurrency import Foundation
import ThreeMD

// MARK: - Model

struct Skill {
    let z: Int
    let name: String
    let triggers: [String]
    let inputs: [String]
    let cost: String?
    let deps: [Int]
    let body: String
}

// MARK: - Helpers

private func csv(_ value: String?) -> [String] {
    guard let value else { return [] }
    return value.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
}

private func depLinks(in body: String) -> [Int] {
    guard let re = try? NSRegularExpression(pattern: "\\[\\[z=(\\d+)\\|") else { return [] }
    let range = NSRange(body.startIndex..., in: body)
    return re.matches(in: body, range: range).compactMap { m in
        guard let r = Range(m.range(at: 1), in: body) else { return nil }
        return Int(body[r])
    }
}

private func triggerWords(_ triggers: [String]) -> Set<String> {
    Set(triggers.flatMap { $0.lowercased().split(whereSeparator: { !$0.isLetter }).map(String.init) })
}

// MARK: - Agent

struct Agent {
    let name: String
    let model: String
    let tools: [String]
    let identity: Skill?
    let skills: [Skill]
    private let byName: [String: Skill]
    private let byZ: [Int: Skill]

    init(source: String) throws {
        let doc = try Parser().parse(source)
        var skills: [Skill] = []
        var identity: Skill?
        for p in doc.planes {
            let z = Int(p.z)
            let skill = Skill(
                z: z,
                name: p.label ?? "skill-\(z)",
                triggers: csv(p.attributes["triggers"]),
                inputs: csv(p.attributes["inputs"]),
                cost: p.attributes["cost"],
                deps: depLinks(in: p.body),
                body: p.body
            )
            if p.attributes["kind"] == "identity" { identity = skill } else { skills.append(skill) }
        }
        self.name = doc.title ?? doc.metadata["agent"] ?? "agent"
        self.model = doc.metadata["model"] ?? "unknown"
        self.tools = csv(doc.metadata["tools"])
        self.identity = identity
        self.skills = skills
        self.byName = Dictionary(skills.map { ($0.name, $0) }, uniquingKeysWith: { a, _ in a })
        self.byZ = Dictionary(skills.map { ($0.z, $0) }, uniquingKeysWith: { a, _ in a })
    }

    func get(_ name: String) -> Skill? { byName[name] }

    func route(_ text: String) -> [(skill: Skill, score: Int, hits: [String])] {
        let words = text.lowercased().split(whereSeparator: { !$0.isLetter }).map(String.init)
        return skills.compactMap { skill -> (Skill, Int, [String])? in
            let tw = triggerWords(skill.triggers)
            let hits = Array(Set(words.filter { tw.contains($0) }))
            return hits.isEmpty ? nil : (skill, hits.count, hits)
        }
        .sorted { $0.1 > $1.1 }
        .map { ($0.0, $0.1, $0.2) }
    }

    func resolve(_ name: String) -> [Skill] {
        guard let start = byName[name] else { return [] }
        var out: [Skill] = []
        var seen = Set<Int>()
        func visit(_ s: Skill) {
            if seen.contains(s.z) { return }
            seen.insert(s.z); out.append(s)
            for z in s.deps { if let d = byZ[z] { visit(d) } }
        }
        visit(start)
        return out
    }
}

// MARK: - Run

// Resolve agent.3md relative to this source file (../../../../agent.3md), so it
// works regardless of the current working directory.
let here = URL(fileURLWithPath: #filePath)
let agentURL = here
    .deletingLastPathComponent()  // Agent3MD
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
print("  model:  \(agent.model)")
print("  tools:  \(agent.tools.joined(separator: ", "))")
print("  skills: \(agent.skills.count) -> \(agent.skills.map(\.name).joined(separator: ", "))")
print(String(repeating: "=", count: 60))

let request = "review my diff before the PR"
print("\nroute(\"\(request)\"):")
if let top = agent.route(request).first {
    print("  -> \(top.skill.name)  (matched: \(top.hits.sorted().joined(separator: ", ")))")
    let chain = agent.resolve(top.skill.name).map(\.name).joined(separator: " + ")
    print("  loads: \(chain)")
}

print("\nget(\"sql-query\") (progressive disclosure, first 4 lines):")
if let sql = agent.get("sql-query") {
    for line in sql.body.split(separator: "\n", omittingEmptySubsequences: false).prefix(4) {
        print("    \(line)")
    }
}
