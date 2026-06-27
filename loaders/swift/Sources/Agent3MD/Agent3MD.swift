@preconcurrency import Foundation
import ThreeMD

// MARK: - Model

public struct SkillInput: Sendable {
    public let name: String
    public let type: String
    public let required: Bool

    public init(name: String, type: String, required: Bool) {
        self.name = name
        self.type = type
        self.required = required
    }
}

public struct Skill: Sendable {
    public let z: Int
    public let name: String
    public let triggers: [String]
    public let inputs: [String]
    public let inputSchema: [SkillInput]
    public let tool: String?
    public let cost: String?
    public let deps: [Int]
    public let body: String

    public init(z: Int, name: String, triggers: [String], inputs: [String], inputSchema: [SkillInput], tool: String?, cost: String?, deps: [Int], body: String) {
        self.z = z
        self.name = name
        self.triggers = triggers
        self.inputs = inputs
        self.inputSchema = inputSchema
        self.tool = tool
        self.cost = cost
        self.deps = deps
        self.body = body
    }
}

// MARK: - Helpers

public func csv(_ value: String?) -> [String] {
    guard let value else { return [] }
    return value.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
}

public func parseInputs(_ value: String?) -> [SkillInput] {
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

public func fillCommand(_ template: String, _ values: [String: String]) -> String {
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

public func depLinks(in body: String) -> [Int] {
    guard let re = try? NSRegularExpression(pattern: "\\[\\[z=(\\d+)(?:\\|[^\\]]*)?\\]\\]") else { return [] }
    let range = NSRange(body.startIndex..., in: body)
    return re.matches(in: body, range: range).compactMap { m in
        guard let r = Range(m.range(at: 1), in: body) else { return nil }
        return Int(body[r])
    }
}

public func tokenize(_ s: String) -> [String] {
    s.lowercased().split(whereSeparator: { !($0.isLetter || $0.isNumber) }).map(String.init)
}

// MARK: - Agent

public struct Agent: Sendable {
    public let name: String
    public let model: String
    public let tools: [String]
    public let identity: Skill?
    public let skills: [Skill]
    private let byName: [String: Skill]
    private let byZ: [Int: Skill]

    public init(source: String) throws {
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

    public func get(_ name: String) -> Skill? { byName[name] }
    public func get(z: Int) -> Skill? { byZ[z] }

    public func route(_ text: String) -> [(skill: Skill, score: Int, hits: [String])] {
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

    public func resolve(_ name: String) -> [Skill] {
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

    public func command(_ name: String, _ values: [String: String]) -> String? {
        guard let s = get(name), let tool = s.tool else { return nil }
        return fillCommand(tool, values)
    }

    public func command(z: Int, _ values: [String: String]) -> String? {
        guard let s = get(z: z), let tool = s.tool else { return nil }
        return fillCommand(tool, values)
    }
}
