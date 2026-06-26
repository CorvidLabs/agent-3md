// A Swift reference loader for the agent3md/1 standard. One 3md file is a whole
// agent: plane 0 is the identity, every other plane is a skill. Uses the
// canonical ThreeMD parser and mirrors the TypeScript loader contract.
@preconcurrency import Foundation
import ThreeMD

// MARK: - Model

struct SkillInput {
    let name: String
    let type: String
    let required: Bool
}

struct Skill {
    let z: Int
    let name: String
    let triggers: [String]
    let inputs: [String]          // names (back-compatible with the bare CSV form)
    let inputSchema: [SkillInput] // typed inputs parsed from `inputs="name:type?"`
    let tool: String?             // the tool / function this skill drives, from `tool=`
    let cost: String?
    let deps: [Int]
    let body: String
}

// MARK: - Helpers

private func csv(_ value: String?) -> [String] {
    guard let value else { return [] }
    return value.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
}

// Parse a typed input list: `inputs="question, limit:number?"`. Each item is
// `name`, `name:type`, or `name:type?` (a trailing `?` marks it optional). A
// bare name is a required string. One grammar, shared with the TS and Rust
// loaders so the typed contract never diverges.
private func parseInputs(_ value: String?) -> [SkillInput] {
    csv(value).compactMap { item -> SkillInput? in
        var s = item
        var required = true
        if s.hasSuffix("?") {
            required = false
            s = String(s.dropLast()).trimmingCharacters(in: .whitespaces)
        }
        let name: String
        let type: String
        if let colon = s.firstIndex(of: ":") {
            name = String(s[..<colon]).trimmingCharacters(in: .whitespaces)
            let t = String(s[s.index(after: colon)...]).trimmingCharacters(in: .whitespaces).lowercased()
            type = t.isEmpty ? "string" : t
        } else {
            name = s.trimmingCharacters(in: .whitespaces)
            type = "string"
        }
        return name.isEmpty ? nil : SkillInput(name: name, type: type, required: required)
    }
}

// Fill a `tool=` command template's `{input}` placeholders from `values`
// (shell-quoted). Unprovided placeholders are left visible. One grammar, shared
// with the TS and Rust loaders.
private func fillCommand(_ template: String, _ values: [String: String]) -> String {
    guard let re = try? NSRegularExpression(pattern: "\\{([a-zA-Z_]\\w*)\\}") else { return template }
    let ns = template as NSString
    var out = ""
    var last = 0
    for m in re.matches(in: template, range: NSRange(location: 0, length: ns.length)) {
        out += ns.substring(with: NSRange(location: last, length: m.range.location - last))
        let name = ns.substring(with: m.range(at: 1))
        if let v = values[name] {
            out += "'" + v.replacingOccurrences(of: "'", with: "'\\''") + "'"
        } else {
            out += ns.substring(with: m.range)
        }
        last = m.range.location + m.range.length
    }
    out += ns.substring(from: last)
    return out
}

// Dependency links: `[[z=N]]` or `[[z=N|label]]`. One grammar, shared with the
// TS runtime, the validator, the spec, and the Rust loader.
private func depLinks(in body: String) -> [Int] {
    guard let re = try? NSRegularExpression(pattern: "\\[\\[z=(\\d+)(?:\\|[^\\]]*)?\\]\\]") else { return [] }
    let range = NSRange(body.startIndex..., in: body)
    return re.matches(in: body, range: range).compactMap { m in
        guard let r = Range(m.range(at: 1), in: body) else { return nil }
        return Int(body[r])
    }
}

// Tokenize for routing: maximal runs of Unicode letters/digits, lowercased.
// Identical to the TS and Rust loaders so routing never diverges.
private func tokenize(_ s: String) -> [String] {
    s.lowercased().split(whereSeparator: { !($0.isLetter || $0.isNumber) }).map(String.init)
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
            let inputSchema = parseInputs(p.attributes["inputs"])
            let tool = p.attributes["tool"]?.trimmingCharacters(in: .whitespaces)
            let skill = Skill(
                z: z,
                name: p.label ?? "skill-\(z)",
                triggers: csv(p.attributes["triggers"]),
                inputs: inputSchema.map(\.name),
                inputSchema: inputSchema,
                tool: (tool?.isEmpty ?? true) ? nil : tool,
                cost: p.attributes["cost"],
                deps: depLinks(in: p.body),
                body: p.body
            )
            if p.attributes["kind"] == "identity" { identity = skill } else { skills.append(skill) }
        }
        // Fallback: if no plane is marked kind=identity, the first plane is it.
        if identity == nil, let first = doc.planes.first {
            let fz = Int(first.z)
            identity = skills.first { $0.z == fz }
            skills.removeAll { $0.z == fz }
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

    // Route by trigger-phrase coverage: a trigger phrase matches only when ALL
    // of its words appear in the request. Score = matched phrases; ties by z.
    func route(_ text: String) -> [(skill: Skill, score: Int, hits: [String])] {
        let req = Set(tokenize(text))
        return skills.compactMap { skill -> (Skill, Int, [String])? in
            let hits = skill.triggers.filter { t in
                let tw = tokenize(t)
                return !tw.isEmpty && tw.allSatisfy { req.contains($0) }
            }
            return hits.isEmpty ? nil : (skill, hits.count, hits)
        }
        .sorted { $0.2.count != $1.2.count ? $0.2.count > $1.2.count : $0.0.z < $1.0.z }
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

// Optional CLI for parity checks: `swift run Agent3MD route <file> <text...>`.
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
